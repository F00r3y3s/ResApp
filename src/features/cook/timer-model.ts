/**
 * Pure state machine for a countdown timer.
 *
 * Framework-agnostic — no side effects, no intervals. The component or hook
 * that uses this model is responsible for calling `tickTimer` every second.
 */

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export type TimerState = {
  /** Total duration the timer was created with (seconds). */
  durationSeconds: number;
  /** Seconds remaining on the countdown. */
  remaining: number;
  /** Current lifecycle status. */
  status: TimerStatus;
};

/**
 * Create a new timer with the given duration in seconds.
 * Negative or fractional values are clamped/floored to a safe integer ≥ 0.
 */
export function createTimer(durationSeconds: number): TimerState {
  const safe = Math.max(0, Math.floor(durationSeconds));
  return {
    durationSeconds: safe,
    remaining: safe,
    status: 'idle',
  };
}

/**
 * Transition to running. Only works from idle or paused.
 * A finished timer cannot be restarted — use `resetTimer` first.
 */
export function startTimer(state: TimerState): TimerState {
  if (state.status === 'idle' || state.status === 'paused') {
    return { ...state, status: 'running' };
  }
  return state;
}

/**
 * Transition to paused. Only works from running.
 */
export function pauseTimer(state: TimerState): TimerState {
  if (state.status === 'running') {
    return { ...state, status: 'paused' };
  }
  return state;
}

/**
 * Decrement remaining by 1 second. Only works when running.
 * Transitions to finished when remaining reaches 0.
 */
export function tickTimer(state: TimerState): TimerState {
  if (state.status !== 'running') {
    return state;
  }
  const next = state.remaining - 1;
  if (next <= 0) {
    return { ...state, remaining: 0, status: 'finished' };
  }
  return { ...state, remaining: next };
}

/**
 * Reset the timer back to idle with the original duration.
 */
export function resetTimer(state: TimerState): TimerState {
  return {
    ...state,
    remaining: state.durationSeconds,
    status: 'idle',
  };
}

/**
 * Predicate: is the timer finished?
 */
export function isFinished(state: TimerState): boolean {
  return state.status === 'finished';
}

/**
 * Format remaining seconds as MM:SS (supports > 60 minutes).
 */
export function formatTimeRemaining(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const mm = String(totalMinutes).padStart(2, '0');
  const ss = String(remainingSeconds).padStart(2, '0');
  return `${mm}:${ss}`;
}
