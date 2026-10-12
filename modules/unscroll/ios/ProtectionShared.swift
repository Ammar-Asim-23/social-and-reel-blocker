import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import UserNotifications

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
  let groupId: String?
}
struct FocusGroup: Codable {
  let id: String
  let name: String
  let policy: String
  let dailyMinutes: Int
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
  let groups: [FocusGroup]?
  let theme: String?
  let notifications: Bool?
  var policies: [FocusGroup] { [FocusGroup(id: "default", name: "Default group", policy: policy, dailyMinutes: dailyMinutes)] + (groups ?? []) }

  static func parse(_ data: Data) throws -> FocusConfig {
    guard data.count <= 65536 else { throw ConfigError.invalid }
    let c = try JSONDecoder().decode(FocusConfig.self, from: data)
    func label(_ value: String, max: Int = 80) -> Bool { !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && value.count <= max }
    guard c.version == 1, ["always", "budget", "scheduled"].contains(c.policy), (1...180).contains(c.dailyMinutes),
      c.focusUntil.isFinite, c.focusUntil >= 0, c.focusUntil <= 9007199254740991, c.focusUntil.rounded() == c.focusUntil,
      c.apps.count <= 100, Set(c.apps.map { $0.id }).count == c.apps.count,
      Set(c.apps.map { $0.packageName }).count == c.apps.count,
      c.schedules.count <= 5, Set(c.schedules.map { $0.id }).count == c.schedules.count else { throw ConfigError.invalid }
    let groups = c.groups ?? []
    guard groups.count <= 5, Set(groups.map { $0.id }).count == groups.count,
      c.theme == nil || ["light", "dark"].contains(c.theme!) else { throw ConfigError.invalid }
    for g in groups {
      guard label(g.id), g.id != "default", g.id.range(of: "^[a-zA-Z0-9_-]+$", options: .regularExpression) != nil,
        label(g.name), ["always", "budget", "scheduled"].contains(g.policy), (1...180).contains(g.dailyMinutes) else { throw ConfigError.invalid }
    }
    for a in c.apps {
      guard a.groupId == nil || groups.contains(where: { $0.id == a.groupId }) else { throw ConfigError.invalid }
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
  static var selections: [String: FamilyActivitySelection] {
    var values = (defaults.dictionary(forKey: "groupSelections") as? [String: Data] ?? [:]).compactMapValues { try? JSONDecoder().decode(FamilyActivitySelection.self, from: $0) }
    values["default"] = selection
    return values
  }
  static func saveSelections(_ values: [String: FamilyActivitySelection]) throws {
    let old = selections
    let stored = defaults.dictionary(forKey: "groupSelections") as? [String: Data] ?? [:]
    var encoded: [String: Data] = [:]
    for (id, selection) in values where id != "default" {
      // Preserve serialized token order when unchanged so a theme toggle cannot restart monitors.
      encoded[id] = old[id]?.applicationTokens == selection.applicationTokens && stored[id] != nil ? stored[id] : try JSONEncoder().encode(selection)
    }
    let fallback = values["default"] ?? FamilyActivitySelection()
    if old["default"]?.applicationTokens != fallback.applicationTokens || defaults.data(forKey: "selection") == nil { try saveSelection(fallback) }
    defaults.set(encoded, forKey: "groupSelections")
  }
  static func reached(_ id: String, at now: Date = Date()) -> Bool {
    let days = defaults.dictionary(forKey: "budgetDays") as? [String: String] ?? [:]
    return days[id] == dayKey(now) || (id == "default" && defaults.string(forKey: "budgetReachedDay") == dayKey(now))
  }
  static func clearBudget(_ id: String) {
    var days = defaults.dictionary(forKey: "budgetDays") as? [String: String] ?? [:]
    days.removeValue(forKey: id); defaults.set(days, forKey: "budgetDays")
    if id == "default" { defaults.removeObject(forKey: "budgetReachedDay") }
  }
  static func markBudget(_ id: String) {
    var days = defaults.dictionary(forKey: "budgetDays") as? [String: String] ?? [:]
    days[id] = dayKey(); defaults.set(days, forKey: "budgetDays")
  }
  // Transaction snapshots let a failed Screen Time registration restore prior rules and tokens.
  static let savedKeys = ["config", "selection", "groupSelections", "budgetDays", "budgetReachedDay", "monitorSignatures", "activeGroupIDs"]
  static func snapshot() -> [String: Any] { Dictionary(uniqueKeysWithValues: savedKeys.compactMap { key in defaults.object(forKey: key).map { (key, $0) } }) }
  static func restore(_ snapshot: [String: Any]) {
    for key in savedKeys { defaults.removeObject(forKey: key) }
    for (key, value) in snapshot { defaults.set(value, forKey: key) }
    defaults.removeObject(forKey: "monitorSignatures")
    try? reconcile()
  }
  static func dayKey(_ date: Date = Date()) -> String {
    let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
    return "\(c.year!)-\(c.month!)-\(c.day!)"
  }
  static func apply(at now: Date = Date()) {
    guard let c = config, c.enabled, AuthorizationCenter.shared.authorizationStatus == .approved else {
      settings.clearAllSettings(); defaults.removeObject(forKey: "activeGroupIDs"); return
    }
    let all = selections
    let focusActive = floor(c.focusUntil / 1000) > now.timeIntervalSince1970 || c.schedules.contains { $0.active(at: now) }
    let blocked = c.policies.filter { g in
      !(all[g.id]?.applicationTokens.isEmpty ?? true) && (focusActive || g.policy == "always" || (g.policy == "budget" && reached(g.id, at: now)))
    }
    var tokens = FamilyActivitySelection().applicationTokens
    for g in blocked { tokens.formUnion(all[g.id]?.applicationTokens ?? []) }
    settings.shield.applications = tokens.isEmpty ? nil : tokens
    let prior = Set(defaults.stringArray(forKey: "activeGroupIDs") ?? [])
    let active = Set(blocked.map { $0.id })
    defaults.set(Array(active), forKey: "activeGroupIDs")
    if c.notifications == true && !active.subtracting(prior).isEmpty {
      let content = UNMutableNotificationContent()
      content.title = "A little more focus"; content.body = "Unscroll activated an app boundary."; content.sound = .default
      UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "unscroll.boundary", content: content, trigger: nil))
    }
    // Only individual applications are supported in this app's picker.
    settings.shield.applicationCategories = nil
    settings.shield.webDomains = nil
  }

