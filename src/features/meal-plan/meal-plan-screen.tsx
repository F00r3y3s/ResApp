import { Plus, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { Recipe, RecipesRepository } from '@/features/recipes/recipes-repository';

import {
    buildWeekGrid,
    getWeekStartIso,
    MEAL_PLAN_SLOT_LABELS,
    type WeekGridDay,
    type WeekGridSlot,
} from './meal-plan-model';
import type {
    MealPlanDay,
    MealPlanEntry,
    MealPlanRepository,
    MealSlot,
} from './meal-plan-repository';

type MealPlanScreenContentProps = {
  repository: MealPlanRepository;
  recipesRepository: RecipesRepository;
  now?: () => Date;
};

type SelectedSlot = {
  day: MealPlanDay;
  slot: MealSlot;
  weekday: string;
};

export function MealPlanScreenContent({
  repository,
  recipesRepository,
  now,
}: MealPlanScreenContentProps) {
  const insets = useSafeAreaInsets();
  const weekStartIso = useMemo(() => getWeekStartIso((now ?? (() => new Date()))()), [now]);

  const [entries, setEntries] = useState<MealPlanEntry[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
  const [isPickerLoading, setIsPickerLoading] = useState(false);

  const grid = useMemo(
    () => buildWeekGrid({ weekStartIso, entries }),
    [weekStartIso, entries],
  );

  const recipesById = useMemo(() => {
    const byLocalId = new Map<string, Recipe>();
    for (const recipe of savedRecipes) {
      byLocalId.set(recipe.localId, recipe);
    }
    return byLocalId;
  }, [savedRecipes]);

  const reloadEntries = useCallback(async () => {
    const next = await repository.getWeek(weekStartIso);
    setEntries(next);
  }, [repository, weekStartIso]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [weekEntries, recipes] = await Promise.all([
          repository.getWeek(weekStartIso),
          recipesRepository.listRecipes({ savedOnly: true }),
        ]);

        if (!isMounted) return;
        setEntries(weekEntries);
        setSavedRecipes(recipes);
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
  }, [repository, recipesRepository, weekStartIso]);

  async function handlePickRecipe(recipe: Recipe) {
    if (!selectedSlot) return;
    setIsPickerLoading(true);
    try {
      await repository.setEntry({
        weekStartIso,
        day: selectedSlot.day,
        slot: selectedSlot.slot,
        recipeId: recipe.localId,
      });
      await reloadEntries();
      setSelectedSlot(null);
    } catch (error) {
      setErrorMessage(toUserMessage(error));
    } finally {
      setIsPickerLoading(false);
    }
  }

  async function handleRemoveSlot(day: MealPlanDay, slot: MealSlot) {
    try {
      await repository.removeEntry({ weekStartIso, day, slot });
      await reloadEntries();
    } catch (error) {
      setErrorMessage(toUserMessage(error));
    }
  }

  async function refreshSavedRecipes() {
    try {
      const recipes = await recipesRepository.listRecipes({ savedOnly: true });
      setSavedRecipes(recipes);
    } catch {
      // Keep the current list — the picker will still show what we already have.
    }
  }

  function openPicker(day: WeekGridDay, slot: WeekGridSlot) {
    setSelectedSlot({
      day: day.day,
      slot: slot.slot,
      weekday: day.weekday,
    });
    void refreshSavedRecipes();
  }

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 30) }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Meal plan</Text>
        <Text style={styles.subtitle}>Week of {weekStartIso}</Text>
      </View>

      {errorMessage ? (
        <Text selectable style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      {isLoading ? <ActivityIndicator color={KitchenDesign.colors.orange} /> : null}

      {!isLoading
        ? grid.map((day) => (
            <DayRow
              key={day.iso}
              day={day}
              recipesById={recipesById}
              onAdd={(slot) => openPicker(day, slot)}
              onRemove={(slot) => handleRemoveSlot(day.day, slot.slot)}
            />
          ))
        : null}

      <Modal
        visible={selectedSlot !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSlot(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose a saved recipe</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close recipe picker"
                onPress={() => setSelectedSlot(null)}
                style={styles.modalCloseButton}>
                <X size={22} stroke={KitchenDesign.colors.ink} />
              </Pressable>
            </View>

            {selectedSlot ? (
              <Text style={styles.modalSubtitle}>
                For {selectedSlot.weekday} {MEAL_PLAN_SLOT_LABELS[selectedSlot.slot]}
              </Text>
            ) : null}

            {isPickerLoading ? (
              <ActivityIndicator color={KitchenDesign.colors.orange} />
            ) : null}

            <ScrollView contentContainerStyle={styles.recipeList}>
              {savedRecipes.length === 0 ? (
                <View style={styles.emptyPicker}>
                  <Text style={styles.emptyTitle}>No saved recipes yet</Text>
                  <Text style={styles.emptyHint}>
                    Save a recipe from the Recipes tab, then add it to a slot here.
                  </Text>
                </View>
              ) : null}
              {savedRecipes.map((recipe) => (
                <Pressable
                  key={recipe.localId}
                  accessibilityRole="button"
                  accessibilityLabel={`Pick ${recipe.title}`}
                  disabled={isPickerLoading}
                  onPress={() => handlePickRecipe(recipe)}
                  style={({ pressed }) => [
                    styles.recipeOption,
                    pressed ? styles.pressed : null,
                  ]}>
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  <Text style={styles.recipeMeta}>
                    {recipe.cuisine} · {recipe.prepMinutes + recipe.cookMinutes} min
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

type DayRowProps = {
  day: WeekGridDay;
  recipesById: Map<string, Recipe>;
  onAdd: (slot: WeekGridSlot) => void;
  onRemove: (slot: WeekGridSlot) => void;
};

function DayRow({ day, recipesById, onAdd, onRemove }: DayRowProps) {
  return (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>{day.weekday}</Text>
        <Text style={styles.dayOfMonth}>{day.dayOfMonth}</Text>
      </View>
      <View style={styles.slotColumn}>
        {day.slots.map((slot) => (
          <SlotCell
            key={`${day.day}-${slot.slot}`}
            day={day}
            slot={slot}
            recipe={slot.recipeId ? recipesById.get(slot.recipeId) ?? null : null}
            onAdd={() => onAdd(slot)}
            onRemove={() => onRemove(slot)}
          />
        ))}
      </View>
    </View>
  );
}

type SlotCellProps = {
  day: WeekGridDay;
  slot: WeekGridSlot;
  recipe: Recipe | null;
  onAdd: () => void;
  onRemove: () => void;
};

function SlotCell({ day, slot, recipe, onAdd, onRemove }: SlotCellProps) {
  const slotLabel = MEAL_PLAN_SLOT_LABELS[slot.slot];

  if (recipe) {
    return (
      <View style={styles.slotRow}>
        <Text style={styles.slotLabel}>{slotLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${day.weekday} ${slotLabel}: ${recipe.title}`}
          onPress={onAdd}
          style={({ pressed }) => [styles.filledSlot, pressed ? styles.pressed : null]}>
          <Text numberOfLines={1} style={styles.filledSlotText}>
            {recipe.title}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${recipe.title} from ${day.weekday} ${slotLabel}`}
          onPress={onRemove}
          style={styles.removeButton}>
          <X size={18} stroke={KitchenDesign.colors.ink} />
        </Pressable>
      </View>
    );
  }

  if (slot.recipeId) {
    // Recipe id is present but not in the saved recipe lookup — show a fallback.
    return (
      <View style={styles.slotRow}>
        <Text style={styles.slotLabel}>{slotLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${day.weekday} ${slotLabel}: unknown recipe`}
          onPress={onAdd}
          style={({ pressed }) => [styles.filledSlot, pressed ? styles.pressed : null]}>
          <Text numberOfLines={1} style={styles.filledSlotText}>
            Unsaved recipe
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove unknown recipe from ${day.weekday} ${slotLabel}`}
          onPress={onRemove}
          style={styles.removeButton}>
          <X size={18} stroke={KitchenDesign.colors.ink} />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.slotRow}>
      <Text style={styles.slotLabel}>{slotLabel}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add recipe to ${day.weekday} ${slotLabel}`}
        onPress={onAdd}
        style={({ pressed }) => [styles.emptySlot, pressed ? styles.pressed : null]}>
        <Plus size={18} stroke={KitchenDesign.colors.muted} />
        <Text style={styles.emptySlotText}>Add recipe</Text>
      </Pressable>
    </View>
  );
}

function toUserMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong while saving the meal plan.';
}

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
    fontSize: 38,
    lineHeight: 44,
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
  dayCard: {
    borderRadius: KitchenDesign.radius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    gap: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  dayLabel: {
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  dayOfMonth: {
    color: KitchenDesign.colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  slotColumn: {
    gap: 8,
  },
  slotRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotLabel: {
    width: 84,
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  emptySlot: {
    flex: 1,
    minHeight: 48,
    borderRadius: KitchenDesign.radius.button,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: KitchenDesign.colors.border,
    backgroundColor: KitchenDesign.colors.linen,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
  },
  emptySlotText: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  filledSlot: {
    flex: 1,
    minHeight: 48,
    borderRadius: KitchenDesign.radius.button,
    borderWidth: 1,
    borderColor: KitchenDesign.colors.border,
    backgroundColor: KitchenDesign.colors.cream,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  filledSlotText: {
    color: KitchenDesign.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
    borderWidth: 1,
    borderColor: KitchenDesign.colors.border,
  },
  pressed: {
    opacity: 0.84,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23, 53, 41, 0.4)',
  },
  modalSheet: {
    minHeight: 320,
    maxHeight: '80%',
    backgroundColor: KitchenDesign.colors.cream,
    borderTopLeftRadius: KitchenDesign.radius.sheet,
    borderTopRightRadius: KitchenDesign.radius.sheet,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  recipeList: {
    gap: 8,
    paddingBottom: 16,
  },
  recipeOption: {
    minHeight: 64,
    borderRadius: KitchenDesign.radius.button,
    borderWidth: 1,
    borderColor: KitchenDesign.colors.border,
    backgroundColor: KitchenDesign.colors.porcelain,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  recipeTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  recipeMeta: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyPicker: {
    minHeight: 120,
    borderRadius: KitchenDesign.radius.card,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    padding: 18,
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
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
});
