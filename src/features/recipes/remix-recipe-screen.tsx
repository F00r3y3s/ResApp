/**
 * Remix Recipe Screen — shows the original recipe with a "Remix this recipe"
 * button. On remix, creates a new private recipe via the repository and
 * navigates to the new recipe's detail view.
 *
 * ## Circle post integration (deferred)
 * `src/features/cooksnap/` should eventually show a "Remixed from" badge
 * on cooksnap cards when the recipe has `remixedFrom`. This is not yet
 * implemented — do NOT modify cooksnap files.
 */

import { router } from 'expo-router';
import { GitFork } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';

import type { Recipe, RecipesRepository } from './recipes-repository';
import { remixRecipe } from './remix-recipe';

type RemixRecipeScreenContentProps = {
  recipe: Recipe;
  repository: RecipesRepository;
};

export function RemixRecipeScreenContent({
  recipe,
  repository,
}: RemixRecipeScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRemix() {
    if (isCreating) return;

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const input = remixRecipe(recipe);
      const created = await repository.createRecipe(input);
      router.push(`/recipe/${created.localId}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not create remix.',
      );
      setIsCreating(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 18) },
      ]}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.cuisine}>
          {formatCuisine(recipe.cuisine)} · {recipe.source}
        </Text>
      </View>

      <View style={styles.attributionBadge}>
        <GitFork size={16} stroke={KitchenDesign.colors.orangePressed} />
        <Text style={styles.attributionText}>
          Remixed from {recipe.title}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>What is a remix?</Text>
        <Text style={styles.infoBody}>
          A remix creates your own private copy of this recipe. You can edit it
          freely — change ingredients, adjust steps, make it yours. The original
          attribution is always preserved.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleRemix}
        disabled={isCreating}
        style={({ pressed }) => [
          styles.remixButton,
          pressed && !isCreating ? styles.pressed : null,
          isCreating ? styles.remixButtonDisabled : null,
        ]}>
        {isCreating ? (
          <>
            <ActivityIndicator color={KitchenDesign.colors.cream} size="small" />
            <Text style={styles.remixButtonText}>Creating remix…</Text>
          </>
        ) : (
          <>
            <GitFork size={20} stroke={KitchenDesign.colors.cream} />
            <Text style={styles.remixButtonText}>Remix this recipe</Text>
          </>
        )}
      </Pressable>

      {errorMessage ? (
        <Text selectable style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function formatCuisine(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KitchenDesign.colors.cream },
  content: { paddingHorizontal: 18, paddingBottom: 80, gap: 18 },
  titleBlock: { gap: 6 },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  cuisine: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
  },
  attributionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: KitchenDesign.colors.linen,
  },
  attributionText: {
    color: KitchenDesign.colors.orangePressed,
    fontSize: 14,
    fontWeight: '700',
  },
  infoCard: {
    borderRadius: 18,
    padding: 18,
    gap: 8,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  infoTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  infoBody: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  remixButton: {
    minHeight: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: KitchenDesign.colors.orange,
  },
  remixButtonDisabled: {
    opacity: 0.7,
  },
  remixButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 17,
    fontWeight: '900',
  },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.84,
  },
});
