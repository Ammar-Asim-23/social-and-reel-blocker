import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Focus, Sun } from 'lucide-react-native';
import { timeLabel } from '../model';
import { s, C } from '../styles';
import { Button, Section, Tag, Toggle } from '../components';
import { fullDays } from '../constants';
import type { AppController } from '../useAppController';
export function RoutinesScreen({ controller }: { controller: AppController }) {
  const { config, update, saving, setSheet, focused, openSchedule } = controller;
  return (
    <>
      <View style={s.pageHeading}>
        <Text style={s.eyebrow}>MAKE SPACE, AUTOMATICALLY</Text>
        <Text style={s.title}>Find your rhythm.</Text>
        <Text style={s.body}>A quieter morning. A deeper workday. A better night.</Text>
      </View>
      <View style={s.routineHero}>
        <View style={s.rowBetween}>
          <Focus size={30} color={C.dark} />
          <Tag>{focused ? 'In progress' : 'One thing at a time'}</Tag>
        </View>
        <Text style={s.subtitle}>
          {focused ? 'You’ve made room for focus.' : 'Right here. Right now.'}
        </Text>
        <Text style={s.body}>
          {focused
            ? `${Math.ceil((config.focusUntil - Date.now()) / 60000)} minutes remaining.`
            : 'Protect your attention for the next 15, 25, 45, or 60 minutes.'}
        </Text>
        <View style={{ marginTop: 20 }}>
          <Button
            title={focused ? 'Manage focus session' : 'Start a focus session'}
            onPress={() => setSheet('focus')}
          />
        </View>
      </View>
      <Section title="Weekly routines" detail={`${config.schedules.length} / 5`} />
      {!config.schedules.length && (
        <View style={s.emptyCard}>
          <Sun size={32} color="#A4AE92" />
          <Text style={s.subtitle}>Good habits need a little room.</Text>
          <Text style={[s.body, { textAlign: 'center' }]}>
            Add a routine to protect the moments that matter, every week.
          </Text>
        </View>
      )}
      {config.schedules.map((r) => (
        <View key={r.id} style={s.routineCard}>
          <View style={s.rowBetween}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Edit ${r.name}`}
              onPress={() => openSchedule(r)}
              style={{ flex: 1 }}
            >
              <Text style={s.cardTitle}>{r.name}</Text>
              <Text style={s.routineTime}>
                {timeLabel(r.start)} — {timeLabel(r.end)}
                {r.end < r.start ? ' (+1 day)' : ''}
              </Text>
              <Text style={s.small}>{r.days.map((d) => fullDays[d].slice(0, 3)).join(' · ')}</Text>
            </Pressable>
            <Toggle
              label={`Enable ${r.name}`}
              disabled={saving}
              value={r.enabled}
              onChange={(v) =>
                void update((c) => ({
                  ...c,
                  schedules: c.schedules.map((s) => (s.id === r.id ? { ...s, enabled: v } : s)),
                }))
              }
            />
          </View>
        </View>
      ))}
      <Button
        title="Add a routine"
        secondary
        disabled={config.schedules.length >= 5}
        onPress={() => openSchedule()}
      />
      <Text style={s.hint}>
        Routines use local time. For overnight routines, select the days they start.
      </Text>
    </>
  );
}
