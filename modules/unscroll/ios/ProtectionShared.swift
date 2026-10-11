import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

struct FocusRoutine: Codable {
  let id: String
  let name: String
  let days: [Int]
  let start: Int
  let end: Int
  let enabled: Bool

  func active(at date: Date) -> Bool {
    guard enabled else { return false }
    let c = Calendar.current.dateComponents([.weekday, .hour, .minute], from: date)
    let day = (c.weekday ?? 1) - 1
    let minute = (c.hour ?? 0) * 60 + (c.minute ?? 0)
    if start < end { return days.contains(day) && minute >= start && minute < end }
    return (days.contains(day) && minute >= start) || (days.contains((day + 6) % 7) && minute < end)
  }
}
struct FocusAppRule: Codable {
  let id: String
  let name: String
  let packageName: String
  let mode: String
}
enum ConfigError: LocalizedError {
  case invalid
  var errorDescription: String? { "Invalid or oversized protection settings." }
}
struct FocusConfig: Codable {
  let version: Int
  let onboarded: Bool
  let enabled: Bool
  let policy: String
  let dailyMinutes: Int
  let focusUntil: Double
  let schedules: [FocusRoutine]
  let apps: [FocusAppRule]

  static func parse(_ data: Data) throws -> FocusConfig {
    guard data.count <= 65536 else { throw ConfigError.invalid }
    let c = try JSONDecoder().decode(FocusConfig.self, from: data)
    func label(_ value: String, max: Int = 80) -> Bool { !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.count <= max }
    guard c.version == 1, ["always", "budget", "scheduled"].contains(c.policy), (1...180).contains(c.dailyMinutes),
      c.focusUntil.isFinite, c.focusUntil >= 0, c.focusUntil <= 9007199254740991, c.focusUntil.rounded() == c.focusUntil,
      c.apps.count <= 100, Set(c.apps.map { $0.id }).count == c.apps.count,
      Set(c.apps.map { $0.packageName }).count == c.apps.count,
      c.schedules.count <= 5, Set(c.schedules.map { $0.id }).count == c.schedules.count else { throw ConfigError.invalid }
    for a in c.apps {
      guard label(a.id, max: 255), label(a.name), a.packageName.count <= 255,
        a.packageName.range(of: #"^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$"#, options: .regularExpression) != nil,
        ["off", "selective", "full"].contains(a.mode) else { throw ConfigError.invalid }
    }
    for r in c.schedules {
      guard label(r.id), r.id.range(of: "^[a-zA-Z0-9_-]+$", options: .regularExpression) != nil, label(r.name),
        (0...1439).contains(r.start), (0...1439).contains(r.end), (r.end - r.start + 1440) % 1440 >= 15,
        !r.days.isEmpty, r.days.count <= 7, Set(r.days).count == r.days.count, r.days.allSatisfy({ (0...6).contains($0) }) else { throw ConfigError.invalid }
    }
    return c
  }
}

// Compiled into both the host module and the monitor extension.
enum ProtectionShared {
  static var defaults: UserDefaults {
    let group = Bundle.main.object(forInfoDictionaryKey: "UnscrollAppGroup") as? String ?? "group.app.unscroll.focus"
    return UserDefaults(suiteName: group)!
  }
  static let settings = ManagedSettingsStore(named: ManagedSettingsStore.Name("unscroll"))
  static let center = DeviceActivityCenter()
  static let daily = DeviceActivityName("unscroll.daily")
  static let focus = DeviceActivityName("unscroll.focus")
  static var config: FocusConfig? {
    guard let json = defaults.string(forKey: "config"), let data = json.data(using: .utf8) else { return nil }
    return try? FocusConfig.parse(data)
  }
  static var selection: FamilyActivitySelection {
    guard let data = defaults.data(forKey: "selection"), let value = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else { return FamilyActivitySelection() }
    return value
  }
  static func saveSelection(_ selection: FamilyActivitySelection) throws {
    defaults.set(try JSONEncoder().encode(selection), forKey: "selection")
  }
  static func dayKey(_ date: Date = Date()) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return "\(c.year!)-\(c.month!)-\(c.day!)"
  }
  static func apply(at now: Date = Date()) {
    guard let c = config, c.enabled, AuthorizationCenter.shared.authorizationStatus == .approved else { settings.clearAllSettings(); return }
    let reached = defaults.string(forKey: "budgetReachedDay") == dayKey(now)
    let block = c.policy == "always" || (c.policy == "budget" && reached) || floor(c.focusUntil / 1000) > now.timeIntervalSince1970 || c.schedules.contains { $0.active(at: now) }
    settings.shield.applications = block && !selection.applicationTokens.isEmpty ? selection.applicationTokens : nil
    // Only individual applications are supported in this app's picker.
    settings.shield.applicationCategories = nil
    settings.shield.webDomains = nil
  }

