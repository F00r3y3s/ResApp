import { Check, RefreshCw, X } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { GuestPreferences } from '@/features/onboarding/preferences-repository';
import type { PantryItem } from '@/features/pantry/pantry-repository';
import type { Recipe, RecipesRepository } from '@/features/recipes/recipes-repository';

import { MEAL_PLAN_DAY_LABELS, MEAL_PLAN_SLOT_LABELS } from './meal-plan-model';
import type { MealPlanDay, MealPlanRepository, MealSlot } from './meal-plan-repository';
import { generateWeeklyPlan, type GeneratedPlanSlot } from './plan-generator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeneratePlanScreenContentProps = {
  recipes: Recipe[];
  pantryItems: PantryItem[];
  preferences: GuestPreferences | null;
  weekStartIso: string;
  repository: MealPlanRepository;
  recipesRepository: RecipesRepository;
  onClose: () => void;
  now?: () => Date;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GeneratePlanScreenContent({
  recipes,
  pantryItems,
  preferences,
  weekStartIso,
  repository,
  onClose,
  now,
}: GeneratePlanScreenContentProps) {
  const [seed, setSeed] = useState(() => Date.now());
  const [isSaving, setIsSaving] = useState(false);

  const plan = useMemo(
    () =>
      generateWeeklyPlan({
        recipes,
        pantryItems,
        preferences,
        seed,
        now: now?.(),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `now` is a stable factory prop
    [recipes, pantryItems, preferences, seed],
  );

  const recipesById = useMemo(() => {
    const map = new Map<string, Recipe>();
    for (const recipe of recipes) {
      map.set(recipe.localId, recipe);
    }
    return map;
  }, [recipes]);

  const handleRegenerate = useCallback(() => {
    setSeed((prev) => prev + 1);
  }, []);

  const handleAccept = useCallback(async () => {
    setIsSaving(true);
    try {
      for (const slot of plan.slots) {
        await repository.setEntry({
          weekStartIso,
          day: slot.day,
          slot: slot.slot,
          recipeId: slot.recipeId,
        });
      }
      onClose();
    } catch {
      // Error handling — in production we'd show a toast
      setIsSaving(false);
    }
  }, [plan, repository, weekStartIso, onClose]);

  // Insufficient recipes state
  if (plan.insufficientRecipes) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Generate plan</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel plan generation"
            onPress={onClose}
            style={styles.closeButton}>
            <X size={22} stroke={KitchenDesign.colors.ink} />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Not enough recipes</Text>
          <Text style={styles.emptyHint}>
            You need at least 3 saved recipes to generate a meal plan. Save more
            recipes from the Recipes tab to get started.
          </Text>
        </View>
      </View>
    );
  }

  // Group slots by day for display
  const slotsByDay = groupSlotsByDay(plan.slots);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Generated plan</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel plan generation"
          onPress={onClose}
          style={styles.closeButton}>
          <X size={22} stroke={KitchenDesign.colors.ink} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {([0, 1, 2, 3, 4, 5, 6] as MealPlanDay[]).map((day) => {
          const daySlots = slotsByDay.get(day) ?? [];
          if (daySlots.length === 0) return null;

          return (
            <View key={day} style={styles.dayCard}>
              <Text style={styles.dayLabel}>{MEAL_PLAN_DAY_LABELS[day]}</Text>
              {daySlots.map((slot) => {
                const recipe = recipesById.get(slot.recipeId);
                return (
                  <View key={`${day}-${slot.slot}`} style={styles.slotRow}>
                    <Text style={styles.slotLabel}>
                      {MEAL_PLAN_SLOT_LABELS[slot.slot]}
                    </Text>
                    <Text style={styles.recipeTitle} numberOfLines={1}>
                      {recipe?.title ?? 'Unknown recipe'}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Regenerate plan"
          onPress={handleRegenerate}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed ? styles.pressed : null,
          ]}>
          <RefreshCw size={18} stroke={KitchenDesign.colors.ink} />
          <Text style={styles.secondaryButtonText}>Regenerate</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Accept generated plan"
          onPress={handleAccept}
          disabled={isSaving}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.pressed : null,
          ]}>
          {isSaving ? (
            <ActivityIndicator size="small" color={KitchenDesign.colors.cream} />
          ) : (
            <>
              <Check size={18} stroke={KitchenDesign.colors.cream} />
              <Text style={styles.primaryButtonText}>Accept</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupSlotsByDay(slots: GeneratedPlanSlot[]): Map<MealPlanDay, GeneratedPlanSlot[]> {
  const map = new Map<MealPlanDay, GeneratedPlanSlot[]>();
  for (const slot of slots) {
    const existing = map.get(slot.day) ?? [];
    existing.push(slot);
    map.set(slot.day, existing);
  }
  // Sort each day's slots in meal order
  const slotOrder: Record<MealSlot, number> = { breakfast: 0, lunch: 1, dinner: 2 };
  for (const [, daySlots] of map) {
    daySlots.sort((a, b) => slotOrder[a.slot] - slotOrder[b.slot]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 16,
  },
  dayCard: {
    borderRadius: KitchenDesign.radius.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    gap: 8,
  },
  dayLabel: {
    color: KitchenDesign.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 36,
  },
  slotLabel: {
    width: 80,
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  recipeTitle: {
    flex: 1,
    color: KitchenDesign.colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: KitchenDesign.radius.button,
    borderWidth: 1,
    borderColor: KitchenDesign.colors.border,
    backgroundColor: KitchenDesign.colors.porcelain,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: KitchenDesign.radius.button,
    backgroundColor: KitchenDesign.colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  emptyTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyHint: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
