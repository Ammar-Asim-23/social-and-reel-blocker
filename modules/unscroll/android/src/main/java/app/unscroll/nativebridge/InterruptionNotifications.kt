package app.unscroll.nativebridge

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context

internal object InterruptionNotifications {
  private const val CHANNEL = "unscroll.interruptions"
  private const val ID = 42
  private fun manager(context: Context) = context.getSystemService(NotificationManager::class.java)
  fun createChannel(context: Context) {
    manager(context).createNotificationChannel(NotificationChannel(CHANNEL, "Blocking activity", NotificationManager.IMPORTANCE_DEFAULT).apply {
      description = "When Unscroll leaves a blocked feed or app"
      lockscreenVisibility = Notification.VISIBILITY_PRIVATE
    })
  }
  fun allowed(context: Context): Boolean = manager(context).areNotificationsEnabled() &&
    (manager(context).getNotificationChannel(CHANNEL)?.importance ?: NotificationManager.IMPORTANCE_DEFAULT) != NotificationManager.IMPORTANCE_NONE
  fun post(context: Context) {
    createChannel(context)
    if (!allowed(context)) return
    val notification = Notification.Builder(context, CHANNEL)
      .setSmallIcon(R.drawable.ic_notification)
      .setContentTitle("A little more focus")
      .setContentText("Unscroll left a blocked feed or app.")
      .setVisibility(Notification.VISIBILITY_PRIVATE)
      .setAutoCancel(true).setOnlyAlertOnce(false).build()
    // Replace the previous item, avoiding an unbounded history of app activity.
    try { manager(context).notify(ID, notification) } catch (_: SecurityException) { /* Permission revoked. */ }
  }
  fun clear(context: Context) { manager(context).cancel(ID) }
}
