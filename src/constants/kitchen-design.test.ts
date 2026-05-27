import { describe, expect, it } from '@jest/globals';

import { KitchenDesign } from './kitchen-design';

describe('KitchenDesign', () => {
  it('captures the warm Family Kitchen reference palette and geometry', () => {
    expect(KitchenDesign.colors.ink).toBe('#173529');
    expect(KitchenDesign.colors.cream).toBe('#FFF9F1');
    expect(KitchenDesign.colors.orange).toBe('#D97908');
    expect(KitchenDesign.radius.sheet).toBe(32);
    expect(KitchenDesign.radius.button).toBe(12);
  });
});