  static func reconcile() throws {
    guard let c = config, c.enabled, AuthorizationCenter.shared.authorizationStatus == .approved, selections.values.contains(where: { !$0.applicationTokens.isEmpty }) else {
      center.stopMonitoring(); defaults.removeObject(forKey: "monitorSignatures"); settings.clearAllSettings(); defaults.removeObject(forKey: "activeGroupIDs"); return
    }
    var plans: [(DeviceActivityName, DeviceActivitySchedule, [DeviceActivityEvent.Name: DeviceActivityEvent], String)] = []
    // The daily callback also re-evaluates overnight routines at midnight.
    let dailySchedule = DeviceActivitySchedule(intervalStart: DateComponents(hour: 0, minute: 0), intervalEnd: DateComponents(hour: 23, minute: 59, second: 59), repeats: true)
    var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
    var signaturesForGroups: [String] = []
    for g in c.policies {
      let selection = selections[g.id] ?? FamilyActivitySelection()
      if g.policy == "budget" && !selection.applicationTokens.isEmpty {
        events[DeviceActivityEvent.Name("allowance.\(g.id)")] = DeviceActivityEvent(applications: selection.applicationTokens, threshold: DateComponents(minute: g.dailyMinutes), includesPastActivity: true)
      }
      let tokenData = g.id == "default" ? defaults.data(forKey: "selection") : (defaults.dictionary(forKey: "groupSelections") as? [String: Data])?[g.id]
      let tokenSignature = tokenData?.base64EncodedString() ?? ""
      signaturesForGroups.append("\(g.id)-\(g.policy)-\(g.dailyMinutes)-\(tokenSignature)")
    }
    plans.append((daily, dailySchedule, events, signaturesForGroups.joined(separator: "|")))
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
    for key in savedKeys { defaults.removeObject(forKey: key) }
    UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["unscroll.boundary"])
  }
}
