/**
 * Seed creator profiles — curated list of recipe creators
 * that map to subsets of the seed recipe catalog.
 */

import type { SeedRecipe } from '@/features/recipes/seed-recipes';

export type Creator = {
  id: string;
  name: string;
  bio: string;
  avatarEmoji: string;
  recipeIds: string[];
  cuisines: string[];
};

/**
 * Hand-curated creator profiles. Each maps to specific seed recipes.
 */
export const SEED_CREATORS: Creator[] = [
  {
    id: 'creator-family-kitchen',
    name: 'Family Kitchen',
    bio: 'Simple, wholesome meals the whole family will love. Focused on quick weeknight dinners with pantry staples.',
    avatarEmoji: '👨‍👩‍👧‍👦',
    recipeIds: ['seed-001', 'seed-002'],
    cuisines: ['levantine', 'british'],
  },
  {
    id: 'creator-spice-trail',
    name: 'The Spice Trail',
    bio: 'Exploring the rich flavours of South Asian cuisine — from fragrant curries to one-pot rice dishes.',
    avatarEmoji: '🌶️',
    recipeIds: ['seed-003', 'seed-004'],
    cuisines: ['indian'],
  },
  {
    id: 'creator-mediterranean-mornings',
    name: 'Mediterranean Mornings',
    bio: 'Bright, vibrant breakfast and brunch recipes inspired by Turkish and Levantine traditions.',
    avatarEmoji: '☀️',
    recipeIds: ['seed-005', 'seed-001'],
    cuisines: ['turkish', 'levantine'],
  },
  {
    id: 'creator-weeknight-wins',
    name: 'Weeknight Wins',
    bio: 'Under 30 minutes, minimal cleanup. Real food for busy families who refuse to compromise on taste.',
    avatarEmoji: '⚡',
    recipeIds: ['seed-003', 'seed-005'],
    cuisines: ['indian', 'turkish'],
  },
  {
    id: 'creator-plant-powered',
    name: 'Plant Powered',
    bio: 'Hearty vegan and vegetarian recipes that prove plants can be the star of any meal.',
    avatarEmoji: '🌱',
    recipeIds: ['seed-001', 'seed-003', 'seed-004'],
    cuisines: ['levantine', 'indian'],
  },
];

/**
 * Returns the seed recipes that belong to a given creator.
 */
export function getCreatorRecipes(
  creatorId: string,
  allRecipes: SeedRecipe[],
): SeedRecipe[] {
  const creator = SEED_CREATORS.find((c) => c.id === creatorId);
  if (!creator) return [];
  return allRecipes.filter((r) => creator.recipeIds.includes(r.id));
}

/**
 * Returns a single creator by ID, or null if not found.
 */
export function getCreatorById(creatorId: string): Creator | null {
  return SEED_CREATORS.find((c) => c.id === creatorId) ?? null;
}
