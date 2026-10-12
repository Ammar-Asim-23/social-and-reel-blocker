import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, Text, View } from 'react-native';
import * as Authentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Button } from './components';
import { useTheme } from './theme';

const KEY = 'unscroll.app-lock.v1';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const LockContext = createContext({
  enabled: false,
  busy: false,
  available: false,
  setEnabled: async (_value: boolean) => {},
});
export const useAppLock = () => useContext(LockContext);

export function AppLock({ children }: { children: React.ReactNode }) {
  const { s } = useTheme();
  const [enabled, setEnabledState] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [locked, setLocked] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabledRef = useRef(false);
  const authenticating = useRef(false);
  const available = Platform.OS !== 'web';
  const load = useCallback(async () => {
    try {
      const value = available ? await SecureStore.getItemAsync(KEY, options) : null;
      if (value !== null && value !== 'on' && value !== 'off')
        throw new Error('Unrecognized lock preference.');
      enabledRef.current = value === 'on';
      setEnabledState(enabledRef.current);
      setLocked(enabledRef.current);
      setLoaded(true);
      setError(null);
    } catch {
      // A storage error must never silently remove an existing lock.
      setError('Unable to read app lock securely. Unlock your phone and try again.');
    }
  }, [available]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && enabledRef.current) setLocked(true);
    });
    const blur =
      Platform.OS === 'android'
        ? AppState.addEventListener('blur', () => {
            if (enabledRef.current) setLocked(true);
          })
        : undefined;
    return () => {
      listener.remove();
      blur?.remove();
    };
  }, []);
  const authenticate = async () => {
    if ((await Authentication.getEnrolledLevelAsync()) === Authentication.SecurityLevel.NONE)
      throw new Error('Set a phone passcode or biometrics in system settings first.');
    const result = await Authentication.authenticateAsync({
      promptMessage: 'Unlock Unscroll',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use device passcode',
      disableDeviceFallback: false,
      biometricsSecurityLevel: 'strong',
    });
    if (!result.success) throw new Error('Authentication was not completed. Try again to unlock.');
  };
  const perform = async (next?: boolean) => {
    if (authenticating.current) return;
    authenticating.current = true;
    setBusy(true);
    setError(null);
    try {
      await authenticate();
      if (next !== undefined) {
        await SecureStore.setItemAsync(KEY, next ? 'on' : 'off', options);
        enabledRef.current = next;
        setEnabledState(next);
      }
      setLocked(AppState.currentState !== 'active' && enabledRef.current);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unable to authenticate.';
      setError(message);
      if (next !== undefined) throw e;
    } finally {
      authenticating.current = false;
      setBusy(false);
    }
  };
  if (!loaded || locked)
    return (
      <View style={[s.loading, { padding: 30, gap: 18 }]}>
        <Text style={s.title}>{loaded ? 'Unscroll is locked.' : 'Opening securely…'}</Text>
        <Text style={s.body}>
          {loaded
            ? 'Use your phone’s biometrics or device passcode. Protection keeps running while Unscroll is locked.'
            : 'Checking your app lock preference.'}
        </Text>
        {error && (
          <Text accessibilityRole="alert" style={s.inlineError}>
            {error}
          </Text>
        )}
        {!loaded && !error ? (
          <ActivityIndicator />
        ) : (
          <Button
            title={loaded ? 'Unlock Unscroll' : 'Try again'}
            disabled={busy}
            onPress={() => {
              void (loaded ? perform() : load());
            }}
          />
        )}
      </View>
    );
  return (
    <LockContext.Provider
      value={{ enabled, busy, available, setEnabled: (value) => perform(value) }}
    >
      {children}
    </LockContext.Provider>
  );
}
