import DeviceActivity
import Foundation

class UnscrollMonitor: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    // Date-scoped budget markers expire without clearing a new threshold callback.
    ProtectionShared.apply()
  }
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    ProtectionShared.apply()
  }
  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    guard activity == ProtectionShared.daily, event.rawValue == "allowance", ProtectionShared.config?.policy == "budget" else { return }
    ProtectionShared.defaults.set(ProtectionShared.dayKey(), forKey: "budgetReachedDay")
    ProtectionShared.apply()
  }
}
