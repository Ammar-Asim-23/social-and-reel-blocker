import { useState } from 'react';
import { useProtection } from './useProtection';
import {
  AppGroup,
  Schedule,
  groupUsageSeconds,
  groupBlockingReason,
  parseTime,
  timeLabel,
} from './model';
import { ios } from './constants';
import { bridge } from './native';
export type Tab = 'Today' | 'Apps' | 'Routines' | 'Settings';
export function useAppController() {
  const p = useProtection();
  const { config, status, update, saving } = p;
  const [tab, setTab] = useState<Tab>('Today');
  const [sheet, setSheet] = useState<
    'permission' | 'focus' | 'schedule' | 'apps' | 'reset' | 'group' | null
  >(null);
  const [minutes, setMinutes] = useState(25);
  const [editingGroup, setEditingGroup] = useState<AppGroup | null>(null);
  const openGroup = (group?: AppGroup) => {
    setEditingGroup(group || null);
    p.setError(null);
    setSheet('group');
  };
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [name, setName] = useState('Deep work');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [installed, setInstalled] = useState<{ name: string; packageName: string }[]>([]);
  const [search, setSearch] = useState('');
  const [working, setWorking] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<string | null>(null);
  const loadInstalledApps = async () => {
    setAppsLoading(true);
    setAppsError(null);
    setInstalled([]);
    try {
      setInstalled(await bridge.installedApps());
    } catch (e) {
      setAppsError(e instanceof Error ? e.message : String(e));
    } finally {
      setAppsLoading(false);
    }
  };
  const openInstalledApps = () => {
    p.setError(null);
    setSearch('');
    setSheet('apps');
    void loadInstalledApps();
  };
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
  const groupReason = (group?: AppGroup) =>
    groupBlockingReason(
      config,
      group?.id,
      ios
        ? (group ? status.budgetReachedByGroup?.[group.id] : status.budgetReached)
          ? (group?.dailyMinutes || config.dailyMinutes) * 60
          : 0
        : groupUsageSeconds(config, status.usageByApp, group?.id),
    );
  const activeGroups = [undefined, ...(config.groups || [])].filter(
    (g) =>
      (ios
        ? (g
            ? status.selectedAppsByGroup?.[g.id] || 0
            : (status.selectedAppsByGroup?.default ?? status.selectedApps)) > 0
        : selected.some((a) => a.groupId === g?.id)) && groupReason(g),
  );
  const reason = activeGroups.length
    ? `${activeGroups.length} ${activeGroups.length === 1 ? 'group has' : 'groups have'} active boundaries`
    : null;
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
    appsLoading,
    appsError,
    loadInstalledApps,
    openInstalledApps,
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
    editingGroup,
    openGroup,
    groupReason,
  };
}
export type AppController = ReturnType<typeof useAppController>;
