package app.unscroll.nativebridge

import android.accessibilityservice.AccessibilityService
import android.app.KeyguardManager
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast

class ProtectionService : AccessibilityService() {
  companion object { @Volatile var running = false }
  private val handler = Handler(Looper.getMainLooper())
  private lateinit var store: ProtectionStore
  private var lastTick = 0L
  private var lastPackage: String? = null
  private var lastBlocked = 0L
  private var attempts = 0
  private val ticker = object : Runnable {
    override fun run() { inspect(); handler.postDelayed(this, 1000) }
  }
  override fun onServiceConnected() {
    store = ProtectionStore(this); running = true
    handler.removeCallbacks(ticker); handler.post(ticker)
  }
  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    // Do not retain event text, source nodes, or a browsing history.
    if (::store.isInitialized) inspect()
  }
  private fun inspect() {
    val now = SystemClock.elapsedRealtime()
    val elapsed = if (lastTick == 0L) 0L else (now - lastTick).coerceIn(0L, 1500L)
    lastTick = now
    val power = getSystemService(Context.POWER_SERVICE) as PowerManager
    val lock = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
    if (!power.isInteractive || lock.isKeyguardLocked) { lastPackage = null; return }
    val root = rootInActiveWindow ?: run { lastPackage = null; return }
    try {
      val pkg = root.packageName?.toString().orEmpty()
      val c = store.config()
      val mode = RuleEngine.mode(c, pkg)
      val target = c.optBoolean("enabled") && (mode == "full" || (mode == "selective" && FeedDetector.isFeed(pkg, root)))
      if (!target) { lastPackage = null; attempts = 0; return }
      // Only bill an interval if its start and end were in the same detected feed/app.
      if (lastPackage == pkg) store.addUsage(pkg, elapsed)
      lastPackage = pkg
      if (!RuleEngine.shouldBlock(c, store.usage().optLong("milliseconds") / 1000)) return
      if (now - lastBlocked < 1800) return
      lastBlocked = now
      val succeeded = performGlobalAction(if (mode == "full" || attempts >= 2) GLOBAL_ACTION_HOME else GLOBAL_ACTION_BACK)
      if (!succeeded) performGlobalAction(GLOBAL_ACTION_HOME)
      if (attempts == 0) {
        store.interrupted()
        Toast.makeText(this, "Unscroll · Take a breath. Your focus is protected.", Toast.LENGTH_SHORT).show()
      }
      attempts++
      lastPackage = null
    } finally { @Suppress("DEPRECATION") root.recycle() }
  }
  override fun onInterrupt() { lastPackage = null }
  override fun onDestroy() { running = false; handler.removeCallbacksAndMessages(null); super.onDestroy() }
}
