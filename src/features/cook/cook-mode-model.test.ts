import { describe, expect, it } from '@jest/globals';

import {
    createCookModeState,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    progressFraction,
    progressLabel,
} from './cook-mode-model';

describe('cook-mode-model', () => {
  it('starts at index 0 with the supplied total step count', () => {
    const state = createCookModeState(5);
    expect(state.currentIndex).toBe(0);
    expect(state.totalSteps).toBe(5);
  });

  it('advances forward with nextStep', () => {
    const advanced = nextStep(createCookModeState(5));
    expect(advanced.currentIndex).toBe(1);
  });

  it('clamps at the last step when nextStep is called past the end', () => {
    let state = createCookModeState(3);
    state = nextStep(state); // 1
    state = nextStep(state); // 2
    state = nextStep(state); // would be 3, clamps to 2
    state = nextStep(state); // still 2
    expect(state.currentIndex).toBe(2);
    expect(isLastStep(state)).toBe(true);
  });

  it('clamps at the first step when prevStep is called from the start', () => {
    let state = createCookModeState(3);
    state = prevStep(state);
    state = prevStep(state);
    expect(state.currentIndex).toBe(0);
    expect(isFirstStep(state)).toBe(true);
  });

  it('reports first/last edges correctly for a middle step', () => {
    const state = createCookModeState(3, 1);
    expect(isFirstStep(state)).toBe(false);
    expect(isLastStep(state)).toBe(false);
  });

  it('renders progress label as "Step X of Y"', () => {
    expect(progressLabel(createCookModeState(7, 2))).toBe('Step 3 of 7');
    expect(progressLabel(createCookModeState(7, 0))).toBe('Step 1 of 7');
    expect(progressLabel(createCookModeState(7, 6))).toBe('Step 7 of 7');
  });

  it('returns a progress fraction between 0 and 1, where step 1 of 4 is 25%', () => {
    expect(progressFraction(createCookModeState(4, 0))).toBeCloseTo(0.25);
    expect(progressFraction(createCookModeState(4, 3))).toBeCloseTo(1);
  });

  it('handles zero-step recipes safely', () => {
    const state = createCookModeState(0);
    expect(state.totalSteps).toBe(0);
    expect(state.currentIndex).toBe(0);
    expect(progressFraction(state)).toBe(0);
    expect(progressLabel(state)).toBe('No steps');
    expect(isFirstStep(state)).toBe(true);
    expect(isLastStep(state)).toBe(true);
    // navigation is a no-op
    expect(nextStep(state).currentIndex).toBe(0);
    expect(prevStep(state).currentIndex).toBe(0);
  });

  it('clamps a starting index that is out of range into a valid step', () => {
    expect(createCookModeState(3, -2).currentIndex).toBe(0);
    expect(createCookModeState(3, 99).currentIndex).toBe(2);
  });
});
