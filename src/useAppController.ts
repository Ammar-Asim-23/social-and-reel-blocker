import { useState } from 'react';
import { useProtection } from './useProtection';
import { Schedule, blockingReason, parseTime, timeLabel } from './model';
import { ios } from './constants';
export type Tab = 'Today' | 'Apps' | 'Routines' | 'Settings';
export function useAppController() {
  const p = useProtection();
  const { config, status, update, saving } = p;
  const [tab, setTab] = useState<Tab>('Today');
  const [sheet, setSheet] = useState<'permission' | 'focus' | 'schedule' | 'apps' | 'reset' | null>(
    null,
  );
  const [minutes, setMinutes] = useState(25);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [name, setName] = useState('Deep work');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [installed, setInstalled] = useState<{ name: string; packageName: string }[]>([]);
  const [search, setSearch] = useState('');
  const [working, setWorking] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setWorking(true);
    p.setError(null);
    try {
      await fn();
      await p.refresh();
    } catch (e) {
      p.setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  };
  const selected = config.apps.filter((a) => a.mode !== 'off');
  const ready =
    status.available &&
    status.authorized &&
    (ios ? status.selectedApps > 0 : status.serviceRunning && selected.length > 0);
  const enabled = config.enabled && ready;
  const reason = blockingReason(
    config,
    status.budgetReached ? config.dailyMinutes * 60 : status.usedSeconds || 0,
  );
  const focused = config.focusUntil > Date.now();
  const used = Math.floor((status.usedSeconds || 0) / 60);
  const closeAfter = (result: boolean) => {
    if (result) setSheet(null);
  };
  const openSchedule = (r?: Schedule) => {
    setEditing(r || null);
    setName(r?.name || 'Deep work');
    setStart(timeLabel(r?.start ?? 540));
    setEnd(timeLabel(r?.end ?? 720));
    setDays(r?.days || [1, 2, 3, 4, 5]);
    setSheet('schedule');
  };
  const saveSchedule = async () => {
    const from = parseTime(start),
      to = parseTime(end);
    if (
      !name.trim() ||
      from === null ||
      to === null ||
      !days.length ||
      (to - from + 1440) % 1440 < 15
    ) {
      p.setError(
        'Use a name, 24-hour times (HH:MM), at least one day, and a duration of at least 15 minutes.',
      );
      return;
    }
    const r: Schedule = {
      id: editing?.id || `routine_${Date.now()}`,
      name: name.trim(),
      start: from,
      end: to,
      days,
      enabled: editing?.enabled ?? true,
    };
    closeAfter(
      await update((c) => ({
        ...c,
        schedules: editing
          ? c.schedules.map((s) => (s.id === editing.id ? r : s))
          : [...c.schedules, r],
      })),
    );
  };

  return {
    p,
    config,
    status,
    update,
    saving,
    tab,
    setTab,
    sheet,
    setSheet,
    minutes,
    setMinutes,
    editing,
    setEditing,
    name,
    setName,
    start,
    setStart,
    end,
    setEnd,
    days,
    setDays,
    installed,
    setInstalled,
    search,
    setSearch,
    working,
    setWorking,
    run,
    selected,
    ready,
    enabled,
    reason,
    focused,
    used,
    closeAfter,
    openSchedule,
    saveSchedule,
  };
}
export type AppController = ReturnType<typeof useAppController>;
