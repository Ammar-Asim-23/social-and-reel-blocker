import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, Clock3, Minus, Plus, Shield, Smartphone, Sun } from 'lucide-react-native';
import { BlockMode } from '../model';
import { bridge } from '../native';
import { s, C } from '../styles';
import { AppIcon, Button, Section, feedNames } from '../components';
import { ios } from '../constants';
import type { AppController } from '../useAppController';
export function AppsScreen({ controller }: { controller: AppController }) {
  const { config, status, update, saving, openInstalledApps, appsLoading, working, run, used } =
    controller;
  return (
    <>
      <View style={s.pageHeading}>
        <Text style={s.eyebrow}>KEEP THE GOOD PARTS</Text>
        <Text style={s.title}>Your apps. Your terms.</Text>
        <Text style={s.body}>
          {ios
            ? 'Choose the apps you want to put boundaries around.'
            : 'Block the feed, keep the connection.'}
        </Text>
      </View>
      {ios ? (
        <View style={s.cardPadded}>
          <Smartphone color={C.dark} size={30} />
          <Text style={s.subtitle}>Whole-app protection</Text>
          <Text style={s.body}>
            Apple lets you shield entire apps. Selective Shorts, Reels, and Spotlight blocking is
            unavailable on iOS.
          </Text>
          <Text style={[s.cardTitle, { marginVertical: 20 }]}>
            {status.selectedApps} apps selected
          </Text>
          <Button
            disabled={working}
            title="Choose apps with Screen Time"
            onPress={() => void run(() => bridge.selectApps())}
          />
        </View>
      ) : (
        <>
          {config.apps.map((a) => (
            <View key={a.id} style={s.appControl}>
              <View style={s.appRow}>
                <AppIcon app={a} />
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{a.name}</Text>
                  <Text style={s.small}>{feedNames[a.id] || 'Full app protection'}</Text>
                </View>
                {a.mode !== 'off' && <Check size={18} color="#729564" />}
              </View>
              <View style={s.segment}>
                {(['off', ...(feedNames[a.id] ? ['selective'] : []), 'full'] as BlockMode[]).map(
                  (m) => (
                    <Pressable
                      key={m}
                      accessibilityRole="button"
                      accessibilityState={{ selected: a.mode === m }}
                      disabled={saving}
                      onPress={() =>
                        void update((c) => ({
                          ...c,
                          apps: c.apps.map((r) => (r.id === a.id ? { ...r, mode: m } : r)),
                        }))
                      }
                      style={[s.segmentOption, a.mode === m && s.segmentSelected]}
                    >
                      <Text style={[s.segmentText, a.mode === m && { color: C.ink }]}>
                        {m === 'off' ? 'Off' : m === 'selective' ? 'Short videos' : 'Entire app'}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            </View>
          ))}
          <Button
            title="Add an app to block"
            secondary
            disabled={appsLoading}
            onPress={openInstalledApps}
          />
          <Text style={s.hint}>
            App updates and languages can affect detection. TikTok detection is experimental. If a
            feed slips through, use Entire app. Test protection on your device.
          </Text>
        </>
      )}
      <Section title="When to protect" />
      <View style={s.card}>
        {(
          [
            {
              key: 'always',
              title: 'Always',
              desc: 'A standing boundary for selected apps.',
              icon: Shield,
            },
            {
              key: 'budget',
              title: 'After my daily allowance',
              desc: 'Enjoy a little. Then step away.',
              icon: Clock3,
            },
            {
              key: 'scheduled',
              title: 'During focus time',
              desc: 'Only during routines or a focus session.',
              icon: Sun,
            },
          ] as const
        ).map((o, i) => (
          <Pressable
            key={o.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: config.policy === o.key }}
            disabled={saving}
            onPress={() => void update({ policy: o.key })}
            style={[s.policyRow, i > 0 && s.topBorder]}
          >
            <o.icon size={21} color={C.dark} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{o.title}</Text>
              <Text style={s.small}>{o.desc}</Text>
            </View>
            <View style={[s.radio, config.policy === o.key && s.radioSelected]}>
              {config.policy === o.key && <View style={s.radioInner} />}
            </View>
          </Pressable>
        ))}
      </View>
      {config.policy === 'budget' && (
        <View style={s.allowance}>
          <Text style={s.cardTitle}>A shared daily allowance</Text>
          <Text style={s.small}>
            Combined {ios ? 'whole-app' : 'feed / full-app'} usage. Resets at midnight.
          </Text>
          <View style={s.stepper}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Decrease allowance"
              disabled={saving || config.dailyMinutes <= 5}
              onPress={() => void update({ dailyMinutes: Math.max(1, config.dailyMinutes - 5) })}
              style={s.stepButton}
            >
              <Minus size={20} color={C.ink} />
            </Pressable>
            <Text style={s.allowanceValue}>
              {config.dailyMinutes}
              <Text style={s.statUnit}> min / day</Text>
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Increase allowance"
              disabled={saving || config.dailyMinutes >= 180}
              onPress={() => void update({ dailyMinutes: Math.min(180, config.dailyMinutes + 5) })}
              style={s.stepButton}
            >
              <Plus size={20} color={C.ink} />
            </Pressable>
          </View>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: `${Math.min(100, (used / config.dailyMinutes) * 100)}%` },
              ]}
            />
          </View>
          <Text style={[s.small, { marginTop: 9 }]}>
            {ios
              ? 'Screen Time enforces your allowance privately.'
              : `${used} of ${config.dailyMinutes} minutes used today`}
          </Text>
        </View>
      )}
      <Text style={s.hint}>
        Enabled routines and focus sessions always take priority. The main protection switch must be
        on.
      </Text>
    </>
  );
}
