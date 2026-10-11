package app.unscroll.nativebridge

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

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
        "interruptions" to usage.optInt("interruptions"), "usageByApp" to totals)
    }
    AsyncFunction("requestAuthorization") {
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
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
    AsyncFunction("reset") { store.clear() }
  }
}
