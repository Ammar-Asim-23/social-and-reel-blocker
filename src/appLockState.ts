export type LockActivity = 'active' | 'inactive' | 'background' | 'unknown';
export type AppLockState = {
  loaded: boolean;
  enabled: boolean;
  locked: boolean;
  activity: LockActivity;
  authentication: 'idle' | 'prompting' | 'awaiting-foreground';
  foregroundDeadline: number | null;
};
export type AppLockEvent =
  | { type: 'loaded'; enabled: boolean }
  | { type: 'activity'; activity: LockActivity; at: number }
  | { type: 'authenticate' }
  | { type: 'authenticated'; enabled?: boolean; at: number }
  | { type: 'failed' };

export function initialAppLockState(activity: LockActivity): AppLockState {
  return {
    loaded: false,
    enabled: false,
    locked: true,
    activity,
    authentication: 'idle',
    foregroundDeadline: null,
  };
}

/** Authentication owns its foreground transition; temporary OS dialogs are not a new session. */
export function appLockTransition(state: AppLockState, event: AppLockEvent): AppLockState {
  switch (event.type) {
    case 'loaded':
      return { ...state, loaded: true, enabled: event.enabled, locked: event.enabled };
    case 'authenticate':
      return {
        ...state,
        authentication: 'prompting',
        locked: state.enabled,
        foregroundDeadline: null,
      };
    case 'authenticated': {
      if (state.authentication !== 'prompting') return state;
      const enabled = event.enabled ?? state.enabled;
      const waiting = state.activity !== 'active';
      return {
        ...state,
        enabled,
        locked: waiting && enabled,
        authentication: waiting ? 'awaiting-foreground' : 'idle',
        foregroundDeadline: waiting ? event.at + 10000 : null,
      };
    }
    case 'failed':
      return { ...state, authentication: 'idle', locked: state.enabled, foregroundDeadline: null };
    case 'activity': {
      if (state.authentication === 'awaiting-foreground' && event.activity === 'active') {
        // A grant is only for the immediate return from the OS prompt, not a later app session.
        const expired = state.foregroundDeadline === null || event.at >= state.foregroundDeadline;
        return {
          ...state,
          activity: 'active',
          authentication: 'idle',
          locked: state.enabled && expired,
          foregroundDeadline: null,
        };
      }
      // Background changes caused by the device-passcode activity belong to the active prompt.
      // Outside that prompt, a real app departure locks immediately; there is no grace period.
      const departed = event.activity === 'background' && state.authentication === 'idle';
      return {
        ...state,
        activity: event.activity,
        locked: state.locked || (state.enabled && departed),
      };
    }
  }
}

export function isAppCovered(state: AppLockState): boolean {
  return (
    !state.loaded ||
    state.locked ||
    state.authentication !== 'idle' ||
    (state.enabled && state.activity !== 'active')
  );
}
