package app.unscroll.nativebridge

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.util.Calendar

class RuleEngineTest {
  @Test fun groupBudgetDoesNotConsumeOtherGroupUsage() {
    val c = JSONObject("""{"enabled":true,"policy":"always","dailyMinutes":15,"focusUntil":0,"schedules":[],"groups":[{"id":"focus","policy":"scheduled","dailyMinutes":5},{"id":"daily","policy":"budget","dailyMinutes":5}],"apps":[{"packageName":"com.example.work","mode":"full","groupId":"focus"},{"packageName":"com.example.social","mode":"full","groupId":"daily"},{"packageName":"com.example.other","mode":"full"}]}""")
    val usage = JSONObject("""{"apps":{"com.example.work":9999999,"com.example.social":299999}}""")
    assertFalse(RuleEngine.shouldBlockApp(c, "com.example.work", usage, at(12, 12)))
    assertFalse(RuleEngine.shouldBlockApp(c, "com.example.social", usage, at(12, 12)))
    assertTrue(RuleEngine.shouldBlockApp(c, "com.example.other", usage, at(12, 12)))
    usage.getJSONObject("apps").put("com.example.social", 300000)
    assertTrue(RuleEngine.shouldBlockApp(c, "com.example.social", usage, at(12, 12)))
    c.put("focusUntil", at(12, 13).timeInMillis)
    assertTrue(RuleEngine.shouldBlockApp(c, "com.example.work", usage, at(12, 12)))
    c.put("enabled", false)
    assertFalse(RuleEngine.shouldBlockApp(c, "com.example.social", usage, at(12, 12)))
  }
  @Test fun rejectsUnknownGroupsAndInvalidPreferences() {
    val c = JSONObject(validConfig).put("apps", org.json.JSONArray("""[{"id":"social","name":"Social","packageName":"com.example.social","mode":"full","groupId":"missing"}]"""))
    assertThrows(IllegalArgumentException::class.java) { ConfigValidator.parse(c.toString()) }
    assertThrows(IllegalArgumentException::class.java) { ConfigValidator.parse(JSONObject(validConfig).put("notifications", "yes").toString()) }
    assertThrows(IllegalArgumentException::class.java) { ConfigValidator.parse(JSONObject(validConfig).put("groups", org.json.JSONArray("""[{"id":"default","name":"Duplicate","policy":"always","dailyMinutes":5}]""")).toString()) }
  }
  @Test fun accessibilityScopeIncludesOnlyEnabledRulesAndStopsWhenPaused() {
    val c = JSONObject("""{"enabled":true,"apps":[{"packageName":"com.zhiliaoapp.musically","mode":"selective"},{"packageName":"com.example.blocked","mode":"full"},{"packageName":"com.example.private","mode":"off"}]}""")
    assertEquals(setOf("com.zhiliaoapp.musically", "com.ss.android.ugc.trill", "com.example.blocked"), RuleEngine.monitoredPackages(c))
    c.put("enabled", false)
    assertTrue(RuleEngine.monitoredPackages(c).isEmpty())
    assertTrue(RuleEngine.monitoredPackages(JSONObject()).isEmpty())
  }
  private val validConfig = """{"version":1,"onboarded":true,"enabled":true,"policy":"always","dailyMinutes":15,"focusUntil":0,"apps":[],"schedules":[]}"""
  @Test fun nativeBoundaryRejectsOversizedAndMalformedSettings() {
    assertEquals(1, ConfigValidator.parse(validConfig).getInt("version"))
    assertThrows(IllegalArgumentException::class.java) { ConfigValidator.parse(validConfig.replace("\"dailyMinutes\":15", "\"dailyMinutes\":-1")) }
    assertThrows(IllegalArgumentException::class.java) { ConfigValidator.parse(" ".repeat(65537)) }
    val protectedRule = JSONObject(validConfig).put("apps", org.json.JSONArray("""[{"id":"settings","name":"Settings","packageName":"com.android.settings","mode":"full"}]""")).toString()
    assertThrows(IllegalArgumentException::class.java) { ConfigValidator.parse(protectedRule, setOf("com.android.settings")) }
  }
  private fun at(day: Int, hour: Int, minute: Int = 0) = Calendar.getInstance().apply {
    set(2026, Calendar.OCTOBER, day, hour, minute, 0); set(Calendar.MILLISECOND, 0)
  }
  @Test fun overnightScheduleUsesPreviousDayAfterMidnight() {
    val r = JSONObject("""{"enabled":true,"days":[1],"start":1320,"end":420}""")
    assertFalse(RuleEngine.scheduleActive(r, at(12, 6)))
    assertFalse(RuleEngine.scheduleActive(r, at(12, 21, 59)))
    assertTrue(RuleEngine.scheduleActive(r, at(12, 22)))
    assertTrue(RuleEngine.scheduleActive(r, at(13, 6, 59)))
    assertFalse(RuleEngine.scheduleActive(r, at(13, 7)))
  }
  @Test fun allowanceIsSharedAndMasterPauseWins() {
    val c = JSONObject("""{"enabled":true,"policy":"budget","dailyMinutes":15,"focusUntil":0,"schedules":[]}""")
    assertFalse(RuleEngine.shouldBlock(c, 899, at(12, 12)))
    assertTrue(RuleEngine.shouldBlock(c, 900, at(12, 12)))
    c.put("focusUntil", at(12, 13).timeInMillis)
    assertTrue(RuleEngine.shouldBlock(c, 0, at(12, 12)))
    c.put("enabled", false)
    assertFalse(RuleEngine.shouldBlock(c, 10000, at(12, 12)))
  }
  @Test fun tiktokRegionalPackageUsesSameRuleAndUnknownAppsStayOpen() {
    val c = JSONObject("""{"apps":[{"packageName":"com.zhiliaoapp.musically","mode":"selective"}]}""")
    assertEquals("selective", RuleEngine.mode(c, "com.ss.android.ugc.trill"))
    assertEquals("off", RuleEngine.mode(c, "com.example.messages"))
  }
}
