import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  blockingReason,
  defaultConfig,
  isScheduleActive,
  parseTime,
  validateConfig,
  Schedule,
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
