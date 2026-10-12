package app.unscroll.nativebridge

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.graphics.Bitmap
import android.graphics.Canvas
import android.util.Base64
import android.os.Build
import expo.modules.kotlin.Promise
import expo.modules.interfaces.permissions.Permissions
import java.io.ByteArrayOutputStream
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues

class UnscrollModule : Module() {
  private val context get() = requireNotNull(appContext.reactContext)
  private val store get() = ProtectionStore(context)
  override fun definition() = ModuleDefinition {
    Name("Unscroll")
    AsyncFunction("getConfig") { store.configString() }
    AsyncFunction("saveConfig") { json: String ->
      val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).resolveActivity(context.packageManager)?.packageName
      ConfigValidator.parse(json, setOfNotNull(context.packageName, "com.android.settings", launcher))
      store.save(json)
      if (!store.config().optBoolean("notifications")) InterruptionNotifications.clear(context)
    }
    AsyncFunction("getStatus") {
      val expected = ComponentName(context, ProtectionService::class.java)
      val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES).orEmpty()
      val authorized = enabled.split(':').any { ComponentName.unflattenFromString(it) == expected }
      val usage = store.usage(); val apps = usage.optJSONObject("apps")
      val totals = mutableMapOf<String, Long>()
      apps?.keys()?.forEach { totals[it] = apps.optLong(it) / 1000 }
      mapOf("authorized" to authorized, "serviceRunning" to ProtectionService.running,
        "selectedApps" to 0, "usedSeconds" to usage.optLong("milliseconds") / 1000,
        "interruptions" to usage.optInt("interruptions"), "usageByApp" to totals,
        "featuresVersion" to 2, "notificationsAuthorized" to InterruptionNotifications.allowed(context))
    }
    AsyncFunction("requestNotificationPermission") { promise: Promise ->
      InterruptionNotifications.createChannel(context)
      if (Build.VERSION.SDK_INT >= 33) Permissions.askForPermissionsWithPermissionsManager(appContext.permissions, promise, android.Manifest.permission.POST_NOTIFICATIONS)
      else promise.resolve(null)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("getAppIcon") { pkg: String ->
      // Only resolve launchable apps, and return a bounded thumbnail rather than a file URI.
      val pm = context.packageManager
      if (pkg.length > 255 || pm.getLaunchIntentForPackage(pkg) == null) null else {
        try {
          val drawable = pm.getApplicationIcon(pkg)
          val bitmap = Bitmap.createBitmap(64, 64, Bitmap.Config.ARGB_8888)
          try {
            drawable.setBounds(0, 0, 64, 64); drawable.draw(Canvas(bitmap))
            val bytes = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, bytes)
            "data:image/png;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP)
          } finally { bitmap.recycle() }
        } catch (_: android.content.pm.PackageManager.NameNotFoundException) { null }
      }
    }
    AsyncFunction("requestAuthorization") {
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
    AsyncFunction("revokeAuthorization") {
      ProtectionService.disconnect()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("getInstalledApps") {
      val pm = context.packageManager
      val launcher = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).resolveActivity(pm)?.packageName
      pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
        .map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
        .filter { (pkg, _) -> pkg != context.packageName && pkg != "com.android.settings" && pkg != launcher }
        .distinctBy { it.first }.sortedBy { it.second.lowercase() }
        .map { (pkg, name) -> mapOf("packageName" to pkg, "name" to name) }
    }
    AsyncFunction("selectApps") { 0 }
    AsyncFunction("reset") { store.clear(); InterruptionNotifications.clear(context) }
  }
}
