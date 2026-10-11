import React from 'react';
import { Text, View } from 'react-native';
import { LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { bridge } from '../native';
import { s, C } from '../styles';
import { Button } from '../components';
import { ios } from '../constants';
import type { AppController } from '../useAppController';
export function PermissionDialog({ controller }: { controller: AppController }) {
  const { status, update, saving, working, run, ready, closeAfter } = controller;
  return (
    <>
      <ShieldCheck size={36} color={C.dark} />
      <Text style={s.modalTitle}>{ios ? 'Connect Screen Time.' : 'Turn on protection.'}</Text>
      <Text style={s.body}>
        {ios
          ? 'Allow Screen Time, then choose apps to shield. Apple only supports blocking entire apps.'
          : 'Unscroll needs Accessibility access to inspect interface identifiers in selected apps and recognize short-video screens. When a rule applies, it uses Back or Home to leave the feed.'}
      </Text>
      <View style={s.disclosure}>
        <LockKeyhole size={20} color={C.dark} />
        <Text style={[s.body, { flex: 1 }]}>
          No screen content or messages are saved or transmitted. Only settings, today’s totals, and
          interruption counts stay locally. Revoke access anytime in system settings.
        </Text>
      </View>
      <Text style={[s.small, { marginBottom: 20 }]}>
        {ios
          ? 'App selection is handled by Apple’s private picker.'
          : 'By continuing, you consent to this use of Accessibility. Select Unscroll protection and enable it on the next screen.'}
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
