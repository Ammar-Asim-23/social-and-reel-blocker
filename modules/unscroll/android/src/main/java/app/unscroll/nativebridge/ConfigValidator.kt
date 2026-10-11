package app.unscroll.nativebridge

import org.json.JSONObject

/** Validate at the native trust boundary, even when the JS caller validates too. */
internal object ConfigValidator {
  private val packagePattern = Regex("[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z][a-zA-Z0-9_]*)+")
  private fun integer(value: Any?, minimum: Long, maximum: Long): Boolean =
    value is Number && value.toDouble().isFinite() && value.toDouble() == value.toLong().toDouble() && value.toLong() in minimum..maximum
  private fun label(value: Any?, max: Int = 80): Boolean = value is String && value.isNotBlank() && value.length <= max

  fun parse(raw: String, protectedPackages: Set<String> = emptySet()): JSONObject {
    require(raw.toByteArray(Charsets.UTF_8).size <= 65536) { "Settings exceed the size limit" }
    val c = JSONObject(raw)
    require(integer(c.opt("version"), 1, 1) && c.opt("enabled") is Boolean && c.opt("onboarded") is Boolean) { "Invalid settings version" }
    require(c.optString("policy") in setOf("always", "budget", "scheduled")) { "Invalid policy" }
    require(integer(c.opt("dailyMinutes"), 1, 180) && integer(c.opt("focusUntil"), 0, 9007199254740991L)) { "Invalid time limit" }
    val apps = c.getJSONArray("apps")
    require(apps.length() <= 100) { "Too many apps" }
    val ids = mutableSetOf<String>(); val packages = mutableSetOf<String>()
    for (i in 0 until apps.length()) {
      val a = apps.getJSONObject(i)
      val pkg = a.optString("packageName")
      require(label(a.opt("id"), 255) && label(a.opt("name")) && pkg.length <= 255 && packagePattern.matches(pkg)) { "Invalid app rule" }
      require(ids.add(a.getString("id")) && packages.add(pkg)) { "Duplicate app rule" }
      require(a.optString("mode") in setOf("off", "selective", "full")) { "Invalid app mode" }
      require(pkg !in protectedPackages || a.optString("mode") == "off") { "This system app cannot be blocked" }
    }
    val routines = c.getJSONArray("schedules")
    require(routines.length() <= 5) { "Too many routines" }
    val routineIds = mutableSetOf<String>()
    for (i in 0 until routines.length()) {
      val r = routines.getJSONObject(i)
      require(label(r.opt("id")) && Regex("[a-zA-Z0-9_-]+").matches(r.getString("id")) && routineIds.add(r.getString("id"))) { "Invalid routine identifier" }
      require(label(r.opt("name")) && r.opt("enabled") is Boolean) { "Invalid routine" }
      require(integer(r.opt("start"), 0, 1439) && integer(r.opt("end"), 0, 1439)) { "Invalid routine time" }
      require((r.getInt("end") - r.getInt("start") + 1440) % 1440 >= 15) { "Routines must last at least 15 minutes" }
      val days = r.getJSONArray("days"); val uniqueDays = mutableSetOf<Int>()
      require(days.length() in 1..7) { "Select at least one weekday" }
      for (j in 0 until days.length()) require(integer(days.opt(j), 0, 6) && uniqueDays.add(days.getInt(j))) { "Invalid weekday" }
    }
    return c
  }
}
