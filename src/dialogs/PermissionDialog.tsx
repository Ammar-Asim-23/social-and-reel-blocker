import React from 'react';
import { Text, View } from 'react-native';
import { LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { bridge, nativeUnavailableMessage } from '../native';
import { useTheme } from '../theme';
import { Button } from '../components';
import { ios } from '../constants';
import type { AppController } from '../useAppController';
export function PermissionDialog({ controller }: { controller: AppController }) {
  const { s, C } = useTheme();
  const { status, update, saving, working, run, ready, closeAfter } = controller;
  if (!status.available)
    return (
      <>
        <ShieldCheck size={36} color={C.dark} />
        <Text style={s.modalTitle}>Protection is unavailable.</Text>
        <Text accessibilityRole="alert" style={s.body}>
          {nativeUnavailableMessage}
        </Text>
      </>
    );
  return (
    <>
      <ShieldCheck size={36} color={C.dark} />
      <Text style={s.modalTitle}>{ios ? 'Connect Screen Time.' : 'Turn on protection.'}</Text>
      <Text style={s.body}>
        {ios
          ? 'Allow Screen Time, then choose apps to shield. Apple only supports blocking entire apps.'
          : 'Selective blocking requires optional Accessibility access. Unscroll checks interface identifiers and selected navigation labels in apps you choose, then uses Back or Home when your rules apply. Android grants broad access; our service limits its event subscriptions to selected apps and stops inspection when paused.'}
      </Text>
      <View style={s.disclosure}>
        <LockKeyhole size={20} color={C.dark} />
        <Text style={[s.body, { flex: 1 }]}>
          No screen content or messages are saved or transmitted. Only settings, today’s totals, and
          interruption counts stay locally. Revoke access anytime in system settings.
        </Text>
      </View>
      {!ios && (
        <View style={{ marginTop: 12 }}>
          <Button
            title="Continue without blocking"
            secondary
            disabled={saving || working}
            onPress={() => void update({ enabled: false, onboarded: true }).then(closeAfter)}
          />
          <Text style={s.hint}>
            You can use the focus timer and plan routines without granting access. They cannot block
            other apps without permission. Keep Play Protect and device security protections on.
          </Text>
        </View>
      )}
      <Text style={[s.small, { marginBottom: 20 }]}>
        {ios
          ? 'App selection is handled by Apple’s private picker.'
          : 'Choosing Agree and open settings means you consent to this use of Accessibility. Select Unscroll protection and enable it on the next screen.'}
      </Text>
      <Button
        title={ios ? 'Allow Screen Time' : 'Agree and open settings'}
        disabled={working}
        onPress={() => void run(() => bridge.authorize())}
      />
      {ios && (
        <View style={{ marginTop: 10 }}>
          <Button
            title="Choose apps"
            secondary
            disabled={working || !status.authorized}
            onPress={() => void run(() => bridge.selectApps())}
          />
        </View>
      )}
      <View style={{ marginTop: 12 }}>
        <Button
          title="I’m ready — enable protection"
          disabled={!ready || saving}
          onPress={() => void update({ enabled: true, onboarded: true }).then(closeAfter)}
        />
      </View>
    </>
  );
}
