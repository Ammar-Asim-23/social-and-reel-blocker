import React from 'react';
import { Text, View } from 'react-native';
import { LockKeyhole } from 'lucide-react-native';
import { s, C } from '../styles';
import { Button, Section, Tag } from '../components';
import { ios } from '../constants';
import type { AppController } from '../useAppController';
export function SettingsScreen({ controller }: { controller: AppController }) {
  const { setSheet, ready } = controller;
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
      <Section title="Protection status" />
      <View style={s.cardPadded}>
        <View style={s.rowBetween}>
          <Text style={s.cardTitle}>{ios ? 'Screen Time access' : 'Accessibility service'}</Text>
          <Tag warm={!ready}>{ready ? 'Ready' : 'Needs setup'}</Tag>
        </View>
        <Text style={[s.body, { marginVertical: 16 }]}>
          {ios
            ? 'Family Controls and Device Activity shield selected apps. Apple keeps app selection private.'
            : 'Unscroll checks interface identifiers. It does not save screen text, messages, images, or browsing history.'}
        </Text>
        <Button title="Open permission setup" secondary onPress={() => setSheet('permission')} />
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
            : 'Unscroll redirects you out of feeds; it does not remove feed buttons. If protection stops, check Accessibility and battery settings. App updates may require detector changes.'}
        </Text>
      </View>
      <View style={{ marginTop: 24 }}>
        <Button title="Reset all local data" secondary onPress={() => setSheet('reset')} />
      </View>
      <Text style={s.hint}>
        Unscroll 1.0.0 · Independently built. Not affiliated with Shortstop or any social platform.
      </Text>
    </>
  );
}
