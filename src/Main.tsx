import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  Clock3,
  Home,
  Leaf,
  LockKeyhole,
  Settings2,
  Shield,
  Smartphone,
  X,
} from 'lucide-react-native';
import { s, C } from './styles';
import { Button } from './components';
import { ios } from './constants';
import { useAppController } from './useAppController';
import { TodayScreen } from './screens/TodayScreen';
import { AppsScreen } from './screens/AppsScreen';
import { RoutinesScreen } from './screens/RoutinesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PermissionDialog } from './dialogs/PermissionDialog';
import { FocusDialog } from './dialogs/FocusDialog';
import { ScheduleDialog } from './dialogs/ScheduleDialog';
import { InstalledAppsDialog } from './dialogs/InstalledAppsDialog';
import { ResetDialog } from './dialogs/ResetDialog';
function Main() {
  const controller = useAppController();
  const { p, config, status, update, tab, setTab, sheet, setSheet } = controller;
  if (p.loading)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={C.dark} />
      </View>
    );
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={s.shell}>
        <View style={s.header}>
          <View style={s.brand}>
            <View style={s.brandIcon}>
              <Leaf size={21} color={C.ink} />
            </View>
            <Text style={s.brandName}>
              unscroll<Text style={{ color: '#9AA88B' }}>.</Text>
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Privacy settings"
            onPress={() => setTab('Settings')}
            style={s.headerBadge}
          >
            <LockKeyhole size={13} color={C.muted} />
            <Text style={s.small}>Just for you</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {!status.available && (
            <View style={s.previewBanner}>
              <Smartphone size={16} color={C.ink} />
              <Text style={s.previewText}>
                Preview mode · Controls are saved locally. A native build is needed to block apps.
              </Text>
            </View>
          )}
          {!config.onboarded && (
            <View style={s.welcome}>
              <Text style={s.eyebrow}>A LITTLE LESS SCROLL. A LITTLE MORE LIFE.</Text>
              <Text style={s.welcomeTitle}>
                Keep your apps.{String.fromCharCode(10)}Find your focus.
              </Text>
              <Text style={s.body}>
                {ios
                  ? 'Set whole-app boundaries with Apple Screen Time. Selective blocking inside other apps is unavailable on iOS.'
                  : 'Keep the conversations, learning, and people you love. Put a boundary around the endless feeds.'}
              </Text>
              <View style={{ marginTop: 20 }}>
                <Button
                  title="Make room for what matters"
                  onPress={() => void update({ onboarded: true })}
                />
              </View>
            </View>
          )}
          {tab === 'Today' && <TodayScreen controller={controller} />}
          {tab === 'Apps' && <AppsScreen controller={controller} />}
          {tab === 'Routines' && <RoutinesScreen controller={controller} />}
          {tab === 'Settings' && <SettingsScreen controller={controller} />}
        </ScrollView>
        <View style={s.nav}>
          {(
            [
              { name: 'Today', icon: Home },
              { name: 'Apps', icon: Shield },
              { name: 'Routines', icon: Clock3 },
              { name: 'Settings', icon: Settings2 },
            ] as const
          ).map((i) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === i.name }}
              key={i.name}
              onPress={() => setTab(i.name)}
              style={s.navItem}
            >
              <View style={[s.navIcon, tab === i.name && { backgroundColor: C.green }]}>
                <i.icon
                  size={21}
                  strokeWidth={tab === i.name ? 2 : 1.6}
                  color={tab === i.name ? C.ink : C.muted}
                />
              </View>
              <Text style={[s.navLabel, tab === i.name && { color: C.ink, fontWeight: '700' }]}>
                {i.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Modal
        visible={sheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modal}>
            <View style={s.rowBetween}>
              <Text style={s.eyebrow}>A LITTLE SPACE FOR YOU</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                onPress={() => setSheet(null)}
                style={s.close}
              >
                <X size={22} color={C.ink} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {sheet === 'permission' && <PermissionDialog controller={controller} />}
              {sheet === 'focus' && <FocusDialog controller={controller} />}
              {sheet === 'schedule' && <ScheduleDialog controller={controller} />}
              {sheet === 'apps' && <InstalledAppsDialog controller={controller} />}
              {sheet === 'reset' && <ResetDialog controller={controller} />}
              {p.error && (
                <Text accessibilityRole="alert" style={s.inlineError}>
                  {p.error}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {p.error && !sheet && (
        <View style={s.errorToast} accessibilityRole="alert">
          <Text style={{ color: 'white', flex: 1, lineHeight: 21 }}>{p.error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss error"
            onPress={() => p.setError(null)}
          >
            <X size={22} color="white" />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
