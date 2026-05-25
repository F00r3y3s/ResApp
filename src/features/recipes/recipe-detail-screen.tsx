import { router } from 'expo-router';
import {
    ArrowLeft,
    Bookmark,
    CalendarPlus,
    Check,
    ChefHat,
    Clock,
    Heart,
    Minus,
    Plus,
    Users
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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
import type { PantryItem, PantryRepository } from '@/features/pantry/pantry-repository';

import { computePantryMatch, normalizePantryMatchName } from './pantry-match';
import { RecipeHero } from './recipe-hero';
import type { Recipe, RecipesRepository } from './recipes-repository';
import { SEED_RECIPES } from './seed-recipes';

type RecipeDetailScreenContentProps = {
  recipeId: string;
  repository: RecipesRepository;
  pantryRepository?: PantryRepository;
};

export function RecipeDetailScreenContent({
  recipeId,
  repository,
  pantryRepository,
}: RecipeDetailScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [servingsAdjustment, setServingsAdjustment] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!pantryRepository) {
      setPantryItems([]);
      return () => {
        isMounted = false;
      };
    }

    pantryRepository
      .listItems()
      .then((items) => {
        if (isMounted) {
          setPantryItems(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPantryItems([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pantryRepository]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const next = await repository.getRecipeById(recipeId);
        if (isMounted) {
          setRecipe(next);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load recipe.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [recipeId, repository]);

  const totalMinutes = recipe ? recipe.prepMinutes + recipe.cookMinutes : 0;
  const adjustedServings = useMemo(
    () => (recipe ? Math.max(1, recipe.servings + servingsAdjustment) : 1),
    [recipe, servingsAdjustment],
  );

  const pantryMatch = useMemo(() => {
    if (!recipe || !pantryRepository) {
      return null;
    }
    return computePantryMatch(recipe, pantryItems);
  }, [recipe, pantryRepository, pantryItems]);

  const matchedNormalizedNames = useMemo(() => {
    if (!pantryMatch) {
      return new Set<string>();
    }
    return new Set(pantryMatch.matched.map((m) => normalizePantryMatchName(m.ingredient.name)));
  }, [pantryMatch]);

  async function handleSave() {
    if (!recipe || isSaving || recipe.isSaved) {
      return;
    }
    const seed = SEED_RECIPES.find((s) => s.id === recipe.seedId);
    if (!seed) {
      return;
    }

    setIsSaving(true);
    try {
      const saved = await repository.saveRecipe(seed);
      setRecipe(saved);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save recipe.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={KitchenDesign.colors.orange} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={[styles.centered, { paddingTop: Math.max(insets.top, 32) }]}>
        <Text style={styles.missingTitle}>We couldn&apos;t find that recipe</Text>
        <Text style={styles.missingHint}>It may have been removed or never imported yet.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={20} stroke={KitchenDesign.colors.cream} />
          <Text style={styles.primaryButtonText}>Back to recipes</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 18) }]}>

      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={22} stroke={KitchenDesign.colors.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recipe.isSaved ? 'Saved' : 'Save'}
          onPress={handleSave}
          disabled={isSaving || recipe.isSaved}
          style={({ pressed }) => [
            styles.saveChip,
            recipe.isSaved ? styles.saveChipActive : null,
            pressed && !isSaving ? styles.pressed : null,
          ]}>
          {isSaving ? (
            <ActivityIndicator color={KitchenDesign.colors.cream} />
          ) : recipe.isSaved ? (
            <Heart size={18} fill={KitchenDesign.colors.cream} stroke={KitchenDesign.colors.cream} />
          ) : (
            <Bookmark size={18} stroke={KitchenDesign.colors.ink} />
          )}
          <Text style={[styles.saveChipText, recipe.isSaved ? styles.saveChipTextActive : null]}>
            {recipe.isSaved ? 'Saved' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.heroCard}>
        <RecipeHero
          seedId={recipe.seedId}
          cuisine={recipe.cuisine}
          title={recipe.title}
          size={220}
          height={220}
          variant="hero"
        />
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.cuisine}>{formatCuisine(recipe.cuisine)} · {recipe.source}</Text>
      </View>

      <View style={styles.tagRow}>
        {recipe.dietTags.map((tag) => (
          <View key={tag} style={styles.dietPill}>
            <Text style={styles.dietPillText}>{formatTag(tag)}</Text>
          </View>
        ))}
        {recipe.allergens.map((allergen) => (
          <View key={allergen} style={styles.allergenPill}>
            <Text style={styles.allergenPillText}>Contains {formatTag(allergen)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Clock size={20} stroke={KitchenDesign.colors.orangePressed} />
          <Text style={styles.metaText}>{totalMinutes} min</Text>
        </View>
        <View style={styles.metaItem}>
          <Users size={20} stroke={KitchenDesign.colors.orangePressed} />
          <Text style={styles.metaText}>Serves {adjustedServings}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add to plan"
          onPress={() => router.push('/planner')}
          style={({ pressed }) => [styles.actionButton, pressed ? styles.pressed : null]}>
          <CalendarPlus size={20} stroke={KitchenDesign.colors.ink} />
          <Text style={styles.actionButtonText}>Add to plan</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open cook mode"
          onPress={() => router.push('/recipes')}
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonPrimary,
            pressed ? styles.pressed : null,
          ]}>
          <ChefHat size={20} stroke={KitchenDesign.colors.cream} />
          <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
            Cook mode
          </Text>
        </Pressable>
      </View>

      <View style={styles.servingsCard}>
        <Text style={styles.sectionTitle}>Servings</Text>
        <View style={styles.stepperRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decrease servings"
            onPress={() => setServingsAdjustment((n) => Math.max(1 - recipe.servings, n - 1))}
            style={({ pressed }) => [styles.stepperButton, pressed ? styles.pressed : null]}>
            <Minus size={20} stroke={KitchenDesign.colors.ink} />
          </Pressable>
          <Text style={styles.stepperValue}>{adjustedServings}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Increase servings"
            onPress={() => setServingsAdjustment((n) => Math.min(20 - recipe.servings, n + 1))}
            style={({ pressed }) => [styles.stepperButton, pressed ? styles.pressed : null]}>
            <Plus size={20} stroke={KitchenDesign.colors.ink} />
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        {pantryMatch && pantryMatch.totalCount > 0 ? (
          <Text style={styles.sectionMeta}>
            {pantryMatch.matchedCount === pantryMatch.totalCount
              ? `Uses pantry · ${pantryMatch.totalCount} of ${pantryMatch.totalCount}`
              : `Missing ${pantryMatch.totalCount - pantryMatch.matchedCount} of ${pantryMatch.totalCount}`}
          </Text>
        ) : null}
        {recipe.ingredients.map((ingredient, index) => {
          const isMatched = matchedNormalizedNames.has(normalizePantryMatchName(ingredient.name));
          const showStatus = pantryMatch !== null;
          return (
            <View key={`${ingredient.name}-${index}`} style={styles.ingredientRow}>
              {showStatus ? (
                isMatched ? (
                  <View
                    accessibilityLabel="In pantry"
                    style={[styles.statusIcon, styles.statusIconMatched]}>
                    <Check size={14} stroke={KitchenDesign.colors.cream} />
                  </View>
                ) : (
                  <View
                    accessibilityLabel="Missing from pantry"
                    style={[styles.statusIcon, styles.statusIconMissing]}
                  />
                )
              ) : (
                <View style={styles.ingredientBullet} />
              )}
              <Text style={styles.ingredientName}>{ingredient.name}</Text>
              {showStatus && !isMatched ? (
                <View style={styles.needToBuyPill}>
                  <Text style={styles.needToBuyText}>Need to buy</Text>
                </View>
              ) : null}
              <Text style={styles.ingredientQty}>
                {scaleQuantity(ingredient.quantity, recipe.servings, adjustedServings)} {ingredient.unit}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Method</Text>
        <Text style={styles.sectionMeta}>{recipe.steps.length} steps · ready in {totalMinutes} min</Text>
        {recipe.steps.slice(0, 3).map((step) => (
          <View key={step.order} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{step.order}</Text>
            </View>
            <Text style={styles.stepText}>{step.instruction}</Text>
          </View>
        ))}
        {recipe.steps.length > 3 ? (
          <Text style={styles.methodMore}>
            +{recipe.steps.length - 3} more steps in cook mode
          </Text>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Nutrition</Text>
        <Text style={styles.sectionMeta}>Estimated per serving · confirm with Smart Chef</Text>
        <View style={styles.nutritionGrid}>
          <NutritionCell label="Calories" value="—" />
          <NutritionCell label="Protein" value="—" />
          <NutritionCell label="Carbs" value="—" />
          <NutritionCell label="Fat" value="—" />
        </View>
      </View>

      {errorMessage ? (
        <Text selectable style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      <Text style={styles.attribution}>{recipe.attribution} · {recipe.license}</Text>
    </ScrollView>
  );
}

function formatCuisine(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function NutritionCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.nutritionCell}>
      <Text style={styles.nutritionValue}>{value}</Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
    </View>
  );
}

function formatTag(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}

function scaleQuantity(quantityText: string, baseServings: number, targetServings: number): string {
  const number = Number(quantityText);
  if (Number.isNaN(number) || baseServings <= 0) {
    return quantityText;
  }
  const scaled = (number * targetServings) / baseServings;
  if (scaled === Math.floor(scaled)) {
    return String(scaled);
  }
  return scaled.toFixed(1).replace(/\.0$/, '');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KitchenDesign.colors.cream },
  content: { paddingHorizontal: 18, paddingBottom: 140, gap: 18 },
  centered: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  saveChip: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: KitchenDesign.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  saveChipActive: {
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.orange,
  },
  saveChipText: {
    color: KitchenDesign.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  saveChipTextActive: {
    color: KitchenDesign.colors.cream,
  },
  heroCard: {
    minHeight: 220,
    borderRadius: 22,
    overflow: 'hidden',
  },
  titleBlock: { gap: 6 },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  cuisine: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietPill: {
    minHeight: 28,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  dietPillText: {
    color: KitchenDesign.colors.ink,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  allergenPill: {
    minHeight: 28,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE6DC',
  },
  allergenPillText: {
    color: KitchenDesign.colors.danger,
    fontSize: 12,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  servingsCard: {
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  stepperValue: {
    minWidth: 32,
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  sectionCard: {
    borderRadius: 18,
    padding: 18,
    gap: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  sectionTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  sectionMeta: {
    color: KitchenDesign.colors.muted,
    fontSize: 14,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 36,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: KitchenDesign.colors.orangePressed,
  },
  statusIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconMatched: {
    backgroundColor: KitchenDesign.colors.sage,
  },
  statusIconMissing: {
    borderWidth: 1.5,
    borderColor: KitchenDesign.colors.border,
    backgroundColor: 'transparent',
  },
  needToBuyPill: {
    minHeight: 22,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE6DC',
  },
  needToBuyText: {
    color: KitchenDesign.colors.danger,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  ingredientName: {
    flex: 1,
    color: KitchenDesign.colors.ink,
    fontSize: 16,
  },
  ingredientQty: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  stepRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
  },
  stepBadgeText: {
    color: KitchenDesign.colors.cream,
    fontSize: 13,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    color: KitchenDesign.colors.ink,
    fontSize: 15,
    lineHeight: 22,
  },
  cookModeButton: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    backgroundColor: KitchenDesign.colors.orange,
  },
  cookModeButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  methodMore: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  actionButtonPrimary: {
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.orange,
  },
  actionButtonText: {
    color: KitchenDesign.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  actionButtonTextPrimary: {
    color: KitchenDesign.colors.cream,
  },
  nutritionGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 4,
  },
  nutritionCell: {
    flex: 1,
    minHeight: 64,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: KitchenDesign.colors.linen,
  },
  nutritionValue: {
    color: KitchenDesign.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  nutritionLabel: {
    color: KitchenDesign.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 17,
    fontWeight: '900',
  },
  missingTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  missingHint: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  attribution: {
    color: KitchenDesign.colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
});
