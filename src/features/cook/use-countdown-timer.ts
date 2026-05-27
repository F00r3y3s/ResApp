import { useCallback, useEffect, useRef, useState } from 'react';

import {
    createTimer,
    isFinished,
    pauseTimer,
    resetTimer,
    startTimer,
    tickTimer,
    type TimerState,
} from './timer-model';

/**
 * Hook that drives the pure timer model with a real setInterval.
 * The model itself has no side effects — this hook provides the clock.
 */
export function useCountdownTimer(durationSeconds: number) {
  const [state, setState] = useState<TimerState>(() => createTimer(durationSeconds));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when duration changes (e.g., navigating to a different step)
  useEffect(() => {
    setState(createTimer(durationSeconds));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [durationSeconds]);

  // Manage the interval based on status
  useEffect(() => {
    if (state.status === 'running') {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setState((prev) => tickTimer(prev));
        }, 1000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.status]);

  const start = useCallback(() => {
    setState((prev) => startTimer(prev));
  }, []);

  const pause = useCallback(() => {
    setState((prev) => pauseTimer(prev));
  }, []);

  const reset = useCallback(() => {
    setState((prev) => resetTimer(prev));
  }, []);

  return {
    state,
    isTimerFinished: isFinished(state),
    start,
    pause,
    reset,
  };
}
