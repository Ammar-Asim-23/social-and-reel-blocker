import React from 'react';
import { Text, View } from 'react-native';
import { LockKeyhole } from 'lucide-react-native';
import { useTheme } from '../theme';
import { Button, Section, Tag, Toggle } from '../components';
import { useAppLock } from '../AppLock';
import { ios } from '../constants';
import type { AppController } from '../useAppController';
import { bridge } from '../native';
export function SettingsScreen({ controller }: { controller: AppController }) {
  const { s, C } = useTheme();
  const { setSheet, ready, status, working, saving, run, update } = controller;
  const lock = useAppLock();
  const { config } = controller;
  return (
    <>
      <View style={s.pageHeading}>
        <Text style={s.eyebrow}>SIMPLE BY DESIGN</Text>
        <Text style={s.title}>Peace of mind.</Text>
        <Text style={s.body}>Your boundaries. Your device. Your data.</Text>
      </View>
      <View style={s.privacyCard}>
        <LockKeyhole size={31} color={C.dark} />
        <Text style={s.subtitle}>Private, from the start.</Text>
        <Text style={s.body}>
          No accounts. No ads. No analytics. Your rules and daily totals stay on this device.
        </Text>
      </View>
      <Section title="Make it yours" />
      <View style={s.card}>
        <View style={s.policyRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Dark mode</Text>
            <Text style={s.small}>A softer screen after sunset.</Text>
          </View>
          <Toggle
            label="Dark mode"
            value={config.theme === 'dark'}
            disabled={saving}
            onChange={(v) => void update({ theme: v ? 'dark' : 'light' })}
          />
        </View>
        <View style={[s.policyRow, s.topBorder]}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>App lock</Text>
            <Text style={s.small}>
              {lock.available
                ? 'Require phone biometrics or passcode to reopen Unscroll.'
                : 'Available in the native phone app.'}
            </Text>
          </View>
          <Toggle
            label="App lock"
            value={lock.enabled}
            disabled={!lock.available || lock.busy || working}
            onChange={(v) => void run(() => lock.setEnabled(v))}
          />
        </View>
        <View style={[s.policyRow, s.topBorder]}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>Notifications</Text>
            <Text style={s.small}>
              {ios
                ? 'Notify when a boundary becomes active. iOS does not report each blocked opening.'
                : 'Notify after each successful Back or Home blocking action.'}
            </Text>
            {config.notifications && !status.notificationsAuthorized && (
              <Text style={s.inlineError}>Notifications are disabled in system settings.</Text>
            )}
          </View>
          <Toggle
            label="Blocking notifications"
            value={!!config.notifications}
            disabled={saving || working || !status.available}
            onChange={(v) =>
              void run(async () => {
                if (v) await bridge.requestNotifications();
                await update({ notifications: v });
              })
            }
          />
        </View>
      </View>
      <Section title="Protection status" />
      <View style={s.cardPadded}>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>{ios ? 'Screen Time access' : 'Accessibility service'}</Text>
          <Tag warm={!ready}>{ready ? 'Ready' : 'Needs setup'}</Tag>
        </View>
        <Text style={[s.body, { marginVertical: 16 }]}>
          {ios
            ? 'Family Controls and Device Activity shield selected apps. Apple keeps app selection private.'
            : 'Accessibility is optional and grants broad system access. Unscroll subscribes only to apps you select and stops inspecting when paused. No screen text, messages, images, or browsing history are saved.'}
        </Text>
        <Button title="Open permission setup" secondary onPress={() => setSheet('permission')} />
        {!ios && status.authorized && (
          <View style={{ marginTop: 12 }}>
            <Button
              title="Turn off Accessibility access"
              secondary
              disabled={working || saving}
              onPress={() =>
                void run(async () => {
                  if (await update({ enabled: false })) await bridge.revokeAuthorization();
                })
              }
            />
          </View>
        )}
      </View>
      <Section title="Good to know" />
      <View style={s.cardPadded}>
        <Text style={s.cardTitle}>Built for intention, not restriction.</Text>
        <Text style={[s.body, { marginTop: 9 }]}>
          Pause protection or change rules anytime. This is a personal focus tool, not a
          tamper-proof parental control.
        </Text>
        <Text style={[s.cardTitle, { marginTop: 22 }]}>Honest about the limits.</Text>
        <Text style={[s.body, { marginTop: 9 }]}>
          {ios
            ? 'iOS supports whole-app shielding only. Screen Time requires Apple entitlements and a signed device build. Usage totals are not exposed here.'
            : 'Selective blocking cannot work with ordinary app permissions alone. Keep Play Protect and your phone’s security protections enabled. If installation is blocked, use a reviewed distribution or report the exact warning; do not disable security to install Unscroll. App updates may require detector changes.'}
        </Text>
      </View>
      <View style={{ marginTop: 24 }}>
        <Button title="Reset all local data" secondary onPress={() => setSheet('reset')} />
      </View>
      <Text style={s.hint}>
        Unscroll 1.0.1 · Independently built. Not affiliated with any social platform.
      </Text>
    </>
  );
}
