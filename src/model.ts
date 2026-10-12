export type BlockMode = 'off' | 'selective' | 'full';
export type Policy = 'always' | 'budget' | 'scheduled';
export type AppRule = {
  id: string;
  name: string;
  packageName: string;
  mode: BlockMode;
  groupId?: string;
};
export type AppGroup = { id: string; name: string; policy: Policy; dailyMinutes: number };
export type Schedule = {
  id: string;
  name: string;
  days: number[];
  start: number;
  end: number;
  enabled: boolean;
};
export type Config = {
  version: 1;
  onboarded: boolean;
  enabled: boolean;
  policy: Policy;
  dailyMinutes: number;
  focusUntil: number;
  apps: AppRule[];
  schedules: Schedule[];
  groups?: AppGroup[];
  theme?: 'light' | 'dark';
  notifications?: boolean;
};
export type NativeStatus = {
  available: boolean;
  authorized: boolean;
  serviceRunning: boolean;
  selectedApps: number;
  usedSeconds: number | null;
  interruptions: number;
  usageByApp: Record<string, number>;
  budgetReached?: boolean;
  selectedAppsByGroup?: Record<string, number>;
  budgetReachedByGroup?: Record<string, boolean>;
  notificationsAuthorized?: boolean;
  featuresVersion?: number;
};
export const LIMITS = {
  apps: 100,
  groups: 5,
  routines: 5,
  labelLength: 80,
  configBytes: 65536,
} as const;
const packagePattern = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
const validLabel = (value: unknown, max: number = LIMITS.labelLength): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;
export const defaultConfig: Config = {
  version: 1,
  onboarded: false,
  enabled: false,
  policy: 'always',
  dailyMinutes: 15,
  focusUntil: 0,
  apps: [
    {
      id: 'youtube',
      name: 'YouTube',
      packageName: 'com.google.android.youtube',
      mode: 'selective',
    },
    { id: 'instagram', name: 'Instagram', packageName: 'com.instagram.android', mode: 'selective' },
    { id: 'tiktok', name: 'TikTok', packageName: 'com.zhiliaoapp.musically', mode: 'selective' },
    { id: 'snapchat', name: 'Snapchat', packageName: 'com.snapchat.android', mode: 'selective' },
  ],
  schedules: [],
  groups: [],
  theme: 'light',
  notifications: false,
};
export const emptyStatus: NativeStatus = {
  available: false,
  authorized: false,
  serviceRunning: false,
  selectedApps: 0,
  usedSeconds: 0,
  interruptions: 0,
  usageByApp: {},
};
export function isScheduleActive(s: Schedule, now: Date): boolean {
  if (!s.enabled) return false;
  const minute = now.getHours() * 60 + now.getMinutes();
  const today = now.getDay();
  if (s.start < s.end) return s.days.includes(today) && minute >= s.start && minute < s.end;
  return (
    (s.days.includes(today) && minute >= s.start) ||
    (s.days.includes((today + 6) % 7) && minute < s.end)
  );
}
export function blockingReason(c: Config, usedSeconds: number, now = new Date()): string | null {
  if (!c.enabled) return null;
  if (c.focusUntil > now.getTime()) return 'Focus session';
  if (c.schedules.some((s) => isScheduleActive(s, now))) return 'Scheduled focus';
  if (c.policy === 'always') return 'Always protected';
  if (c.policy === 'budget' && usedSeconds >= c.dailyMinutes * 60) return 'Daily allowance reached';
  return null;
}
export function timeLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
export function parseTime(value: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}
export function validateConfig(value: unknown): Config {
  const c = value as Config;
  if (
    !c ||
    c.version !== 1 ||
    typeof c.enabled !== 'boolean' ||
    typeof c.onboarded !== 'boolean' ||
    !['always', 'budget', 'scheduled'].includes(c.policy) ||
    !Number.isInteger(c.dailyMinutes) ||
    c.dailyMinutes < 1 ||
    c.dailyMinutes > 180 ||
    !Number.isSafeInteger(c.focusUntil) ||
    c.focusUntil < 0 ||
    !Array.isArray(c.apps) ||
    !Array.isArray(c.schedules)
  )
    throw new Error('Invalid saved settings.');
  const groups = c.groups ?? [];
  if (
    !Array.isArray(groups) ||
    groups.length > LIMITS.groups ||
    new Set(groups.map((g) => g?.id)).size !== groups.length ||
    groups.some(
      (g) =>
        !g ||
        !validLabel(g.id) ||
        !/^[a-zA-Z0-9_-]+$/.test(g.id) ||
        g.id === 'default' ||
        !validLabel(g.name) ||
        !['always', 'budget', 'scheduled'].includes(g.policy) ||
        !Number.isInteger(g.dailyMinutes) ||
        g.dailyMinutes < 1 ||
        g.dailyMinutes > 180,
    ) ||
    (c.theme !== undefined && !['light', 'dark'].includes(c.theme)) ||
    (c.notifications !== undefined && typeof c.notifications !== 'boolean')
  )
    throw new Error('Invalid group or preferences.');
  if (
    c.apps.length > LIMITS.apps ||
    new Set(c.apps.map((a) => a?.id)).size !== c.apps.length ||
    new Set(c.apps.map((a) => a?.packageName)).size !== c.apps.length ||
    c.apps.some(
      (a) =>
        !a ||
        !validLabel(a.id, 255) ||
        !validLabel(a.name) ||
        typeof a.packageName !== 'string' ||
        a.packageName.length > 255 ||
        !packagePattern.test(a.packageName) ||
        !['off', 'selective', 'full'].includes(a.mode) ||
        (a.groupId !== undefined && !groups.some((g) => g.id === a.groupId)),
    )
  )
    throw new Error('Invalid app rule.');
  if (
    c.schedules.length > LIMITS.routines ||
    new Set(c.schedules.map((s) => s?.id)).size !== c.schedules.length ||
    c.schedules.some(
      (s) =>
        !s ||
        typeof s.id !== 'string' ||
        s.id.length > 80 ||
        !/^[a-zA-Z0-9_-]+$/.test(s.id) ||
        !validLabel(s.name) ||
        typeof s.enabled !== 'boolean' ||
        !Array.isArray(s.days) ||
        s.days.length === 0 ||
        new Set(s.days).size !== s.days.length ||
        s.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
        !Number.isInteger(s.start) ||
        !Number.isInteger(s.end) ||
        s.start < 0 ||
        s.start > 1439 ||
        s.end < 0 ||
        s.end > 1439 ||
        (s.end - s.start + 1440) % 1440 < 15,
    )
  )
    throw new Error('Schedules need at least one day and a duration of 15 minutes or more.');
  return c;
}

export function groupUsageSeconds(
  c: Config,
  usage: Record<string, number>,
  groupId?: string,
): number {
  return c.apps
    .filter((a) => a.groupId === groupId)
    .reduce(
      (total, a) =>
        total +
        (usage[a.packageName] || 0) +
        (a.packageName === 'com.zhiliaoapp.musically' ? usage['com.ss.android.ugc.trill'] || 0 : 0),
      0,
    );
}

export function groupBlockingReason(
  c: Config,
  groupId: string | undefined,
  usedSeconds: number,
  now = new Date(),
) {
  const group = c.groups?.find((g) => g.id === groupId);
  return blockingReason(
    group ? { ...c, policy: group.policy, dailyMinutes: group.dailyMinutes } : c,
    usedSeconds,
    now,
  );
}
