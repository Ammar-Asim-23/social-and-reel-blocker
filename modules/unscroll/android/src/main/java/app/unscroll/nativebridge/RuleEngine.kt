package app.unscroll.nativebridge

import org.json.JSONObject
import java.util.Calendar

internal object RuleEngine {
  private fun canonical(pkg: String) = if (pkg == "com.ss.android.ugc.trill") "com.zhiliaoapp.musically" else pkg
  fun shouldBlockApp(c: JSONObject, packageName: String, usage: JSONObject, now: Calendar = Calendar.getInstance()): Boolean {
    val apps = c.optJSONArray("apps") ?: return false
    val rules = (0 until apps.length()).map { apps.getJSONObject(it) }
    val app = rules.find { it.optString("packageName") == canonical(packageName) } ?: return false
    if (app.optString("mode") == "off") return false
    val groupId = app.optString("groupId", "")
    val groups = c.optJSONArray("groups")
    val group = groups?.let { (0 until it.length()).map { i -> it.getJSONObject(i) }.find { it.optString("id") == groupId } }
    val totals = usage.optJSONObject("apps") ?: JSONObject()
    val milliseconds = rules.filter { it.optString("groupId", "") == groupId }.sumOf {
      val pkg = it.getString("packageName")
      totals.optLong(pkg) + if (pkg == "com.zhiliaoapp.musically") totals.optLong("com.ss.android.ugc.trill") else 0L
    }
    val effective = JSONObject(c.toString())
    if (group != null) {
      effective.put("policy", group.getString("policy")); effective.put("dailyMinutes", group.getInt("dailyMinutes"))
    }
    return shouldBlock(effective, milliseconds / 1000, now)
  }
  fun monitoredPackages(c: JSONObject): Set<String> {
    if (!c.optBoolean("enabled")) return emptySet()
    val apps = c.optJSONArray("apps") ?: return emptySet()
    val packages = mutableSetOf<String>()
    for (i in 0 until apps.length()) {
      val app = apps.optJSONObject(i) ?: continue
      if (app.optString("mode") !in setOf("selective", "full")) continue
      val pkg = app.optString("packageName")
      if (pkg.isBlank()) continue
      packages.add(pkg)
      if (pkg == "com.zhiliaoapp.musically") packages.add("com.ss.android.ugc.trill")
    }
    return packages
  }
  fun scheduleActive(s: JSONObject, now: Calendar): Boolean {
    if (!s.optBoolean("enabled")) return false
    val days = s.optJSONArray("days") ?: return false
    val day = now.get(Calendar.DAY_OF_WEEK) - 1
    val minute = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE)
    val start = s.optInt("start"); val end = s.optInt("end")
    fun includes(d: Int) = (0 until days.length()).any { days.optInt(it) == d }
    return if (start < end) includes(day) && minute >= start && minute < end
    else (includes(day) && minute >= start) || (includes((day + 6) % 7) && minute < end)
  }

  fun shouldBlock(c: JSONObject, usedSeconds: Long, now: Calendar = Calendar.getInstance()): Boolean {
    if (!c.optBoolean("enabled")) return false
    if (c.optLong("focusUntil") > now.timeInMillis) return true
    val schedules = c.optJSONArray("schedules")
    if (schedules != null && (0 until schedules.length()).any { scheduleActive(schedules.getJSONObject(it), now) }) return true
    return when (c.optString("policy")) {
      "always" -> true
      "budget" -> usedSeconds >= c.optInt("dailyMinutes", 15) * 60L
      else -> false
    }
  }

  fun mode(c: JSONObject, packageName: String): String {
    val apps = c.optJSONArray("apps") ?: return "off"
    // TikTok's regional Android package uses the same rule.
    val canonical = if (packageName == "com.ss.android.ugc.trill") "com.zhiliaoapp.musically" else packageName
    for (i in 0 until apps.length()) {
      val app = apps.getJSONObject(i)
      if (app.optString("packageName") == canonical) return app.optString("mode", "off")
    }
    return "off"
  }
}
