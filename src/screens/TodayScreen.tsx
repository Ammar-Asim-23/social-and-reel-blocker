import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  ArrowUpRight,
  ChevronRight,
  Clock3,
  EyeOff,
  Focus,
  Leaf,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react-native';
import { bridge } from '../native';
import { useTheme } from '../theme';
import { AppIcon, Section, Tag, Toggle, feedNames } from '../components';
import { ios } from '../constants';
import type { AppController } from '../useAppController';
export function TodayScreen({ controller }: { controller: AppController }) {
  const { s, C } = useTheme();
  const {
    config,
    status,
    update,
    saving,
    setTab,
    setSheet,
    run,
    selected,
    ready,
    enabled,
    reason,
    focused,
    used,
  } = controller;
  return (
    <>
      <View style={s.pageHeading}>
        <Text style={s.eyebrow}>YOUR ATTENTION, BACK IN YOUR HANDS</Text>
        <Text style={s.title}>A little more present.</Text>
        <Text style={s.body}>Small boundaries. More space for real life.</Text>
      </View>
      <View style={s.hero}>
        <View style={s.rowBetween}>
          <Tag warm={!enabled}>
            {enabled
              ? 'Protection is on'
              : config.enabled
                ? 'Setup needed'
                : 'Protection is paused'}
          </Tag>
          <ShieldCheck size={22} color={C.dark} />
        </View>
        <View style={s.heroMiddle}>
          <View style={s.orbitOuter}>
            <View style={s.orbitInner}>
              <View style={s.orbitCore}>
                <Leaf size={40} strokeWidth={1.4} color={C.dark} />
              </View>
            </View>
            <View style={s.orbitSpark}>
              <Sparkles size={16} color={C.dark} />
            </View>
            <View style={s.orbitDot} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>
              {enabled ? 'Less noise. More you.' : 'Your focus starts here.'}
            </Text>
            <Text style={s.heroCaption}>
              {enabled
                ? reason ||
                  (config.policy === 'scheduled'
                    ? 'Ready for your next focus time.'
                    : 'Your allowance is open.')
                : 'Turn a good intention into a daily habit.'}
            </Text>
          </View>
        </View>
        <View style={s.heroBottom}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{ios ? 'App protection' : 'Short-video protection'}</Text>
            <Text style={s.small}>
              {ios
                ? `${status.selectedApps} apps selected`
                : `${selected.length} apps · your rules, your pace`}
            </Text>
          </View>
          <Toggle
            label="Enable protection"
            value={config.enabled}
            disabled={saving}
            onChange={(v) => {
              if (v && !ready && status.available) setSheet('permission');
              else void update({ enabled: v });
            }}
          />
        </View>
      </View>
      {status.available && !ready && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setSheet('permission')}
          style={s.setupCard}
        >
          <Shield size={22} color={C.ink} />
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>One step to protection</Text>
            <Text style={s.small}>
              {ios
                ? 'Allow Screen Time and choose your apps.'
                : 'Enable Unscroll in Accessibility settings.'}
            </Text>
          </View>
          <ChevronRight size={19} color={C.ink} />
        </Pressable>
      )}
      <View style={s.statsRow}>
        <View style={[s.stat, { backgroundColor: C.soft }]}>
          <View style={s.rowBetween}>
            <Clock3 size={19} color={C.muted} />
            <Text style={s.eyebrow}>TODAY</Text>
          </View>
          <Text style={s.statNumber}>
            {status.usedSeconds === null ? 'Private' : used}
            <Text style={s.statUnit}>{status.usedSeconds === null ? '' : ' min'}</Text>
          </Text>
          <Text style={s.small}>
            {ios ? 'Usage managed by Screen Time' : 'In selected feeds / blocked apps'}
          </Text>
        </View>
        <View style={[s.stat, { backgroundColor: C.warm }]}>
          <View style={s.rowBetween}>
            <EyeOff size={19} color={C.muted} />
            <Leaf size={16} color={C.muted} />
          </View>
          <Text style={s.statNumber}>{ios ? status.selectedApps : status.interruptions}</Text>
          <Text style={s.small}>
            {ios ? 'Apps chosen for protection' : 'Scrolling interruptions today'}
          </Text>
        </View>
      </View>
      <Section title="Your boundaries" detail="Manage →" onPress={() => setTab('Apps')} />
      <View style={s.card}>
        {ios ? (
          <Pressable onPress={() => void run(() => bridge.selectApps())} style={s.appRow}>
            <Smartphone size={24} color={C.ink} />
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>Your selected apps</Text>
              <Text style={s.small}>Whole-app boundaries on iOS</Text>
            </View>
            <ChevronRight size={18} color={C.muted} />
          </Pressable>
        ) : (
          config.apps.slice(0, 4).map((a, i) => (
            <Pressable
              key={a.id}
              onPress={() => setTab('Apps')}
              style={[s.appRow, i > 0 && s.topBorder]}
            >
              <AppIcon app={a} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle}>{a.name}</Text>
                <Text style={s.small}>{a.mode === 'full' ? 'Entire app' : feedNames[a.id]}</Text>
              </View>
              <Text style={[s.appState, a.mode === 'off' && { color: C.muted }]}>
                {a.mode === 'off' ? 'Off' : 'Selected'}
              </Text>
              <ChevronRight size={16} color={C.muted} />
            </Pressable>
          ))
        )}
      </View>
      <Pressable accessibilityRole="button" onPress={() => setSheet('focus')} style={s.focusCard}>
        <View style={s.focusIcon}>
          <Focus size={27} color={C.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.cardTitle, { color: 'white' }]}>
            {focused
              ? `${Math.ceil((config.focusUntil - Date.now()) / 60000)} min of focus left`
              : 'A moment of uninterrupted you'}
          </Text>
          <Text style={s.focusCaption}>
            {focused
              ? enabled
                ? 'Your selected boundaries are active.'
                : 'Session saved. Protection needs setup or is paused.'
              : 'Start a focus session. Let the feeds wait.'}
          </Text>
        </View>
        <ArrowUpRight size={22} color={C.green} />
      </Pressable>
      <View style={s.footerNote}>
        <Leaf size={14} color={C.muted} />
        <Text style={s.footerText}>Your time is yours. Spend it intentionally.</Text>
      </View>
    </>
  );
}
