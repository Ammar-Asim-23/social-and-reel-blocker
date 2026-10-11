# Architecture and privacy

React Native renders the controls. Native preferences are the source of truth on phones; AsyncStorage is used only when the native module is absent. Config updates are validated before being saved, serialized to avoid overlapping writes, and reflected in the UI only after the native save completes. Failure remains visible. Native services operate without JavaScript timers.

## Android

An AccessibilityService observes window state, selected-view, scroll, and content-change events. It gets the active root's package, checks whether a rule applies, and scans at most 500 visible nodes only for selected supported apps. It reads resource identifiers and the content description of selected navigation nodes; it never reads `node.text`, event text, messages, posts, or images. These identifiers are used transiently, not saved or uploaded.

A one-second native heartbeat detects allowance expiration even if a video plays without further gestures. Time uses elapsed realtime and is counted only when both ends of an interval identify the same selected feed/app, the display is interactive, and the device is unlocked. Intervals are capped to avoid billing suspended time. This is an estimate of foreground exposure, not proof that a video was playing. Boundary sampling can undercount short visits by approximately a second. There is no fabricated time-saved metric.

Rules are evaluated using the current local wall clock. Blocking sends Back for a selected feed, with Home as a fallback if repeated Back attempts fail; whole-app rules use Home. A short toast explains the action. This is redirect-based blocking, not visual removal of the feed UI, and a feed can be briefly visible before detection.

Only current configuration, today's per-package usage milliseconds, and today's interruption count are stored in private SharedPreferences. The day key resets totals lazily on the next read or service tick. Backup is disabled for the Android app. No usage-access permission, VPN, overlay permission, remote server, screenshot capture, or message interception is used.

## iOS

The native bridge requests individual Family Controls authorization and presents Apple's FamilyActivityPicker. Opaque application tokens stay in App Group preferences and never cross into JavaScript. Whole-app shields are held in a named ManagedSettingsStore. The separate DeviceActivityMonitor extension applies rules at schedule boundaries and daily usage thresholds after the host app exits.

The allowance threshold includes prior activity within the daily schedule (iOS 17.4+). An ISO-like local day marker records whether the threshold has been reached. No numeric Screen Time usage is returned to React Native. App-selection changes and allowance changes recalculate threshold monitoring. Monitor registrations are signature-compared so routine UI saves do not unnecessarily replace the daily monitor.

Five daily recurring routine monitors evaluate the configured weekdays themselves, avoiding more than seven total registrations. Every callback recomputes the union of active rules. Repeating local-clock schedules follow OS scheduling semantics. Callback timing and DST/time-zone behavior require device acceptance tests.

The module and monitor compile the same shared Swift rule code. The config plugin sets entitlements, copies the shared source into the generated extension, adds its target and dependency, embeds its product, and supplies EAS extension metadata. The platform's own privacy model does not permit observing a third-party app's Reels/Shorts interface.

## Known limitations

- Android detectors have not yet been calibrated against installed social-app versions; obfuscated TikTok layouts are particularly uncertain. The whole-app fallback is explicit.
- Alternate/lite/cloned/work-profile app packages are not automatically detected. Only the two listed TikTok regional packages share a rule.
- Accessibility can be revoked, killed, or disrupted by manufacturer battery controls. No claim of tamper resistance is made.
- iOS cannot selectively filter features inside other native apps. Family Controls distribution approval and a real device are needed.
- Device Activity callbacks are controlled by iOS and are not exact alarm clocks.
- Privacy statements describe the release app's code. Expo development tools connect to Metro and may use development tooling services; they are not the standalone production app.
- Uninstalling clears app-owned data but system permissions/Screen Time history are controlled by the OS.

The project includes no backend, tracking SDK, analytics pipeline, or account system.
