package app.unscroll.nativebridge

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.KeyguardManager
import android.content.Context
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent

class ProtectionService : AccessibilityService() {
  companion object {
    @Volatile var running = false
    private var instance: ProtectionService? = null
    fun disconnect() {
      checkNotNull(instance) { "Open Android Accessibility settings and turn off Unscroll to revoke access." }.let { service ->
        service.handler.removeCallbacksAndMessages(null)
        service.monitored = emptySet()
        service.lastPackage = null
        service.disableSelf()
      }
      running = false
    }
  }
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var store: ProtectionStore
  private var lastTick = 0L
  private var lastPackage: String? = null
  private var lastBlocked = 0L
  private var attempts = 0
  private var monitored: Set<String> = emptySet()
  private lateinit var preferences: SharedPreferences
  private val rulesChanged = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
    if (key == null || key == "config") handler.post { if (running) configureScope() }
  }
  private val ticker = object : Runnable {
    override fun run() { inspect(); if (monitored.isNotEmpty()) handler.postDelayed(this, 1000) }
  }
  override fun onServiceConnected() {
    store = ProtectionStore(this); running = true; instance = this
    preferences = getSharedPreferences("unscroll", Context.MODE_PRIVATE)
    preferences.registerOnSharedPreferenceChangeListener(rulesChanged)
    configureScope()
  }
  private fun configureScope() {
    monitored = RuleEngine.monitoredPackages(store.config())
    val info = serviceInfo ?: return
    // Empty/null packageNames means ALL packages to Android, so use a sentinel.
    info.packageNames = if (monitored.isEmpty()) arrayOf("$packageName.disabled") else monitored.toTypedArray()
    info.eventTypes = if (monitored.isEmpty()) 0 else AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
      AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED or AccessibilityEvent.TYPE_VIEW_SELECTED or AccessibilityEvent.TYPE_VIEW_SCROLLED
    info.flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
    serviceInfo = info
    handler.removeCallbacks(ticker)
    lastPackage = null; lastTick = 0L; attempts = 0
    if (monitored.isNotEmpty()) handler.post(ticker)
  }
  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    // Do not retain event text, source nodes, or a browsing history.
    val pkg = event?.packageName?.toString() ?: return
    if (::store.isInitialized && pkg in monitored) inspect()
  }
  private fun inspect() {
    val c = store.config()
    if (!c.optBoolean("enabled") || monitored.isEmpty()) { lastPackage = null; return }
    val now = SystemClock.elapsedRealtime()
    val elapsed = if (lastTick == 0L) 0L else (now - lastTick).coerceIn(0L, 1500L)
    lastTick = now
    val power = getSystemService(Context.POWER_SERVICE) as PowerManager
    val lock = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    if (!power.isInteractive || lock.isKeyguardLocked) { lastPackage = null; return }
    val root = rootInActiveWindow ?: run { lastPackage = null; return }
    try {
      val pkg = root.packageName?.toString().orEmpty()
      // Reject unrelated windows before traversing any child nodes or identifiers.
      if (pkg !in monitored) { lastPackage = null; attempts = 0; return }
      val mode = RuleEngine.mode(c, pkg)
      val target = c.optBoolean("enabled") && (mode == "full" || (mode == "selective" && FeedDetector.isFeed(pkg, root)))
      if (!target) { lastPackage = null; attempts = 0; return }
      // Only bill an interval if its start and end were in the same detected feed/app.
      if (lastPackage == pkg) store.addUsage(pkg, elapsed)
      lastPackage = pkg
      if (!RuleEngine.shouldBlockApp(c, pkg, store.usage())) return
      if (now - lastBlocked < 1800) return
      lastBlocked = now
      val succeeded = performGlobalAction(if (mode == "full" || attempts >= 2) GLOBAL_ACTION_HOME else GLOBAL_ACTION_BACK) || performGlobalAction(GLOBAL_ACTION_HOME)
      if (succeeded) {
        store.interrupted()
        if (c.optBoolean("notifications")) InterruptionNotifications.post(this)
      }
      attempts++
      lastPackage = null
    } finally { @Suppress("DEPRECATION") root.recycle() }
  }
  override fun onInterrupt() { lastPackage = null }
  override fun onDestroy() {
    running = false; instance = null
    if (::preferences.isInitialized) preferences.unregisterOnSharedPreferenceChangeListener(rulesChanged)
    handler.removeCallbacksAndMessages(null); super.onDestroy()
  }
}
