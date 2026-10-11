import ExpoModulesCore
import FamilyControls
import SwiftUI

public class UnscrollModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Unscroll")
    AsyncFunction("getConfig") { () -> String? in ProtectionShared.defaults.string(forKey: "config") }
    AsyncFunction("saveConfig") { (json: String) in
      let parsed = try FocusConfig.parse(Data(json.utf8))
      let previous = ProtectionShared.defaults.string(forKey: "config")
      let priorConfig = ProtectionShared.config
      let priorReached = ProtectionShared.defaults.string(forKey: "budgetReachedDay")
      // A new allowance needs a new threshold callback, including earlier usage today.
      if priorConfig?.dailyMinutes != parsed.dailyMinutes { ProtectionShared.defaults.removeObject(forKey: "budgetReachedDay") }
      ProtectionShared.defaults.set(json, forKey: "config")
      do { try ProtectionShared.reconcile() }
      catch {
        ProtectionShared.defaults.set(previous, forKey: "config")
        ProtectionShared.defaults.set(priorReached, forKey: "budgetReachedDay")
        ProtectionShared.defaults.removeObject(forKey: "monitorSignatures")
        try? ProtectionShared.reconcile()
        throw error
      }
    }.runOnQueue(.main)
    AsyncFunction("getStatus") { () -> [String: Any] in
      ProtectionShared.apply()
      let authorized = AuthorizationCenter.shared.authorizationStatus == .approved
      return ["authorized": authorized, "serviceRunning": authorized,
        "selectedApps": ProtectionShared.selection.applicationTokens.count,
        "budgetReached": ProtectionShared.defaults.string(forKey: "budgetReachedDay") == ProtectionShared.dayKey(),
        "usedSeconds": NSNull(), "interruptions": 0, "usageByApp": [:] as [String: Int]]
    }.runOnQueue(.main)
    AsyncFunction("requestAuthorization") { () async throws in
      try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
      try ProtectionShared.reconcile()
    }
    AsyncFunction("selectApps") { (promise: Promise) in
      guard AuthorizationCenter.shared.authorizationStatus == .approved else { promise.reject("NOT_AUTHORIZED", "Allow Screen Time access first."); return }
      guard let presenter = self.appContext?.utilities?.currentViewController() else { promise.reject("NO_VIEW", "Open Unscroll and try again."); return }
      var host: UIHostingController<SelectionScreen>?
      let screen = SelectionScreen(initial: ProtectionShared.selection, onDone: { selection in
        let old = ProtectionShared.selection
        let priorReached = ProtectionShared.defaults.string(forKey: "budgetReachedDay")
        do {
          try ProtectionShared.saveSelection(selection)
          if old.applicationTokens != selection.applicationTokens { ProtectionShared.defaults.removeObject(forKey: "budgetReachedDay") }
          try ProtectionShared.reconcile()
          promise.resolve(selection.applicationTokens.count)
        } catch {
          try? ProtectionShared.saveSelection(old)
          ProtectionShared.defaults.set(priorReached, forKey: "budgetReachedDay")
          ProtectionShared.defaults.removeObject(forKey: "monitorSignatures")
          try? ProtectionShared.reconcile()
          promise.reject("SELECTION_FAILED", error.localizedDescription)
        }
        host?.dismiss(animated: true); host = nil
      }, onCancel: {
        promise.resolve(ProtectionShared.selection.applicationTokens.count)
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
        Text("Select individual apps. Categories and websites are not supported.").font(.footnote).padding()
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
