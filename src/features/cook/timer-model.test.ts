import { describe, expect, it } from '@jest/globals';

import {
    createTimer,
    formatTimeRemaining,
    isFinished,
    pauseTimer,
    resetTimer,
    startTimer,
    tickTimer,
} from './timer-model';

describe('timer-model', () => {
  it('creates a timer with the given duration in seconds and idle status', () => {
    const timer = createTimer(120);
    expect(timer.remaining).toBe(120);
    expect(timer.status).toBe('idle');
    expect(timer.durationSeconds).toBe(120);
  });

  it('clamps negative durations to 0', () => {
    const timer = createTimer(-5);
    expect(timer.remaining).toBe(0);
    expect(timer.durationSeconds).toBe(0);
  });

  it('floors fractional durations', () => {
    const timer = createTimer(90.7);
    expect(timer.remaining).toBe(90);
    expect(timer.durationSeconds).toBe(90);
  });

  it('transitions from idle to running with startTimer', () => {
    const timer = startTimer(createTimer(60));
    expect(timer.status).toBe('running');
    expect(timer.remaining).toBe(60);
  });

  it('transitions from paused to running with startTimer', () => {
    let timer = createTimer(60);
    timer = startTimer(timer);
    timer = pauseTimer(timer);
    timer = startTimer(timer);
    expect(timer.status).toBe('running');
  });

  it('does not restart a finished timer with startTimer', () => {
    let timer = createTimer(1);
    timer = startTimer(timer);
    timer = tickTimer(timer); // remaining → 0, status → finished
    timer = startTimer(timer);
    expect(timer.status).toBe('finished');
  });

  it('transitions from running to paused with pauseTimer', () => {
    let timer = createTimer(60);
    timer = startTimer(timer);
    timer = pauseTimer(timer);
    expect(timer.status).toBe('paused');
    expect(timer.remaining).toBe(60);
  });

  it('pauseTimer is a no-op when idle or finished', () => {
    const idle = createTimer(60);
    expect(pauseTimer(idle).status).toBe('idle');

    let finished = createTimer(1);
    finished = startTimer(finished);
    finished = tickTimer(finished);
    expect(pauseTimer(finished).status).toBe('finished');
  });

  it('tickTimer decrements remaining by 1 when running', () => {
    let timer = createTimer(10);
    timer = startTimer(timer);
    timer = tickTimer(timer);
    expect(timer.remaining).toBe(9);
    expect(timer.status).toBe('running');
  });

  it('tickTimer transitions to finished when remaining reaches 0', () => {
    let timer = createTimer(2);
    timer = startTimer(timer);
    timer = tickTimer(timer); // 1
    timer = tickTimer(timer); // 0 → finished
    expect(timer.remaining).toBe(0);
    expect(timer.status).toBe('finished');
    expect(isFinished(timer)).toBe(true);
  });

  it('tickTimer is a no-op when paused, idle, or finished', () => {
    const idle = createTimer(60);
    expect(tickTimer(idle).remaining).toBe(60);

    let paused = createTimer(60);
    paused = startTimer(paused);
    paused = tickTimer(paused); // 59
    paused = pauseTimer(paused);
    expect(tickTimer(paused).remaining).toBe(59);

    let finished = createTimer(1);
    finished = startTimer(finished);
    finished = tickTimer(finished);
    expect(tickTimer(finished).remaining).toBe(0);
  });

  it('resetTimer returns to idle with the original duration', () => {
    let timer = createTimer(120);
    timer = startTimer(timer);
    timer = tickTimer(timer);
    timer = tickTimer(timer);
    timer = resetTimer(timer);
    expect(timer.status).toBe('idle');
    expect(timer.remaining).toBe(120);
  });

  it('isFinished returns true only when status is finished', () => {
    expect(isFinished(createTimer(60))).toBe(false);
    let timer = createTimer(1);
    timer = startTimer(timer);
    expect(isFinished(timer)).toBe(false);
    timer = tickTimer(timer);
    expect(isFinished(timer)).toBe(true);
  });

  describe('formatTimeRemaining', () => {
    it('formats seconds as MM:SS', () => {
      expect(formatTimeRemaining(0)).toBe('00:00');
      expect(formatTimeRemaining(59)).toBe('00:59');
      expect(formatTimeRemaining(60)).toBe('01:00');
      expect(formatTimeRemaining(90)).toBe('01:30');
      expect(formatTimeRemaining(600)).toBe('10:00');
      expect(formatTimeRemaining(3599)).toBe('59:59');
    });

    it('handles durations over 60 minutes', () => {
      expect(formatTimeRemaining(3600)).toBe('60:00');
      expect(formatTimeRemaining(3661)).toBe('61:01');
    });
  });
});
