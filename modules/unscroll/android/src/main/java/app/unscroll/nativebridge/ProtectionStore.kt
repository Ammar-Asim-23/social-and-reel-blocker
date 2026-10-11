package app.unscroll.nativebridge

import android.content.Context
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

internal class ProtectionStore(context: Context) {
  private val prefs = context.getSharedPreferences("unscroll", Context.MODE_PRIVATE)
  private var cachedRaw: String? = null
  private var cachedConfig: JSONObject? = null
  fun configString(): String? = prefs.getString("config", null)
  fun config(): JSONObject {
    val raw = configString()
    if (raw == cachedRaw && cachedConfig != null) return cachedConfig!!
    val config = runCatching { ConfigValidator.parse(raw ?: "{}") }.getOrElse { JSONObject() }
    cachedRaw = raw; cachedConfig = config
    return config
  }
  fun save(json: String) { ConfigValidator.parse(json); check(prefs.edit().putString("config", json).commit()) { "Could not save rules" } }
  private fun today() = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
  @Synchronized fun usage(): JSONObject {
    val saved = runCatching { JSONObject(prefs.getString("usage", "{}") ?: "{}") }.getOrElse { JSONObject() }
    return if (saved.optString("date") == today()) saved else JSONObject().put("date", today()).put("milliseconds", 0L).put("interruptions", 0).put("apps", JSONObject())
  }
  @Synchronized fun addUsage(packageName: String, milliseconds: Long) {
    if (milliseconds <= 0) return
    val u = usage(); val apps = u.optJSONObject("apps") ?: JSONObject()
    apps.put(packageName, apps.optLong(packageName) + milliseconds)
    u.put("apps", apps).put("milliseconds", u.optLong("milliseconds") + milliseconds)
    prefs.edit().putString("usage", u.toString()).apply()
  }
  @Synchronized fun interrupted() {
    val u = usage(); u.put("interruptions", u.optInt("interruptions") + 1)
    prefs.edit().putString("usage", u.toString()).apply()
  }
  fun clear() { prefs.edit().clear().commit() }
}
