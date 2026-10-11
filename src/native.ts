import { requireOptionalNativeModule } from 'expo-modules-core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Config, defaultConfig, emptyStatus, NativeStatus, validateConfig, LIMITS } from './model';

type Bridge = {
  getConfig(): Promise<string | null>;
  saveConfig(json: string): Promise<void>;
  getStatus(): Promise<Omit<NativeStatus, 'available'>>;
  requestAuthorization(): Promise<void>;
  selectApps(): Promise<number>;
  getInstalledApps(): Promise<{ name: string; packageName: string }[]>;
  reset(): Promise<void>;
};
const native = requireOptionalNativeModule<Bridge>('Unscroll');
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
    if (!native)
      throw new Error(
        'Install a native development build to enable protection. Expo Go and the web preview cannot block other apps.',
      );
    await native.requestAuthorization();
  },
  async selectApps() {
    if (!native) throw new Error('App selection requires an iOS development build.');
    return native.selectApps();
  },
  async installedApps() {
    return native ? native.getInstalledApps() : [];
  },
  async reset() {
    if (native) await native.reset();
    await AsyncStorage.removeItem(key);
  },
};
