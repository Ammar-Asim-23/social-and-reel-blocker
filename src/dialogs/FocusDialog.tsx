import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Focus } from 'lucide-react-native';
import { s, C } from '../styles';
import { Button } from '../components';
import type { AppController } from '../useAppController';
export function FocusDialog({ controller }: { controller: AppController }) {
  const {
    config,
    status,
    update,
    saving,
    setSheet,
    minutes,
    setMinutes,
    ready,
    focused,
    closeAfter,
  } = controller;
  return (
    <>
      <Focus size={36} color={C.dark} />
      <Text style={s.modalTitle}>
        {focused ? 'Stay with what matters.' : 'Give yourself a moment.'}
      </Text>
      <Text style={s.body}>
        {focused
          ? `${Math.ceil((config.focusUntil - Date.now()) / 60000)} minutes remaining. End this session anytime.`
          : 'Selected feeds or apps will be blocked even if you have daily allowance left.'}
      </Text>
      {!focused && (
        <View style={s.durationRow}>
          {[15, 25, 45, 60].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityState={{ selected: n === minutes }}
              onPress={() => setMinutes(n)}
              style={[s.duration, n === minutes && { backgroundColor: C.green }]}
            >
              <Text style={s.cardTitle}>{n}</Text>
              <Text style={s.small}>min</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ marginTop: 24 }}>
        <Button
          title={focused ? 'End focus session' : `Begin ${minutes} minutes of focus`}
          disabled={saving}
          onPress={() => {
            if (!focused && !ready && status.available) {
              setSheet('permission');
              return;
            }
            void update({
              enabled: focused ? config.enabled : true,
              focusUntil: focused ? 0 : Date.now() + minutes * 60000,
            }).then(closeAfter);
          }}
        />
      </View>
      {focused && (
        <Text style={s.hint}>Ending a session leaves other protection rules in place.</Text>
      )}
    </>
  );
}
