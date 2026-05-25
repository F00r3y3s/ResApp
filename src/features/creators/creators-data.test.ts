import { describe, expect, it } from '@jest/globals';

import { SEED_RECIPES } from '@/features/recipes/seed-recipes';

import { getCreatorById, getCreatorRecipes, SEED_CREATORS } from './creators-data';

describe('creators-data', () => {
  it('has at least 3 seed creators', () => {
    expect(SEED_CREATORS.length).toBeGreaterThanOrEqual(3);
  });

  it('each creator has a unique id', () => {
    const ids = SEED_CREATORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each creator has at least one recipe id', () => {
    for (const creator of SEED_CREATORS) {
      expect(creator.recipeIds.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each creator recipe id maps to a real seed recipe', () => {
    const seedIds = new Set(SEED_RECIPES.map((r) => r.id));
    for (const creator of SEED_CREATORS) {
      for (const recipeId of creator.recipeIds) {
        expect(seedIds.has(recipeId)).toBe(true);
      }
    }
  });

  describe('getCreatorRecipes', () => {
    it('returns the correct recipes for a creator', () => {
      const recipes = getCreatorRecipes('creator-spice-trail', SEED_RECIPES);
      expect(recipes).toHaveLength(2);
      expect(recipes.map((r) => r.id)).toEqual(
        expect.arrayContaining(['seed-003', 'seed-004']),
      );
    });

    it('returns an empty array for an unknown creator', () => {
      const recipes = getCreatorRecipes('unknown-id', SEED_RECIPES);
      expect(recipes).toEqual([]);
    });
  });

  describe('getCreatorById', () => {
    it('returns the creator for a valid id', () => {
      const creator = getCreatorById('creator-family-kitchen');
      expect(creator).not.toBeNull();
      expect(creator!.name).toBe('Family Kitchen');
    });

    it('returns null for an unknown id', () => {
      expect(getCreatorById('nope')).toBeNull();
    });
  });
});
