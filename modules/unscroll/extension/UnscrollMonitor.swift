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
    guard activity == ProtectionShared.daily, event.rawValue.hasPrefix("allowance.") else { return }
    let id = String(event.rawValue.dropFirst("allowance.".count))
    guard ProtectionShared.config?.policies.contains(where: { $0.id == id && $0.policy == "budget" }) == true else { return }
    ProtectionShared.markBudget(id)
    ProtectionShared.apply()
  }
}
