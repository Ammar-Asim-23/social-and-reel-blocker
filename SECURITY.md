# Security and maintainability notes

This is a development prototype, not an audited or certified security product. Native compilation and physical-device testing remain release gates.

## Boundaries

- No accounts, backend, advertising SDK, analytics, embedded secrets, or application network calls.
- Android's exported accessibility service requires the system signature permission `BIND_ACCESSIBILITY_SERVICE`; ordinary third-party apps cannot bind to it.
- Accessibility access is opt-in, explained before opening system settings, and used only to inspect relevant UI identifiers and selected navigation labels. Screen content is never logged or persisted.
- Both native bridges independently validate configuration; the TypeScript validator is not the only check. Schema version, types, lengths, unique IDs, package syntax, ranges, and rule counts are bounded.
- The Android bridge rejects attempts to block Unscroll, Android Settings, or the launcher. The UI picker omits those apps.
- Corrupt native configuration produces no blocking rules. A failed UI load cannot silently overwrite the stored configuration; the user must reset local data to recover.
- Settings mutations and resets share a serial queue. Failed writes do not poison the queue, drop later actions, or falsely update the UI.
- Status polling is bounded, skips background/inactive states, and cleans up subscriptions. Android detection traverses no more than 500 visible nodes per inspection. Validated native configuration is cached until it changes.
- iOS app tokens remain in the native App Group and never enter JavaScript. App and extension use the same Swift policy implementation.
- The app is not tamper-proof. OS permissions, battery policies, force-stop, uninstallation, and interface changes can defeat protection.

## Maintainability

Screens, dialogs, shared UI primitives, design tokens, controller state, domain validation/rules, serial mutation handling, and platform bridges are separate modules. TypeScript enables strict types, unused-code checks, and complete-return checks. Lockfiles, formatting rules, rule tests, mutation-order tests, native tests, and CI build recipes are included. Generated native projects are disposable outputs of the config plugin.

Scaling this app means adding tested detector strategies and platform capabilities, not moving private activity to a server. Treat changes to package IDs, detector anchors, event types, entitlements, and background scheduling as behavior changes requiring the device acceptance matrix. The 100-app and 5-routine caps prevent unbounded configuration and stay under platform monitoring limits.

## Dependency audit — October 11, 2026

The registry audit initially reported four transitive advisories. The Xcode generator's `uuid` dependency is overridden to patched version 11.1.1; its v4 usage and project generation were rechecked. Three advisories remain without published fixes in the registry at this check:

| Dependency | Severity | Dependency path / exposure |
| --- | --- | --- |
| [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | High | Expo CLI certificate/signing tooling |
| [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | High | Metro and Jest build-time glob processing |
| [sprintf-js](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | Moderate | Jest coverage configuration tooling |

These observed dependency paths are build/development tooling; Unscroll's application code does not call them or expose user-supplied globs, format strings, or certificates. That limits the apparent application attack surface, but does not establish absence of risk. Keep development servers local, build trusted source, and resolve or explicitly review these findings before public release. The audit is not suppressed or claimed clean. Run `pnpm audit --prod` for current findings.

## Release checks

Compile Kotlin and Swift in CI and on supported devices; test the current social-app versions and languages; validate accessibility disclosure and store declarations; obtain Apple's distribution entitlements; use your own signing identities; run a fresh dependency audit; and complete the device checklist. CI configuration alone does not prove that a build has passed.

If a security issue is found, keep any screen captures or device logs private and remove personal content before sharing. There is no public security-reporting address configured for this local project.
