# Unscroll

An independent React Native / Expo app for intentional social-media use. No account, analytics, server, or subscription. The Play Store description supplied for this project is the feature brief; this project does not use Shortstop's code or assets.

**Status: implemented development prototype, not a device-certified release.** The React Native interface, persistence, rule tests, web bundle, Android project generation, native autolinking, and iOS extension configuration have been checked. Native Kotlin/Swift compilation and actual blocking on phones have **not** been verified in this Windows environment (no Android SDK/JDK or Xcode). No APK or IPA has been produced. Follow the device checklist before relying on protection.

## Platform capabilities

| Feature                           | Android                                                                                    | iOS 17.4+                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Shorts / Reels / Spotlight only   | Accessibility detector and Back/Home enforcement implemented; needs real-device validation | Not available through Apple's public APIs                         |
| TikTok videos only                | Experimental detector; unknown/obfuscated layouts may be missed                            | Not available                                                     |
| Block entire apps                 | Launcher-app picker and native enforcement                                                 | Family Activity picker + Managed Settings shield                  |
| Shared daily allowance            | Combined detected feed time and time in apps selected for full blocking                    | Combined whole-app usage, enforced by Device Activity             |
| Weekly / overnight routines       | Native service evaluates local time                                                        | Device Activity monitor extension                                 |
| 15/25/45/60-minute focus sessions | Native service                                                                             | Native shield + monitor extension                                 |
| Daily statistics                  | On-device totals and interruption count                                                    | Selected-app count; numeric usage is intentionally not fabricated |
| Offline settings                  | Android private preferences                                                                | Shared App Group preferences                                      |

**An exact selective-blocking clone on iOS is not possible with these public APIs.** The iOS UI explains this instead of presenting nonfunctional Reels/Shorts switches. Android redirects out of detected feeds; it does not remove the social apps' buttons. Selective detection is heuristic and may need updating when those apps change their interfaces. No tested third-party app versions are claimed yet.

## Run the interface

See the [screen design gallery](docs/UI_GALLERY.md) for eight images of the implemented interface.

Requirements: Node 22 LTS or newer and pnpm. Dependencies are pinned in `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm web
```

Web and Expo Go are **preview only** and cannot inspect or block other apps. The UI labels them accordingly. The preview stores settings in browser storage; real installations start with protection paused and consent is required before enabling permissions.

### APK reports a missing protection module

An earlier ignore rule (`android/` and `ios/`) excluded the native module's source folders from EAS uploads, allowing an APK with no protection module. The rules now use `/android/` and `/ios/` to exclude only generated root projects. `modules/unscroll/android` and `modules/unscroll/ios` must remain in source control and build uploads. Do not restore the unanchored rules.

Rebuild and install the new APK; changing permissions or reloading JavaScript cannot repair an old binary:

```sh
npx eas-cli@latest build --platform android --profile preview --clear-cache
```

The `eas-build-post-install` hook checks native source presence and Expo autolinking before compilation. Run `pnpm check:native` locally for the same check. This does not replace native compilation or device testing. Once the module is available, permission setup opens Android Accessibility settings and Add an app to block loads installed launcher apps. Search, then tap **Add** beside the result. Already configured apps are omitted from this picker.

Deprecation warnings printed while downloading EAS CLI are separate from missing native sources. They are not Android permission errors. Do not force unrelated major-version overrides into the app to silence CLI warnings.

## Android development build

Install Android Studio, an Android SDK, and JDK 17. Enable USB debugging on a test phone or configure an emulator. Device testing with the actual social apps is strongly recommended.

```sh
pnpm install --frozen-lockfile
pnpm android
```

`expo run:android` generates the native project and includes the local module. In Unscroll, open **Settings → Open permission setup**, read the disclosure, then choose **Agree and open settings**. Enable **Unscroll protection**, return to the app, and enable protection. Android may require you to manually allow restricted settings for a sideloaded accessibility service. Unscroll cannot grant itself these permissions.

For a standalone APK after SDK setup:

```sh
pnpm exec expo prebuild --platform android
cd android
# Windows: gradlew.bat assembleRelease
./gradlew assembleRelease
```

Configure your own production signing before distribution. The Expo template's default development signing is not a release identity. Alternatively, `pnpm dlx eas-cli build --platform android --profile preview` creates an internally distributed APK using your Expo account. Cloud builds upload project source and are not run automatically by this project.

Native rule tests after prebuild:

```sh
cd android
./gradlew :unscroll-native:testDebugUnitTest
```

