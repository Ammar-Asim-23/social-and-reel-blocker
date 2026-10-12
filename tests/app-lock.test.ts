import assert from 'node:assert/strict';
import { test } from 'node:test';
import { appLockTransition as step, initialAppLockState, isAppCovered } from '../src/appLockState';

const coldStart = () => step(initialAppLockState('active'), { type: 'loaded', enabled: true });
const unlocked = () =>
  step(step(coldStart(), { type: 'authenticate' }), { type: 'authenticated', at: 0 });

test('a successful prompt cannot leave a reusable grant for a later app visit', () => {
  let state = step(coldStart(), { type: 'authenticate' });
  state = step(state, { type: 'activity', activity: 'background', at: 0 });
  state = step(state, { type: 'authenticated', at: 100 });
  state = step(state, { type: 'activity', activity: 'active', at: 10100 });
  assert.equal(isAppCovered(state), true);
  assert.equal(state.authentication, 'idle');
  state = step(state, { type: 'authenticate' });
  state = step(state, { type: 'authenticated', at: 10200 });
  assert.equal(isAppCovered(state), false);
});

test('authentication succeeds before the foreground event without becoming stuck', () => {
  let state = step(coldStart(), { type: 'authenticate' });
  state = step(state, { type: 'activity', at: 0, activity: 'background' });
  state = step(state, { type: 'authenticated', at: 0 });
  assert.equal(isAppCovered(state), true);
  state = step(state, { type: 'activity', at: 0, activity: 'active' });
  assert.equal(isAppCovered(state), false);
  assert.equal(state.authentication, 'idle');
});
test('foreground arriving before biometric success also unlocks once', () => {
  let state = step(coldStart(), { type: 'authenticate' });
  state = step(state, { type: 'activity', at: 0, activity: 'inactive' });
  state = step(state, { type: 'activity', at: 0, activity: 'active' });
  assert.equal(isAppCovered(state), true);
  state = step(state, { type: 'authenticated', at: 0 });
  assert.equal(isAppCovered(state), false);
});
test('temporary native dialogs cover content without creating another authentication cycle', () => {
  let state = step(unlocked(), { type: 'activity', at: 0, activity: 'inactive' });
  assert.equal(isAppCovered(state), true);
  state = step(state, { type: 'activity', at: 0, activity: 'active' });
  assert.equal(isAppCovered(state), false);
});
test('return from accessibility settings requires one unlock and the next departure locks again', () => {
  let state = step(unlocked(), { type: 'activity', at: 0, activity: 'background' });
  state = step(state, { type: 'activity', at: 0, activity: 'active' });
  assert.equal(isAppCovered(state), true);
  state = step(state, { type: 'authenticate' });
  state = step(state, { type: 'authenticated', at: 0 });
  assert.equal(isAppCovered(state), false);
  state = step(state, { type: 'activity', at: 0, activity: 'background' });
  assert.equal(isAppCovered(state), true);
});
test('cancellation or secure-storage failure never grants a pending unlock', () => {
  let state = step(coldStart(), { type: 'authenticate' });
  state = step(state, { type: 'activity', at: 0, activity: 'background' });
  state = step(state, { type: 'failed' });
  state = step(state, { type: 'activity', at: 0, activity: 'active' });
  state = step(state, { type: 'authenticated', at: 0 });
  assert.equal(isAppCovered(state), true);
  assert.equal(state.authentication, 'idle');
});
test('enabling app lock during device-passcode authentication completes on return', () => {
  let state = step(initialAppLockState('active'), { type: 'loaded', enabled: false });
  state = step(state, { type: 'authenticate' });
  state = step(state, { type: 'activity', at: 0, activity: 'background' });
  state = step(state, { type: 'authenticated', at: 0, enabled: true });
  state = step(state, { type: 'activity', at: 0, activity: 'active' });
  assert.equal(state.enabled, true);
  assert.equal(isAppCovered(state), false);
});
test('cold start remains covered until preferences load and an enabled lock is authenticated', () => {
  assert.equal(isAppCovered(initialAppLockState('active')), true);
  assert.equal(isAppCovered(coldStart()), true);
  assert.equal(
    isAppCovered(step(initialAppLockState('active'), { type: 'loaded', enabled: false })),
    false,
  );
});
