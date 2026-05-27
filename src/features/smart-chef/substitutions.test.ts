import { describe, expect, it } from '@jest/globals';

import {
    detectAllergyConflicts,
    lookupSubstitutions,
    SUBSTITUTION_TABLE,
} from './substitutions';

describe('lookupSubstitutions', () => {
  it('returns substitutes for a known ingredient', () => {
    const result = lookupSubstitutions('butter');

    expect(result.found).toBe(true);
    expect(result.ingredient).toBe('butter');
    expect(result.safeSubstitutes.length).toBeGreaterThan(0);
    expect(result.safeSubstitutes.some((s) => s.name === 'olive oil')).toBe(true);
  });

  it('returns found=false when ingredient is not in table', () => {
    const result = lookupSubstitutions('unobtanium');

    expect(result.found).toBe(false);
    expect(result.safeSubstitutes).toHaveLength(0);
    expect(result.blockedSubstitutes).toHaveLength(0);
  });

  it('is case-insensitive and trim-tolerant', () => {
    const result1 = lookupSubstitutions('  BUTTER  ');
    const result2 = lookupSubstitutions('Butter');

    expect(result1.found).toBe(true);
    expect(result2.found).toBe(true);
  });

  it('blocks substitutes that contain user allergens', () => {
    const result = lookupSubstitutions('butter', { userAllergens: ['dairy'] });

    expect(result.found).toBe(true);
    // Ghee contains dairy and should be blocked
    expect(result.safeSubstitutes.every((s) => !s.allergens.includes('dairy'))).toBe(true);
    expect(result.blockedSubstitutes.some((b) => b.substitute.name === 'ghee')).toBe(true);
  });

  it('reports the conflict allergen for blocked substitutes', () => {
    const result = lookupSubstitutions('milk', { userAllergens: ['tree-nuts', 'soy'] });

    const almondMilk = result.blockedSubstitutes.find(
      (b) => b.substitute.name === 'almond milk',
    );
    expect(almondMilk?.conflictAllergens).toContain('tree-nuts');

    const soyMilk = result.blockedSubstitutes.find((b) => b.substitute.name === 'soy milk');
    expect(soyMilk?.conflictAllergens).toContain('soy');
  });

  it('returns all substitutes as safe when user has no allergies', () => {
    const result = lookupSubstitutions('milk', { userAllergens: [] });

    expect(result.blockedSubstitutes).toHaveLength(0);
    expect(result.safeSubstitutes.length).toBe(
      SUBSTITUTION_TABLE.find((e) => e.ingredient === 'milk')!.substitutes.length,
    );
  });

  it('peanut allergic user gets sunflower seed butter as a safe peanut butter sub', () => {
    const result = lookupSubstitutions('peanut butter', { userAllergens: ['tree-nuts', 'peanuts'] });

    expect(result.safeSubstitutes.some((s) => s.name === 'sunflower seed butter')).toBe(true);
    expect(result.safeSubstitutes.some((s) => s.name === 'almond butter')).toBe(false);
  });
});

describe('detectAllergyConflicts', () => {
  it('returns empty array when user has no allergies', () => {
    const conflicts = detectAllergyConflicts(['Almonds', 'Milk'], []);

    expect(conflicts).toEqual([]);
  });

  it('detects dairy allergens in ingredients', () => {
    const conflicts = detectAllergyConflicts(
      ['Whole milk', 'Butter', 'Olive oil'],
      ['dairy'],
    );

    expect(conflicts).toHaveLength(2);
    expect(conflicts.some((c) => c.ingredient === 'Whole milk')).toBe(true);
    expect(conflicts.some((c) => c.ingredient === 'Butter')).toBe(true);
  });

  it('detects tree-nut allergens via substring matching', () => {
    const conflicts = detectAllergyConflicts(
      ['Almond flour', 'Olive oil', 'Cashew cream'],
      ['tree-nuts'],
    );

    expect(conflicts).toHaveLength(2);
    const ingredients = conflicts.map((c) => c.ingredient);
    expect(ingredients).toContain('Almond flour');
    expect(ingredients).toContain('Cashew cream');
  });

  it('detects multiple allergens in a single ingredient', () => {
    // "Yogurt" only has dairy allergen in the map, so check a multi-allergen scenario
    const conflicts = detectAllergyConflicts(
      ['Cheese pasta'], // dairy + gluten
      ['dairy', 'gluten'],
    );

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].allergens).toContain('dairy');
    expect(conflicts[0].allergens).toContain('gluten');
  });

  it('does not flag ingredients without matching allergens', () => {
    const conflicts = detectAllergyConflicts(
      ['Rice', 'Beans', 'Tomato', 'Onion'],
      ['dairy', 'eggs'],
    );

    expect(conflicts).toEqual([]);
  });

  it('detects soy in tofu', () => {
    const conflicts = detectAllergyConflicts(['Silken tofu', 'Rice'], ['soy']);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].ingredient).toBe('Silken tofu');
    expect(conflicts[0].allergens).toContain('soy');
  });

  it('detects seafood in shrimp and fish', () => {
    const conflicts = detectAllergyConflicts(
      ['Grilled shrimp', 'Salmon fillet', 'Bread'],
      ['seafood'],
    );

    expect(conflicts).toHaveLength(2);
  });

  it('is case-insensitive', () => {
    const conflicts = detectAllergyConflicts(['ALMONDS', 'almond milk'], ['tree-nuts']);

    expect(conflicts).toHaveLength(2);
  });
});
