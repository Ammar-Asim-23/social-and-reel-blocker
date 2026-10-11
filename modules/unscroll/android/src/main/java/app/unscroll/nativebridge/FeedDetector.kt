package app.unscroll.nativebridge

import android.view.accessibility.AccessibilityNodeInfo
import java.util.ArrayDeque

/** Conservative heuristics: never search text nodes or match an unselected feed tab.
 * Identifiers change between app releases; see docs/DEVICE_TESTS.md before release. */
internal object FeedDetector {
  private val anchors = mapOf(
    "com.google.android.youtube" to setOf("reel_recycler", "reel_player_page_container", "shorts_player", "reel_watch_fragment_root"),
    "com.instagram.android" to setOf("clips_viewer_view_pager", "clips_viewer_container", "clips_video_view", "clips_viewer_video_layout"),
    "com.snapchat.android" to setOf("spotlight_view_pager", "spotlight_player_view", "spotlight_feed_container"),
    "com.zhiliaoapp.musically" to setOf("feed_view_pager", "feed_viewpager", "video_feed_container"),
    "com.ss.android.ugc.trill" to setOf("feed_view_pager", "feed_viewpager", "video_feed_container")
  )
  private val tabs = mapOf(
    "com.google.android.youtube" to "shorts", "com.instagram.android" to "reels",
    "com.snapchat.android" to "spotlight"
  )
  fun isFeed(packageName: String, root: AccessibilityNodeInfo): Boolean {
    val ids = anchors[packageName] ?: return false
    val queue = ArrayDeque<AccessibilityNodeInfo>()
    // The caller owns root; we own (and recycle) its copies and descendants.
    @Suppress("DEPRECATION")
    val copy = AccessibilityNodeInfo.obtain(root)
    queue.add(copy)
    var scanned = 0
    try {
      while (!queue.isEmpty() && scanned++ < 500) {
        val node = queue.removeFirst()
        try {
          if (!node.isVisibleToUser) continue
          val id = node.viewIdResourceName?.substringAfter(":id/")
          if (id in ids) return true
          val tab = tabs[packageName]
          // Only read labels on selected navigation controls, never messages or posts.
          if (tab != null && node.isSelected) {
            val label = node.contentDescription?.toString()?.lowercase()?.trim().orEmpty()
            if (label == tab || label.startsWith("$tab,")) return true
          }
          for (i in 0 until node.childCount) node.getChild(i)?.let { queue.add(it) }
        } finally { @Suppress("DEPRECATION") node.recycle() }
      }
      return false
    } finally { while (!queue.isEmpty()) { @Suppress("DEPRECATION") queue.removeFirst().recycle() } }
  }
}
