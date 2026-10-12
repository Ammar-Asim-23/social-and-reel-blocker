import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Authentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Button } from './components';
import { useTheme } from './theme';
import { appLockTransition, initialAppLockState, isAppCovered, LockActivity } from './appLockState';

const KEY = 'unscroll.app-lock.v1';
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const LockContext = createContext({
  enabled: false,
  busy: false,
  available: false,
  covered: true,
  loaded: false,
  error: null as string | null,
  unlock: () => {},
  setEnabled: async (_value: boolean) => {},
});
export const useAppLock = () => useContext(LockContext);
const activity = (value: string | null): LockActivity =>
  value === 'active' || value === 'inactive' || value === 'background' ? value : 'unknown';

/** Also rendered inside native Modal windows, which sit above the root React view. */
export function AppLockScreen() {
  const { s } = useTheme();
  const { loaded, busy, error, unlock } = useAppLock();
  return (
    <View
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFillObject, s.loading, { padding: 30, gap: 18 }]}
    >
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
      {busy || (!loaded && !error) ? (
        <ActivityIndicator accessibilityLabel="Opening securely" />
      ) : (
        <Button title={loaded ? 'Unlock Unscroll' : 'Try again'} onPress={unlock} />
      )}
    </View>
  );
}

export function AppLock({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(
    appLockTransition,
    activity(AppState.currentState),
    initialAppLockState,
  );
  const [error, setError] = useState<string | null>(null);
  const authenticating = useRef(false);
  const mounted = useRef(true);
  const loadAttempt = useRef(0);
  const available = Platform.OS !== 'web';
  const covered = isAppCovered(state);
  const busy = state.authentication !== 'idle';
  useEffect(() => {
    if (covered) Keyboard.dismiss();
  }, [covered]);
  const load = useCallback(async () => {
    const attempt = ++loadAttempt.current;
    setError(null);
    try {
      const value = available ? await SecureStore.getItemAsync(KEY, options) : null;
      if (value !== null && value !== 'on' && value !== 'off')
        throw new Error('Unrecognized lock preference.');
      if (mounted.current && attempt === loadAttempt.current)
        dispatch({ type: 'loaded', enabled: value === 'on' });
    } catch {
      // A storage error must never silently remove an existing lock.
      if (mounted.current && attempt === loadAttempt.current)
        setError('Unable to read app lock securely. Unlock your phone and try again.');
    }
  }, [available]);
  useEffect(() => {
    mounted.current = true;
    void load();
    const listener = AppState.addEventListener('change', (value) =>
      dispatch({ type: 'activity', activity: activity(value), at: performance.now() }),
    );
    // Android blur also fires for notification drawers, native pickers and authentication.
    // It is deliberately not a lock trigger. Real background transitions are handled above.
    return () => {
      mounted.current = false;
      loadAttempt.current++;
      listener.remove();
    };
  }, [load]);
  useEffect(() => {
    if (state.foregroundDeadline === null) return;
    const timer = setTimeout(
      () => {
        dispatch({ type: 'failed' });
        dispatch({
          type: 'activity',
          activity: activity(AppState.currentState),
          at: performance.now(),
        });
        setError('The return from authentication timed out. Please unlock again.');
      },
      Math.max(0, state.foregroundDeadline - performance.now()),
    );
    return () => clearTimeout(timer);
  }, [state.foregroundDeadline]);
  const perform = async (next?: boolean) => {
    if (authenticating.current || busy) return;
    authenticating.current = true;
    dispatch({ type: 'authenticate' });
    setError(null);
    try {
      if ((await Authentication.getEnrolledLevelAsync()) === Authentication.SecurityLevel.NONE)
        throw new Error('Set a phone passcode or biometrics in system settings first.');
      const result = await Authentication.authenticateAsync({
        promptMessage: 'Unlock Unscroll',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use device passcode',
        disableDeviceFallback: false,
        biometricsSecurityLevel: 'strong',
      });
      if (!result.success)
        throw new Error('Authentication was not completed. Try again to unlock.');
      if (next !== undefined) await SecureStore.setItemAsync(KEY, next ? 'on' : 'off', options);
      // Success may arrive before the OS's active event. Carry that one successful
      // authentication through the return transition rather than leaving the screen locked.
      if (mounted.current)
        dispatch({ type: 'authenticated', enabled: next, at: performance.now() });
    } catch (e) {
      if (mounted.current) {
        dispatch({ type: 'failed' });
        setError(e instanceof Error ? e.message : 'Unable to authenticate.');
      }
      if (next !== undefined) throw e;
    } finally {
      authenticating.current = false;
    }
  };
  return (
    <LockContext.Provider
      value={{
        enabled: state.enabled,
        busy,
        available,
        covered,
        loaded: state.loaded,
        error,
        unlock: () => {
          void (state.loaded ? perform() : load());
        },
        setEnabled: (value) => perform(value),
      }}
    >
      <View style={{ flex: 1 }}>
        {/* Keep screens mounted so native permission/picker callbacks and form state survive a lock. */}
        {state.loaded && (
          <View
            style={{ flex: 1 }}
            pointerEvents={covered ? 'none' : 'auto'}
            accessibilityElementsHidden={covered}
            importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
          >
            {children}
          </View>
        )}
        {covered && <AppLockScreen />}
      </View>
    </LockContext.Provider>
  );
}
