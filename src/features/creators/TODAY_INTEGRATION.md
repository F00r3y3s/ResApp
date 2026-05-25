# Today Screen — Creator Highlight Integration (Deferred)

This documents the integration point for `src/features/today/today-screen.tsx` to show a "From creators you follow" section.

**DO NOT modify `src/features/today/` — this is a deferred integration point.**

## Data Shape

```typescript
type CreatorHighlight = {
  creator: {
    id: string;
    name: string;
    avatarEmoji: string;
  };
  recipe: {
    id: string;
    title: string;
    cuisine: string;
    prepMinutes: number;
    cookMinutes: number;
  };
};
```

## Function Signature

```typescript
import { SEED_RECIPES } from '@/features/recipes/seed-recipes';
import { getCreatorRecipes, SEED_CREATORS } from '@/features/creators/creators-data';
import { createFollowRepository } from '@/features/creators/follow-repository';

/**
 * Returns a random recipe from a random followed creator,
 * suitable for display in the Today screen's highlight section.
 *
 * Returns null if the user doesn't follow any creators.
 */
async function getCreatorHighlightForToday(
  storage: KeyValueStorage,
): Promise<CreatorHighlight | null> {
  const followRepo = createFollowRepository(storage);
  const followedIds = await followRepo.getFollowedCreatorIds();

  if (followedIds.length === 0) return null;

  // Pick a random followed creator
  const randomCreatorId = followedIds[Math.floor(Math.random() * followedIds.length)];
  const creator = SEED_CREATORS.find((c) => c.id === randomCreatorId);
  if (!creator) return null;

  // Pick a random recipe from that creator
  const recipes = getCreatorRecipes(randomCreatorId, SEED_RECIPES);
  if (recipes.length === 0) return null;

  const recipe = recipes[Math.floor(Math.random() * recipes.length)];

  return {
    creator: {
      id: creator.id,
      name: creator.name,
      avatarEmoji: creator.avatarEmoji,
    },
    recipe: {
      id: recipe.id,
      title: recipe.title,
      cuisine: recipe.cuisine,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
    },
  };
}
```

## Usage in Today Screen (future)

```tsx
// In today-screen.tsx (DO NOT implement yet):
const highlight = await getCreatorHighlightForToday(AsyncStorage);

if (highlight) {
  // Render a "From creators you follow" card:
  // - Show creator avatar emoji + name
  // - Show recipe title, cuisine, total time
  // - Tap navigates to /recipe/{highlight.recipe.id}
  // - "See all" navigates to /creators
}
```

## Navigation

- Creator list: `/creators` (guest tab, hidden from tab bar)
- Creator detail: `/creator/{id}` (modal)
