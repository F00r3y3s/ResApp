import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import { generateLocalSuggestions, type ScoredSuggestion } from './suggestion-engine';

export type LocalResponse = {
  text: string;
  suggestions: ScoredSuggestion[];
};

export type LocalResponderInput = {
  userMessage: string;
  recipes: Recipe[];
  pantryItems: PantryItem[];
  preferences: GuestPreferences | null;
  now?: Date;
};

/**
 * Generates a Smart Chef Lite response by calling the local suggestion engine
 * and formatting the top results as conversational text.
 *
 * Free users get this response. No network calls, no AI, no model keys.
 */
export function generateLocalResponse(input: LocalResponderInput): LocalResponse {
  const { userMessage, recipes, pantryItems, preferences, now } = input;

  const suggestions = generateLocalSuggestions({
    recipes,
    pantryItems,
    preferences,
    now,
    maxResults: 3,
  });

  // Empty pantry — friendly fallback, even if recipes exist
  if (pantryItems.length === 0 && recipes.length > 0) {
    return {
      text: "Add a few items to your pantry and I'll suggest recipes that use what you have.",
      suggestions: [],
    };
  }

  // Empty pantry or no recipes — friendly fallback
  if (suggestions.length === 0) {
    if (recipes.length === 0) {
      return {
        text: "I don't have any recipes yet. Save a few from the Recipes tab and I'll suggest what to cook.",
        suggestions: [],
      };
    }

    if (pantryItems.length === 0) {
      return {
        text: "Add a few items to your pantry and I'll suggest recipes that use what you have.",
        suggestions: [],
      };
    }

    return {
      text: "I couldn't find a great match in your saved recipes. Try adding more pantry items or saving more recipes.",
      suggestions: [],
    };
  }

  const top = suggestions[0];
  const matchPercent = Math.round(top.pantryMatchRatio * 100);
  const totalMinutes = top.recipe.prepMinutes + top.recipe.cookMinutes;

  const greeting = getGreeting(userMessage);

  let text = `${greeting} Based on what you have, **${top.recipe.title}** is a strong pick`;

  if (matchPercent > 0) {
    text += ` (${matchPercent}% pantry match`;
    if (totalMinutes > 0) {
      text += `, ${totalMinutes} min`;
    }
    text += ').';
  } else {
    text += '.';
  }

  if (suggestions.length > 1) {
    const others = suggestions.slice(1).map((s) => s.recipe.title);
    if (others.length === 1) {
      text += ` You could also try ${others[0]}.`;
    } else {
      text += ` Or try ${others.slice(0, -1).join(', ')} or ${others[others.length - 1]}.`;
    }
  }

  return {
    text,
    suggestions,
  };
}

function getGreeting(userMessage: string): string {
  const lower = userMessage.toLocaleLowerCase().trim();

  if (lower.includes('breakfast')) return 'For breakfast,';
  if (lower.includes('lunch')) return 'For lunch,';
  if (lower.includes('dinner') || lower.includes('tonight')) return 'For tonight,';
  if (lower.includes('quick') || lower.includes('fast')) return 'For something quick,';
  if (lower.includes('healthy')) return 'For a healthy option,';

  return 'Sure!';
}
