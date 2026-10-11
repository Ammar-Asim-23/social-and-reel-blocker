import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { bridge } from './native';
import { Config, defaultConfig, emptyStatus } from './model';
import { SerialQueue } from './serialQueue';

const freshConfig = (): Config => JSON.parse(JSON.stringify(defaultConfig));

export function useProtection() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [status, setStatus] = useState(emptyStatus);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const current = useRef(defaultConfig);
  const queue = useRef(new SerialQueue());
  const pending = useRef(0);
  const mounted = useRef(true);
  const loaded = useRef(false);
  const refreshing = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshing.current || !mounted.current) return;
    refreshing.current = true;
    try {
      const next = await bridge.status();
      if (mounted.current) setStatus(next);
    } catch (e) {
      if (mounted.current) {
        setStatus({ ...emptyStatus, available: bridge.available });
        setError(String(e));
      }
    } finally {
      refreshing.current = false;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    void bridge
      .load()
      .then((c) => {
        if (cancelled) return;
        current.current = c;
        loaded.current = true;
        setConfig(c);
      })
      .catch((e) => {
        if (!cancelled) setError(`${String(e)} Reset local data in Settings to recover.`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    void refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active' || AppState.currentState === null) void refresh();
    }, 3000);
    return () => {
      cancelled = true;
      mounted.current = false;
      sub.remove();
      clearInterval(timer);
    };
  }, [refresh]);
  const update = async (change: Partial<Config> | ((c: Config) => Config)) => {
    if (!loaded.current) {
      setError(
        'Saved settings could not be loaded. Reset local data in Settings before changing rules.',
      );
      return false;
    }
    pending.current++;
    setSaving(true);
    return queue.current.run(async () => {
      try {
        const next =
          typeof change === 'function'
            ? change(current.current)
            : { ...current.current, ...change };
        await bridge.save(next);
        current.current = next;
        if (mounted.current) {
          setConfig(next);
          setError(null);
        }
        await refresh();
        return true;
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        pending.current--;
        if (mounted.current) setSaving(pending.current > 0);
      }
    });
  };
  const reset = async () => {
    await queue.current.run(async () => {
      await bridge.reset();
      current.current = freshConfig();
      loaded.current = true;
      if (mounted.current) {
        setConfig(current.current);
        setError(null);
      }
      await refresh();
    });
  };
  return { config, status, loading, saving, error, setError, update, refresh, reset };
}
