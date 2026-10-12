import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  blockingReason,
  defaultConfig,
  isScheduleActive,
  parseTime,
  validateConfig,
  Schedule,
  Config,
  groupBlockingReason,
  groupUsageSeconds,
} from '../src/model';
const routine: Schedule = {
  id: 'night',
  name: 'Night',
  enabled: true,
  days: [1],
  start: 1320,
  end: 420,
};
const monday = (h: number, m = 0) => new Date(2026, 9, 12, h, m);
test('overnight routine starts Monday and ends Tuesday, not Sunday night', () => {
  assert.equal(isScheduleActive(routine, monday(22)), true);
  assert.equal(isScheduleActive(routine, monday(21, 59)), false);
  assert.equal(isScheduleActive(routine, new Date(2026, 9, 13, 6, 59)), true);
  assert.equal(isScheduleActive(routine, new Date(2026, 9, 13, 7)), false);
  assert.equal(isScheduleActive(routine, monday(6)), false);
});

test('group policies isolate allowances and respect focus and master pause', () => {
  const c: Config = {
    ...defaultConfig,
    enabled: true,
    policy: 'scheduled',
    groups: [
      { id: 'always', name: 'Always', policy: 'always', dailyMinutes: 15 },
      { id: 'budget', name: 'Daily', policy: 'budget', dailyMinutes: 5 },
    ],
    apps: defaultConfig.apps.map((a, i) => ({
      ...a,
      groupId: i === 0 ? 'always' : i === 1 ? 'budget' : undefined,
    })),
  };
  validateConfig(c);
  const usage = {
    'com.google.android.youtube': 9999,
    'com.instagram.android': 299,
    'com.zhiliaoapp.musically': 20,
    'com.ss.android.ugc.trill': 10,
  };
  assert.equal(groupUsageSeconds(c, usage, 'budget'), 299);
  assert.equal(groupUsageSeconds(c, usage), 30);
  assert.equal(groupBlockingReason(c, 'budget', 299, monday(12)), null);
  assert.equal(groupBlockingReason(c, 'budget', 300, monday(12)), 'Daily allowance reached');
  assert.equal(groupBlockingReason(c, 'always', 0, monday(12)), 'Always protected');
  assert.equal(groupBlockingReason(c, undefined, 9999, monday(12)), null);
  assert.equal(
    groupBlockingReason({ ...c, focusUntil: monday(13).getTime() }, 'budget', 0, monday(12)),
    'Focus session',
  );
  assert.equal(groupBlockingReason({ ...c, enabled: false }, 'always', 9999, monday(12)), null);
});

test('legacy configs load, while invalid groups and preferences are rejected', () => {
  const { groups: _, theme: __, notifications: ___, ...legacy } = defaultConfig;
  assert.equal(validateConfig(legacy), legacy);
  const g = { id: 'social', name: 'Social', policy: 'always', dailyMinutes: 5 };
  for (const change of [
    { groups: [g, g] },
    { groups: [{ ...g, id: 'default' }] },
    { groups: [{ ...g, dailyMinutes: 0 }] },
    { groups: Array.from({ length: 6 }, (_, i) => ({ ...g, id: `g${i}` })) },
    { groups: {} },
    { theme: 'unknown' },
    { notifications: 'true' },
    { apps: [{ ...defaultConfig.apps[0], groupId: 'missing' }] },
  ]) {
    assert.throws(() => validateConfig({ ...defaultConfig, ...change }));
  }
});
test('Sunday overnight wraps into Monday', () => {
  assert.equal(isScheduleActive({ ...routine, days: [0] }, monday(6)), true);
});
test('same-day schedule boundaries and disabled days', () => {
  const r = { ...routine, start: 540, end: 720 };
  assert.equal(isScheduleActive(r, monday(9)), true);
  assert.equal(isScheduleActive(r, monday(12)), false);
  assert.equal(isScheduleActive({ ...r, enabled: false }, monday(10)), false);
});
test('master pause overrides allowance, schedule, and focus', () => {
  assert.equal(
    blockingReason(
      { ...defaultConfig, enabled: false, focusUntil: monday(23).getTime(), schedules: [routine] },
      10000,
      monday(22),
    ),
    null,
  );
});
test('daily shared limit uses exact threshold; focus and routines take priority', () => {
  const c = { ...defaultConfig, enabled: true, policy: 'budget' as const, dailyMinutes: 15 };
  assert.equal(blockingReason(c, 899, monday(12)), null);
  assert.equal(blockingReason(c, 900, monday(12)), 'Daily allowance reached');
  assert.equal(blockingReason({ ...c, schedules: [routine] }, 0, monday(22)), 'Scheduled focus');
  assert.equal(
    blockingReason({ ...c, focusUntil: monday(13).getTime() }, 0, monday(12)),
    'Focus session',
  );
  assert.equal(blockingReason({ ...c, focusUntil: monday(12).getTime() }, 0, monday(12)), null);
});
test('focus-only policy stays open outside sessions and schedules', () => {
  assert.equal(
    blockingReason({ ...defaultConfig, enabled: true, policy: 'scheduled' }, 10000, monday(12)),
    null,
  );
});
test('malformed time and unsafe saved settings are rejected', () => {
  assert.equal(parseTime('23:59'), 1439);
  assert.equal(parseTime('24:00'), null);
  assert.equal(parseTime('9:00'), null);
  assert.throws(() => validateConfig({ ...defaultConfig, dailyMinutes: -1 }));
  assert.throws(() => validateConfig({ ...defaultConfig, schedules: [{ ...routine, days: [] }] }));
  assert.throws(() =>
    validateConfig({ ...defaultConfig, schedules: [{ ...routine, start: 400, end: 400 }] }),
  );
  assert.throws(() =>
    validateConfig({ ...defaultConfig, schedules: [{ ...routine, start: 400, end: 410 }] }),
  );
  assert.equal(validateConfig(defaultConfig), defaultConfig);
});

test('duplicate identifiers, excessive rules, blank labels, and invalid package names are rejected', () => {
  assert.throws(() =>
    validateConfig({ ...defaultConfig, apps: [defaultConfig.apps[0], defaultConfig.apps[0]] }),
  );
  assert.throws(() => validateConfig({ ...defaultConfig, schedules: [routine, routine] }));
  assert.throws(() => validateConfig({ ...defaultConfig, schedules: [{ ...routine, name: ' ' }] }));
  assert.throws(() =>
    validateConfig({
      ...defaultConfig,
      apps: [{ ...defaultConfig.apps[0], packageName: '../settings' }],
    }),
  );
  assert.throws(() =>
    validateConfig({
      ...defaultConfig,
      apps: Array.from({ length: 101 }, (_, n) => ({
        id: String(n),
        name: 'App',
        packageName: `app.test${n}`,
        mode: 'full',
      })),
    }),
  );
  assert.throws(() => validateConfig({ ...defaultConfig, focusUntil: Number.MAX_VALUE }));
});