  static func reconcile() throws {
    guard let c = config, c.enabled, AuthorizationCenter.shared.authorizationStatus == .approved, !selection.applicationTokens.isEmpty else {
      center.stopMonitoring(); defaults.removeObject(forKey: "monitorSignatures"); settings.clearAllSettings(); return
    }
    var plans: [(DeviceActivityName, DeviceActivitySchedule, [DeviceActivityEvent.Name: DeviceActivityEvent], String)] = []
    // The daily callback also re-evaluates overnight routines at midnight.
    let dailySchedule = DeviceActivitySchedule(intervalStart: DateComponents(hour: 0, minute: 0), intervalEnd: DateComponents(hour: 23, minute: 59, second: 59), repeats: true)
    var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
    if c.policy == "budget" {
      events[DeviceActivityEvent.Name("allowance")] = DeviceActivityEvent(applications: selection.applicationTokens, threshold: DateComponents(minute: c.dailyMinutes), includesPastActivity: true)
    }
    let tokenSignature = defaults.data(forKey: "selection")?.base64EncodedString() ?? ""
    plans.append((daily, dailySchedule, events, "\(c.policy)-\(c.dailyMinutes)-\(tokenSignature)"))
    // Daily monitors plus weekday checks avoid exhausting Apple's 20-monitor limit.
    // Five routines + daily + focus use at most seven monitors.
    for r in c.schedules where r.enabled {
      let schedule = DeviceActivitySchedule(intervalStart: DateComponents(hour: r.start / 60, minute: r.start % 60), intervalEnd: DateComponents(hour: r.end / 60, minute: r.end % 60), repeats: true)
      plans.append((DeviceActivityName("unscroll.routine.\(r.id)"), schedule, [:], "\(r.start)-\(r.end)-\(r.days)"))
    }
    if c.focusUntil > Date().timeIntervalSince1970 * 1000 {
      let end = Date(timeIntervalSince1970: c.focusUntil / 1000)
      // A start in the past keeps registration above the minimum 15-minute interval
      // even when an existing session has less than 15 minutes remaining.
      let start = end.addingTimeInterval(-7200)
      let units: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
      let schedule = DeviceActivitySchedule(intervalStart: Calendar.current.dateComponents(units, from: start), intervalEnd: Calendar.current.dateComponents(units, from: end), repeats: false)
      plans.append((focus, schedule, [:], String(c.focusUntil)))
    }
    let old = defaults.dictionary(forKey: "monitorSignatures") as? [String: String] ?? [:]
    let wanted = Set(plans.map { $0.0 })
    let removed = center.activities.filter { !wanted.contains($0) }
    if !removed.isEmpty { center.stopMonitoring(removed) }
    var signatures: [String: String] = [:]
    for (id, schedule, events, signature) in plans {
      if old[id.rawValue] != signature || !center.activities.contains(id) {
        try center.startMonitoring(id, during: schedule, events: events)
      }
      signatures[id.rawValue] = signature
    }
    defaults.set(signatures, forKey: "monitorSignatures")
    apply()
  }
  static func reset() {
    center.stopMonitoring(); settings.clearAllSettings()
    for key in ["config", "selection", "budgetReachedDay", "monitorSignatures"] { defaults.removeObject(forKey: key) }
  }
}
