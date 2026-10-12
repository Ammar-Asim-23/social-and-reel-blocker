import { requireOptionalNativeModule } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Config, defaultConfig, emptyStatus, NativeStatus, validateConfig, LIMITS } from './model';

type Bridge = {
  getConfig(): Promise<string | null>;
  saveConfig(json: string): Promise<void>;
  getStatus(): Promise<Omit<NativeStatus, 'available'>>;
  requestAuthorization(): Promise<void>;
  revokeAuthorization?(): Promise<void>;
  selectApps(groupId?: string): Promise<number>;
  getAppIcon?(packageName: string): Promise<string | null>;
  requestNotificationPermission?(): Promise<unknown>;
  getInstalledApps(): Promise<{ name: string; packageName: string }[]>;
  reset(): Promise<void>;
};
const native = requireOptionalNativeModule<Bridge>('Unscroll');
export const nativeUnavailableMessage =
  Platform.OS === 'web'
    ? 'This browser preview cannot request permissions or list installed apps. Install an Unscroll APK to use protection.'
    : 'The Unscroll protection module is missing from this installation. Install a rebuilt Unscroll app that includes the native module. Expo Go does not support this module.';
const key = 'unscroll-config-v1';
export const bridge = {
  available: !!native,
  async load(): Promise<Config> {
    const raw = native ? await native.getConfig() : await AsyncStorage.getItem(key);
    if (raw && raw.length > LIMITS.configBytes)
      throw new Error('Saved settings exceed the size limit. Reset local data to recover.');
    return raw ? validateConfig(JSON.parse(raw)) : JSON.parse(JSON.stringify(defaultConfig));
  },
  async save(c: Config) {
    const json = JSON.stringify(validateConfig(c));
    if (json.length > LIMITS.configBytes)
      throw new Error('Settings exceed the size limit. Remove some rules.');
    if (native) await native.saveConfig(json);
    else await AsyncStorage.setItem(key, json);
  },
  async status(): Promise<NativeStatus> {
    return native ? { ...(await native.getStatus()), available: true } : { ...emptyStatus };
  },
  async authorize() {
    if (!native) throw new Error(nativeUnavailableMessage);
    await native.requestAuthorization();
  },
  async selectApps(groupId = 'default') {
    if (!native) throw new Error(nativeUnavailableMessage);
    return native.selectApps(groupId);
  },
  async appIcon(packageName: string) {
    return native?.getAppIcon ? native.getAppIcon(packageName) : null;
  },
  async requestNotifications() {
    if (!native?.requestNotificationPermission)
      throw new Error('Install the updated native build to enable notifications.');
    await native.requestNotificationPermission();
    if (!(await native.getStatus()).notificationsAuthorized)
      throw new Error(
        'Notifications are not allowed. Enable Unscroll notifications in your phone’s settings, then try again.',
      );
  },
  async revokeAuthorization() {
    if (!native?.revokeAuthorization)
      throw new Error('Turn off Unscroll in Android Accessibility settings to revoke access.');
    await native.revokeAuthorization();
  },
  async installedApps() {
    if (!native) throw new Error(nativeUnavailableMessage);
    return native.getInstalledApps();
  },
  async reset() {
    if (native) await native.reset();
    await AsyncStorage.removeItem(key);
  },
};
