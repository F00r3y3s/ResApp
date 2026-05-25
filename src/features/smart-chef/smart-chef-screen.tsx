import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe } from '@/features/recipes/recipes-repository';

import type { ScoredSuggestion } from './suggestion-engine';
import { generateLocalSuggestions } from './suggestion-engine';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type SmartChefScreenContentProps = {
  recipes: Recipe[];
  pantryItems: PantryItem[];
  preferences: GuestPreferences | null;
  now?: Date;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SmartChefScreenContent({
  recipes,
  pantryItems,
  preferences,
  now,
}: SmartChefScreenContentProps) {
  const suggestions = useMemo(
    () => generateLocalSuggestions({ recipes, pantryItems, preferences, now }),
    [recipes, pantryItems, preferences, now],
  );

  const isEmpty = suggestions.length === 0 && recipes.length === 0 && pantryItems.length === 0;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>What can I cook?</Text>

      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Add pantry items or save recipes to get suggestions.
          </Text>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={(item) => item.recipe.localId}
          renderItem={({ item }) => <SuggestionCard suggestion={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Suggestion Card
// ---------------------------------------------------------------------------

function SuggestionCard({ suggestion }: { suggestion: ScoredSuggestion }) {
  const { recipe, pantryMatchRatio } = suggestion;
  const matchPercent = Math.round(pantryMatchRatio * 100);
  const totalTime = recipe.prepMinutes + recipe.cookMinutes;

  const handlePress = () => {
    router.push(`/recipe/${recipe.localId}`);
  };

  return (
    <Pressable
      style={styles.card}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${recipe.title}`}
    >
      <Text testID="suggestion-title" style={styles.cardTitle}>
        {recipe.title}
      </Text>
      <View style={styles.cardMeta}>
        <Text style={styles.cardCuisine}>{recipe.cuisine}</Text>
        <Text style={styles.cardMatch}>{matchPercent}% match</Text>
        <Text style={styles.cardTime}>{totalTime} min</Text>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
    paddingTop: KitchenDesign.spacing.xl,
    paddingHorizontal: KitchenDesign.spacing.md,
  },
  header: {
    fontSize: KitchenDesign.type.title,
    fontWeight: '700',
    color: KitchenDesign.colors.ink,
    marginBottom: KitchenDesign.spacing.lg,
  },
  listContent: {
    paddingBottom: KitchenDesign.spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: KitchenDesign.spacing.lg,
  },
  emptyText: {
    fontSize: KitchenDesign.type.body,
    color: KitchenDesign.colors.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: KitchenDesign.colors.porcelain,
    borderRadius: KitchenDesign.radius.card,
    padding: KitchenDesign.spacing.md,
    marginBottom: KitchenDesign.spacing.sm,
    borderWidth: 1,
    borderColor: KitchenDesign.colors.border,
  },
  cardTitle: {
    fontSize: KitchenDesign.type.body,
    fontWeight: '600',
    color: KitchenDesign.colors.ink,
    marginBottom: KitchenDesign.spacing.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: KitchenDesign.spacing.sm,
  },
  cardCuisine: {
    fontSize: KitchenDesign.type.caption,
    color: KitchenDesign.colors.muted,
  },
  cardMatch: {
    fontSize: KitchenDesign.type.caption,
    color: KitchenDesign.colors.sage,
    fontWeight: '600',
  },
  cardTime: {
    fontSize: KitchenDesign.type.caption,
    color: KitchenDesign.colors.muted,
  },
});
