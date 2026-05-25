import { Check, ShoppingCart } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { GroceryItemDraft } from '@/features/grocery/grocery-model';
import type { GroceryItem, GroceryRepository } from '@/features/grocery/grocery-repository';
import type { PantryRepository } from '@/features/pantry/pantry-repository';
import type { Recipe, RecipesRepository } from '@/features/recipes/recipes-repository';

import { getWeekStartIso } from './meal-plan-model';
import type { MealPlanRepository } from './meal-plan-repository';
import {
    type PreviewGroceryFromPlanResult,
    previewGroceryFromPlan
} from './plan-to-grocery-model';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type PlanToGroceryScreenContentProps = {
  mealPlanRepository: MealPlanRepository;
  recipesRepository: RecipesRepository;
  pantryRepository: PantryRepository;
  groceryRepository: GroceryRepository;
  onAddToGrocery?: (drafts: GroceryItemDraft[]) => Promise<GroceryItem[]>;
  now?: () => Date;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlanToGroceryScreenContent({
  mealPlanRepository,
  recipesRepository,
  pantryRepository,
  groceryRepository,
  onAddToGrocery,
  now,
}: PlanToGroceryScreenContentProps) {
  const insets = useSafeAreaInsets();
  const weekStartIso = useMemo(() => getWeekStartIso((now ?? (() => new Date()))()), [now]);

  const [preview, setPreview] = useState<PreviewGroceryFromPlanResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasEntries, setHasEntries] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [entries, allRecipes, pantryItems] = await Promise.all([
          mealPlanRepository.getWeek(weekStartIso),
          recipesRepository.listRecipes({ savedOnly: true }),
          pantryRepository.listItems(),
        ]);

        if (!isMounted) return;

        if (entries.length === 0) {
          setHasEntries(false);
          setIsLoading(false);
          return;
        }

        const recipesById = new Map<string, Recipe>();
        for (const recipe of allRecipes) {
          recipesById.set(recipe.localId, recipe);
        }

        const result = previewGroceryFromPlan({
          entries,
          recipesById,
          pantryItems,
        });

        setPreview(result);
        setErrorMessage(null);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(toUserMessage(error));
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
  }, [mealPlanRepository, recipesRepository, pantryRepository, weekStartIso]);

  const handleConfirm = useCallback(async () => {
    if (!preview || preview.toAdd.length === 0) return;
    setIsConfirming(true);
    try {
      if (onAddToGrocery) {
        await onAddToGrocery(preview.toAdd);
      }
      setIsConfirmed(true);
    } catch (error) {
      setErrorMessage(toUserMessage(error));
    } finally {
      setIsConfirming(false);
    }
  }, [preview, onAddToGrocery]);

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 30) }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Grocery from plan</Text>
        <Text style={styles.subtitle}>Week of {weekStartIso}</Text>
      </View>

      {errorMessage ? (
        <Text selectable style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      {isLoading ? <ActivityIndicator color={KitchenDesign.colors.orange} /> : null}

      {!isLoading && !hasEntries ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No meals planned</Text>
          <Text style={styles.emptyHint}>
            Add recipes to your meal plan first, then generate a grocery list here.
          </Text>
        </View>
      ) : null}

      {!isLoading && preview && !isConfirmed ? (
        <>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {preview.summary.toBuy} to buy · {preview.summary.pantryCovers} already in pantry
            </Text>
          </View>

          {preview.toAdd.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>To buy</Text>
              {preview.toAdd.map((item, index) => (
                <View key={`${item.normalizedName}-${item.unit}-${index}`} style={styles.itemRow}>
                  <ShoppingCart size={16} stroke={KitchenDesign.colors.ink} />
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {preview.alreadyHave.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Already in pantry</Text>
              {preview.alreadyHave.map((item, index) => (
                <View key={`pantry-${item.normalizedName}-${index}`} style={styles.itemRowMuted}>
                  <Check size={16} stroke={KitchenDesign.colors.sage} />
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemNameMuted}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {preview.toAdd.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm add to grocery list"
              disabled={isConfirming}
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.confirmButton,
                pressed ? styles.pressed : null,
              ]}>
              {isConfirming ? (
                <ActivityIndicator color={KitchenDesign.colors.cream} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  Add {preview.summary.toBuy} {preview.summary.toBuy === 1 ? 'item' : 'items'} to grocery
                </Text>
              )}
            </Pressable>
          ) : null}
        </>
      ) : null}

      {isConfirmed ? (
        <View style={styles.successCard}>
          <Check size={24} stroke={KitchenDesign.colors.sage} />
          <Text style={styles.successText}>Added to grocery list</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toUserMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong generating the grocery list.';
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 118,
    gap: 16,
  },
  header: {
    minHeight: 64,
    gap: 4,
  },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
  },
  subtitle: {
    color: KitchenDesign.colors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  emptyState: {
    minHeight: 120,
    borderRadius: KitchenDesign.radius.card,
    padding: 18,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  emptyTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyHint: {
    color: KitchenDesign.colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryCard: {
    minHeight: 52,
    borderRadius: KitchenDesign.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF8EA',
    borderColor: '#F1B35C',
    borderWidth: 1,
    justifyContent: 'center',
  },
  summaryText: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  itemRow: {
    minHeight: 52,
    borderRadius: KitchenDesign.radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  itemRowMuted: {
    minHeight: 48,
    borderRadius: KitchenDesign.radius.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: KitchenDesign.colors.linen,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    opacity: 0.75,
  },
  itemCopy: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  itemNameMuted: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmButton: {
    minHeight: 56,
    borderRadius: KitchenDesign.radius.button,
    backgroundColor: KitchenDesign.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  confirmButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 18,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.84,
  },
  successCard: {
    minHeight: 80,
    borderRadius: KitchenDesign.radius.card,
    padding: 18,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderColor: KitchenDesign.colors.sage,
    borderWidth: 1,
  },
  successText: {
    color: KitchenDesign.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
});
