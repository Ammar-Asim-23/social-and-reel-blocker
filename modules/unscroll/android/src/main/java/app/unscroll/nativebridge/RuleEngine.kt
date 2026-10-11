package app.unscroll.nativebridge

import org.json.JSONObject
import java.util.Calendar

internal object RuleEngine {
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
