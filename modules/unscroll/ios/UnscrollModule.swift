import ExpoModulesCore
import FamilyControls
import SwiftUI
import UserNotifications

public class UnscrollModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Unscroll")
    AsyncFunction("getConfig") { () -> String? in ProtectionShared.defaults.string(forKey: "config") }
    AsyncFunction("saveConfig") { (json: String) in
      let parsed = try FocusConfig.parse(Data(json.utf8))
      let previous = ProtectionShared.snapshot()
      let priorConfig = ProtectionShared.config
      do {
        var selections = ProtectionShared.selections
        let wanted = Set(parsed.policies.map { $0.id })
        // Deleting a group moves its private tokens to the default group.
        for id in Array(selections.keys) where !wanted.contains(id) {
          var fallback = selections["default"] ?? FamilyActivitySelection()
          fallback.applicationTokens.formUnion(selections[id]?.applicationTokens ?? [])
          selections["default"] = fallback; selections.removeValue(forKey: id)
          ProtectionShared.clearBudget(id); ProtectionShared.clearBudget("default")
        }
        for group in parsed.policies {
          let old = priorConfig?.policies.first { $0.id == group.id }
          if old?.dailyMinutes != group.dailyMinutes || old?.policy != group.policy { ProtectionShared.clearBudget(group.id) }
        }
        try ProtectionShared.saveSelections(selections)
        ProtectionShared.defaults.set(json, forKey: "config")
        try ProtectionShared.reconcile()
        if parsed.notifications != true { UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ["unscroll.boundary"]) }
      }
      catch {
        ProtectionShared.restore(previous)
        throw error
      }
    }.runOnQueue(.main)
    AsyncFunction("getStatus") { () async -> [String: Any] in
      let notifications = await UNUserNotificationCenter.current().notificationSettings()
      return await MainActor.run {
        ProtectionShared.apply()
        let authorized = AuthorizationCenter.shared.authorizationStatus == .approved
        let counts = ProtectionShared.selections.mapValues { $0.applicationTokens.count }
        let budgets = Dictionary(uniqueKeysWithValues: (ProtectionShared.config?.policies ?? []).map { ($0.id, ProtectionShared.reached($0.id)) })
        return ["authorized": authorized, "serviceRunning": authorized,
          "selectedApps": counts.values.reduce(0, +), "selectedAppsByGroup": counts,
          "budgetReached": ProtectionShared.reached("default"), "budgetReachedByGroup": budgets,
          "notificationsAuthorized": notifications.authorizationStatus == .authorized || notifications.authorizationStatus == .provisional,
          "featuresVersion": 2, "usedSeconds": NSNull(), "interruptions": 0, "usageByApp": [:] as [String: Int]]
      }
    }
    AsyncFunction("requestNotificationPermission") { () async throws in
      _ = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
    }
    AsyncFunction("requestAuthorization") { () async throws in
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      try ProtectionShared.reconcile()
    }
    AsyncFunction("selectApps") { (groupId: String, promise: Promise) in
      guard AuthorizationCenter.shared.authorizationStatus == .approved else { promise.reject("NOT_AUTHORIZED", "Allow Screen Time access first."); return }
      guard groupId == "default" || ProtectionShared.config?.groups?.contains(where: { $0.id == groupId }) == true else { promise.reject("INVALID_GROUP", "Save the group before choosing apps."); return }
      guard let presenter = self.appContext?.utilities?.currentViewController() else { promise.reject("NO_VIEW", "Open Unscroll and try again."); return }
      var host: UIHostingController<SelectionScreen>?
      let screen = SelectionScreen(initial: ProtectionShared.selections[groupId] ?? FamilyActivitySelection(), onDone: { selection in
        let previous = ProtectionShared.snapshot()
        do {
          var selections = ProtectionShared.selections
          for id in Array(selections.keys) where id != groupId {
            var other = selections[id]!
            let old = other.applicationTokens
            other.applicationTokens.subtract(selection.applicationTokens)
            if old != other.applicationTokens { ProtectionShared.clearBudget(id) }
            selections[id] = other
          }
          if selections[groupId]?.applicationTokens != selection.applicationTokens { ProtectionShared.clearBudget(groupId) }
          selections[groupId] = selection
          try ProtectionShared.saveSelections(selections)
          try ProtectionShared.reconcile()
          promise.resolve(selection.applicationTokens.count)
        } catch {
          ProtectionShared.restore(previous)
          promise.reject("SELECTION_FAILED", error.localizedDescription)
        }
        host?.dismiss(animated: true); host = nil
      }, onCancel: {
        promise.resolve(ProtectionShared.selections[groupId]?.applicationTokens.count ?? 0)
        host?.dismiss(animated: true); host = nil
      })
      host = UIHostingController(rootView: screen)
      host?.isModalInPresentation = true
      presenter.present(host!, animated: true)
    }.runOnQueue(.main)
    AsyncFunction("getInstalledApps") { () -> [[String: String]] in [] }
    AsyncFunction("reset") { ProtectionShared.reset() }.runOnQueue(.main)
  }
}
private struct SelectionScreen: View {
  @State var selection: FamilyActivitySelection
  let onDone: (FamilyActivitySelection) -> Void
  let onCancel: () -> Void
  init(initial: FamilyActivitySelection, onDone: @escaping (FamilyActivitySelection) -> Void, onCancel: @escaping () -> Void) {
    _selection = State(initialValue: initial); self.onDone = onDone; self.onCancel = onCancel
  }
  var body: some View {
    NavigationStack {
      VStack {
        Text("Select individual apps. Choosing an app moves it out of its previous group. Categories and websites are not supported.").font(.footnote).padding()
        FamilyActivityPicker(selection: $selection)
      }
      .navigationTitle("Your boundaries")
      .toolbar {
        ToolbarItem(placement: .cancellationAction) { Button("Cancel", action: onCancel) }
        ToolbarItem(placement: .confirmationAction) {
          Button("Done") {
            var appsOnly = FamilyActivitySelection()
            appsOnly.applicationTokens = selection.applicationTokens
            onDone(appsOnly)
          }.disabled(!selection.categoryTokens.isEmpty || !selection.webDomainTokens.isEmpty)
        }
      }
    }
  }
}
