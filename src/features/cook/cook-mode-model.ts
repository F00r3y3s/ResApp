/**
 * Pure step-navigation state for cook mode.
 *
 * The model is intentionally framework-agnostic so it can be tested as a pure
 * function and reused inside a component, a hook, or an offline driver. All
 * navigation operations clamp to a valid range — they never throw, and they
 * never return an out-of-range index.
 */

export type CookModeState = {
  /** Zero-based index of the step currently being shown. */
  currentIndex: number;
  /** Total number of steps in the recipe. May be 0 for malformed recipes. */
  totalSteps: number;
};

function clampIndex(totalSteps: number, index: number): number {
  if (totalSteps <= 0) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index > totalSteps - 1) {
    return totalSteps - 1;
  }
  return index;
}

export function createCookModeState(totalSteps: number, startIndex = 0): CookModeState {
  const safeTotal = Math.max(0, Math.floor(totalSteps));
  return {
    totalSteps: safeTotal,
    currentIndex: clampIndex(safeTotal, Math.floor(startIndex)),
  };
}

export function nextStep(state: CookModeState): CookModeState {
  if (state.totalSteps <= 0) {
    return state;
  }
  const target = clampIndex(state.totalSteps, state.currentIndex + 1);
  if (target === state.currentIndex) {
    return state;
  }
  return { ...state, currentIndex: target };
}

export function prevStep(state: CookModeState): CookModeState {
  if (state.totalSteps <= 0) {
    return state;
  }
  const target = clampIndex(state.totalSteps, state.currentIndex - 1);
  if (target === state.currentIndex) {
    return state;
  }
  return { ...state, currentIndex: target };
}

export function isFirstStep(state: CookModeState): boolean {
  if (state.totalSteps <= 0) {
    return true;
  }
  return state.currentIndex <= 0;
}

export function isLastStep(state: CookModeState): boolean {
  if (state.totalSteps <= 0) {
    return true;
  }
  return state.currentIndex >= state.totalSteps - 1;
}

export function progressLabel(state: CookModeState): string {
  if (state.totalSteps <= 0) {
    return 'No steps';
  }
  return `Step ${state.currentIndex + 1} of ${state.totalSteps}`;
}

export function progressFraction(state: CookModeState): number {
  if (state.totalSteps <= 0) {
    return 0;
  }
  return (state.currentIndex + 1) / state.totalSteps;
}
