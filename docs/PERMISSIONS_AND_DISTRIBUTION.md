# Permissions and distribution

## What selective blocking needs

On Android, this implementation needs Accessibility to recognize feeds inside other apps and leave them using Back/Home. Normal app permissions, Usage Access, DNS filtering, and a VPN do not provide the same feed-level controls while preserving messages and other features. There is no permission-free equivalent in this implementation. On iOS, Apple's Screen Time APIs support whole-app controls only.

Accessibility is optional: the app can save rules and run its visible focus timer without it, but cannot enforce blocking. Protection starts paused. Setup offers Continue without blocking, and Android Settings in Unscroll offers Turn off Accessibility access. Pausing stops inspection; disconnecting also revokes the service grant. Access can always be revoked in system settings.

## Limits implemented in the service

- Event subscriptions contain only apps with enabled rules (including TikTok's regional alias). A nonmatching sentinel and zero event types are used when paused; an empty package list would unintentionally subscribe to all packages.
- No root-window retrieval while paused, and no traversal of unrelated app trees. Active-window package metadata is checked before any feed detection. Package filtering does not change the broad capability shown by Android's permission dialog.
- Only the active window is inspected. Interactive-window enumeration, gestures, screenshots, overlays, notification access, VPN, and device administration are not requested.
- The release configuration explicitly removes unused overlay, media/storage, audio recording, camera, package installation and all-package-query permissions. CI inspects the built release APK so transitive permissions cannot silently return.
- The service retains today's totals and configuration, not messages or screen content. `isAccessibilityTool` stays false: this is a focus tool, not a disability-assistance tool.

## Play Protect and installation blocks

Do not disable Play Protect, Samsung Auto Blocker, or similar device protections to install Unscroll. Declaring Accessibility can trigger a sensitive-permission installation block for internet-sideloaded APKs in some markets even before the user grants it. An unfamiliar-app scan prompt and an actual harmful-app detection are different cases; record the exact warning text before choosing a remedy.

The warning reported on October 12, 2026 mentions an unfamiliar developer and risk of identity theft or financial fraud from sensitive access. The latter matches Google's documented internet-sideloading sensitive-permission block. Accessibility is the likely trigger for this app; the reported text alone is not evidence of a malware finding and does not establish that the APK is safe. Restricting event subscriptions or leaving Accessibility off will not remove its declaration from the APK, so those changes do not guarantee clearing this installation block.

`app.unscroll.focus.MainApplication` is the app's Android Application class name. The generated manifest has a separate display label set to Unscroll. Renaming that class or the package is not a remedy for a Play Protect classification. Inspect the exact signed APK if its visible label differs from the generated configuration.

Use a stable signing identity and a Google Play internal/closed testing track for wider testing, with the required Accessibility declaration, prominent disclosure, privacy policy, and review. This is a distribution path, not a guarantee that Google will approve the app or clear a warning. For an erroneous harmful-app classification, inspect the exact signed APK and dependencies and use Google's appeal process. Never hide the service, mislabel it as an accessibility tool, or bypass restricted-settings controls.

References: [Android AccessibilityService](https://developer.android.com/reference/android/accessibilityservice/AccessibilityService), [Google Play Protect developer warning guidance](https://developers.google.com/android/play-protect/warning-dev-guidance), [Google Play AccessibilityService policy](https://support.google.com/googleplay/android-developer/answer/10964491).

## CI fixes from run 38168603987

The iOS failure was in ExpoModulesCore under Xcode 16.4 (including unsupported isolated-conformance syntax and actor errors). Expo SDK 55 requires Xcode 26.2+. The workflow explicitly selects the installed Xcode 26.2 on macos-15; compiler checks have not been disabled. Android failed because setup-android v3 requested the removed `tools` SDK package. Its replacement installs `platform-tools`.

All setup actions now use Node 24 runtime versions, pinned to verified commit hashes. Ubuntu is pinned to 24.04 to avoid the announced runner migration. The macOS capacity notice is infrastructure-related and cannot be eliminated by app code. Build logs and iOS result bundles are retained on failures. A new CI run is required to confirm native compilation with these changes.