## iOS development build

Use a Mac with Xcode, CocoaPods, and an Apple developer account, or an EAS build from Windows. The minimum deployment target is 17.4 to include earlier activity in a daily Device Activity threshold.

1. Set a bundle identifier you own in `app.config.js` before your first signed build.
2. Register the app and `<bundle identifier>.monitor`. Enable **Family Controls** for both identifiers and **App Groups** for `group.<bundle identifier>`.
3. For TestFlight/App Store distribution, obtain Apple's Family Controls distribution entitlement for **both** targets. Development entitlements alone do not grant distribution access.
4. Run `pnpm ios` on a Mac. The config plugin generates and embeds `UnscrollMonitor`, adds sources and entitlements, and sets deployment targets. Choose the correct signing team for the app and extension in Xcode.
5. On a physical iPhone, authorize individual Screen Time access, select individual apps in Apple's picker, and enable protection. Categories and websites are intentionally excluded.

```sh
# Cloud alternative; requires your own Expo/Apple accounts and entitlements:
pnpm dlx eas-cli build --platform ios --profile development
```

The extension uses named Managed Settings storage, App Group preferences, and at most seven monitors (five routines, one daily allowance, one focus session). Overlapping rules are recomputed together so ending one routine does not cancel another. OS scheduling can delay callbacks; test end-of-session release on a real device. iOS uses today's Screen Time usage, including usage before Unscroll was enabled; Android only counts usage observed while its service and protection were enabled. These semantics are different and intentional.

## Rule behavior

- The main switch pauses all enforcement. Turning it back on reapplies current rules.
- **Always** blocks selected feeds/apps whenever detected.
- **After my daily allowance** allows a shared number of minutes, then blocks until local midnight.
- **During focus time** blocks only during enabled weekly routines or an active focus session.
- Routines and focus sessions override a remaining daily allowance in all policies.
- An overnight routine belongs to its starting day. A Monday 22:00–07:00 routine ends Tuesday morning.
- Full-app selections use the same policy and count whole-app time in the shared allowance.
- Ending a focus session preserves other active rules. Pausing does not reset usage.
- Android retains only today's totals; no screen content, posts, messages, or detailed activity history is retained. On iOS the OS owns usage accounting, so resetting Unscroll does not erase Screen Time's usage for today.

## Checks

```sh
pnpm typecheck
pnpm test
pnpm export:web
pnpm exec expo export --platform android --platform ios
```

`scripts/check-ios-plugin.cjs <path-to-an-Expo-template-project.pbxproj>` smoke-tests the Xcode config plugin, including idempotence, embedding, source membership, entitlements, and project serialization. It does not compile Swift. `.github/workflows/native-checks.yml` provides Android and iOS compilation checks for a future GitHub repository; no remote CI has been run.

See [device acceptance tests](docs/DEVICE_TESTS.md) and [architecture and privacy](docs/ARCHITECTURE.md). Passing JavaScript tests or opening a web preview does not prove native enforcement.

## Source map

- `src/screens/`, `src/dialogs/`: separate feature screens and modal flows.
- `src/useAppController.ts`, `src/useProtection.ts`: UI orchestration and serialized persistence.
- `src/model.ts`, `src/serialQueue.ts`: domain rules, validation, and mutation ordering.
- `src/components.tsx`, `src/styles.ts`: shared UI primitives and design tokens.
- `src/native.ts`: platform bridge and preview-only storage fallback.
- `modules/unscroll/android/`: Accessibility service, feed detectors, rule engine, daily accounting, native bridge.
- `modules/unscroll/ios/`: Screen Time authorization, picker, shared rule evaluation and monitor registration.
- `modules/unscroll/extension/`: Device Activity extension entry point.
- `plugins/withUnscroll.js`: native project integration and Apple entitlements.

Generated `android/` and `ios/` directories are ignored. Edit the local module and config plugin, then regenerate; do not put lasting changes only in generated files.

See [security review notes](SECURITY.md) for validation, bounded resource use, and the three unresolved upstream tooling advisories. This project does not claim a clean dependency audit or security certification.

References: [Android AccessibilityService](https://developer.android.com/reference/android/accessibilityservice/AccessibilityService), [Apple Family Controls](https://developer.apple.com/documentation/familycontrols), [Managed Settings](https://developer.apple.com/documentation/managedsettings), [Device Activity](https://developer.apple.com/documentation/deviceactivity), [Expo local native modules](https://docs.expo.dev/modules/get-started/).
