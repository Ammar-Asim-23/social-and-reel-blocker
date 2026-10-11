# Device acceptance checklist

No physical-device acceptance tests have been completed yet. Record the phone, OS, app version, app language, date, result, and evidence for every test. Do not market selective detection as verified until this matrix passes on the supported versions.

## Android

1. Fresh install: service disabled, master switch off, no fabricated usage. Declining permission keeps the app usable. A missing service never shows protection as active.
2. Agree to the disclosure, enable the service, return, and enable protection. Verify status updates after background/foreground transitions. Revoke access and verify status changes back.
3. For each app, test navigation into and out of the short feed from every entry point: tab, search result, link, profile, and shared video. Test YouTube long-form player, subscriptions, music, Instagram DMs/stories/posts/search, Snapchat chat/stories, and TikTok inbox/profile separately. None of those should be blocked in selective mode unless actually viewing a targeted short-video feed.
4. Leave a video playing without touching the screen: the daily allowance must still advance and enforce when exhausted. Switch apps, open the notification shade, lock the device, or background the app: off-screen time must not accumulate. Pause protection and verify counting/enforcement stops.
5. Use two selected apps against the same allowance. At the exact threshold both should block. Turn one app Off and verify that app is free. Test the regional TikTok package if supported.
6. Set an app to Entire app and repeat under Always, daily allowance, and scheduled-only policies. Test a third-party app added from the launcher picker. The launcher, Android Settings, and Unscroll must not appear as additions.
7. Test same-day, overnight, Sunday-to-Monday, disabled-day, overlapping, and edited/deleted routines. Start a 15-minute focus session and verify both automatic expiration and early cancellation.
8. Restart Unscroll, swipe it away, reboot, change time zone, cross midnight, and test the device manufacturer's battery restrictions. Force-stopping or disabling an accessibility service can defeat protection; verify the UI reports it honestly after returning.
9. Use non-English interfaces, split screen, picture-in-picture, large fonts, and app updates. Record missed detections and false positives. Do not broaden detection to arbitrary screen text to compensate.
10. Reset all local data. Confirm immediate release, zero totals, no configured routines, and master switch off. Confirm no account, analytics request, screen-text logging, or message content in storage/logcat.

| Feed               | App version / language | Detected feed | Non-feed features preserved | Status       |
| ------------------ | ---------------------- | ------------- | --------------------------- | ------------ |
| YouTube Shorts     | Not tested             | Not tested    | Not tested                  | Unverified   |
| Instagram Reels    | Not tested             | Not tested    | Not tested                  | Unverified   |
| Snapchat Spotlight | Not tested             | Not tested    | Not tested                  | Unverified   |
| TikTok feed        | Not tested             | Not tested    | Not tested                  | Experimental |

Identifiers in `FeedDetector.kt` are conservative candidate anchors, not a guarantee of support for every current app build. Confirm actual IDs and selection semantics on a test device. Keep any temporary UI captures local, avoid capturing private messages, and do not commit captures containing personal content.

## iOS

1. Compile and sign both app and monitor extension with matching Family Controls and App Group entitlements. Test on a physical device. Verify the `.appex` is embedded.
2. Deny, allow, revoke, and restore individual authorization. Confirm correct UI status. Cancel the app picker without modifying the selection; choose multiple individual apps and persist across a restart.
3. Enable Always and verify full-app shields. Confirm the UI never advertises selective Reels/Shorts blocking. Disable the master switch and verify shields disappear.
4. In allowance mode, use two apps until their combined whole-app threshold is reached. Verify earlier usage today is included. Increase and decrease the allowance, change app selection, pause/re-enable, restart, and cross midnight. Verify a threshold reached for an old selection does not persist incorrectly.
5. Test routines on included and excluded weekdays, overnight intervals, Sunday rollover, and overlapping routines. Close the host app for all boundary tests. Verify that ending one active rule does not remove another rule's shield.
6. Start a 15-minute session. Change a setting near its end (less than 15 minutes remaining) and confirm monitoring can still register. Verify automatic release, early cancellation, and cancellation while another routine remains active.
7. Reboot, change time zone, and cross daylight-saving transitions. Record callback latency rather than assuming exact timers. Confirm rules still apply when the host application has been terminated.
8. Reset Unscroll and verify monitors stop and shields clear. OS Screen Time usage remains outside Unscroll's control.

## Release gates

Passing web tests is insufficient. Native compilation, device testing, signed distribution entitlements, Play Accessibility API declarations/disclosure review, and a public privacy policy must be completed before public distribution. No store-policy approval is implied by this repository.
