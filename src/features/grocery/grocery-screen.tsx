import { Check, Plus, Trash2, X } from 'lucide-react-native';
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
import type { PantryRepository } from '@/features/pantry/pantry-repository';
import type { Recipe, RecipesRepository } from '@/features/recipes/recipes-repository';

import type {
    AddRecipeToListResult,
    GroceryItem,
    GroceryRepository,
} from './grocery-repository';

type GroceryScreenContentProps = {
  repository: GroceryRepository;
  recipesRepository: RecipesRepository;
  pantryRepository: PantryRepository;
};

type LastAddSummary = {
  recipeTitle: string;
  alreadyHaveCount: number;
  alreadyOnList: number;
  addedCount: number;
};

export function GroceryScreenContent({
  repository,
  recipesRepository,
  pantryRepository,
}: GroceryScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPickerBusy, setIsPickerBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAdd, setLastAdd] = useState<LastAddSummary | null>(null);

  const reloadItems = useCallback(async () => {
    const next = await repository.listItems();
    setItems(next);
  }, [repository]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const [list, recipes] = await Promise.all([
          repository.listItems(),
          recipesRepository.listRecipes({ savedOnly: true }),
        ]);
        if (!isMounted) return;
        setItems(list);
        setSavedRecipes(recipes);
        setErrorMessage(null);
      } catch (error) {
        if (isMounted) setErrorMessage(toUserMessage(error));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [repository, recipesRepository]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        if (left.isChecked !== right.isChecked) return left.isChecked ? 1 : -1;
        return left.createdAt.localeCompare(right.createdAt);
      }),
    [items],
  );

  async function handleOpenPicker() {
    try {
      const recipes = await recipesRepository.listRecipes({ savedOnly: true });
      setSavedRecipes(recipes);
    } catch {
      // Keep the existing list — better than blocking the picker.
    }
    setIsPickerOpen(true);
  }

  async function handlePickRecipe(recipe: Recipe) {
    setIsPickerBusy(true);
    try {
      const pantryItems = await pantryRepository.listItems();
      const result: AddRecipeToListResult = await repository.addRecipeToList(
        recipe,
        pantryItems,
      );
      setLastAdd({
        recipeTitle: recipe.title,
        alreadyHaveCount: result.alreadyHaveCount,
        alreadyOnList: result.alreadyOnList,
        addedCount: result.added.length,
      });
      await reloadItems();
      setIsPickerOpen(false);
    } catch (error) {
      setErrorMessage(toUserMessage(error));
    } finally {
      setIsPickerBusy(false);
    }
  }

  async function handleToggleChecked(item: GroceryItem) {
    try {
      await repository.setChecked(item.localId, !item.isChecked);
      await reloadItems();
    } catch (error) {
      setErrorMessage(toUserMessage(error));
    }
  }

  async function handleRemove(item: GroceryItem) {
    try {
      await repository.removeItem(item.localId);
      await reloadItems();
    } catch (error) {
      setErrorMessage(toUserMessage(error));
    }
  }

  async function handleClearChecked() {
    try {
      await repository.clearChecked();
      await reloadItems();
    } catch (error) {
      setErrorMessage(toUserMessage(error));
    }
  }

  const checkedCount = sortedItems.filter((item) => item.isChecked).length;

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 30) }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Grocery</Text>
        <Text style={styles.subtitle}>
          {sortedItems.length === 0
            ? 'Add ingredients you still need to buy.'
            : `${sortedItems.length - checkedCount} to buy · ${checkedCount} in cart`}
        </Text>
      </View>

      {errorMessage ? (
        <Text selectable style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      {lastAdd ? <AddSummaryBanner summary={lastAdd} /> : null}

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add from a recipe"
          onPress={handleOpenPicker}
          style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}>
          <Plus size={20} stroke={KitchenDesign.colors.cream} />
          <Text style={styles.addButtonText}>Add from a recipe</Text>
        </Pressable>

        {checkedCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear checked items"
            onPress={handleClearChecked}
            style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
            <Trash2 size={18} stroke={KitchenDesign.colors.ink} />
            <Text style={styles.secondaryButtonText}>Clear checked</Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? <ActivityIndicator color={KitchenDesign.colors.orange} /> : null}

      {!isLoading && sortedItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No grocery items yet</Text>
          <Text style={styles.emptyHint}>
            Tap “Add from a recipe” to pull missing ingredients from a saved recipe.
          </Text>
        </View>
      ) : null}

      {sortedItems.map((item) => (
        <GroceryRow
          key={item.localId}
          item={item}
          onToggle={() => handleToggleChecked(item)}
          onRemove={() => handleRemove(item)}
        />
      ))}

      <Modal
        visible={isPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pick a saved recipe</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close recipe picker"
                onPress={() => setIsPickerOpen(false)}
                style={styles.modalCloseButton}>
                <X size={22} stroke={KitchenDesign.colors.ink} />
              </Pressable>
            </View>

            {isPickerBusy ? (
              <ActivityIndicator color={KitchenDesign.colors.orange} />
            ) : null}

            <ScrollView contentContainerStyle={styles.recipeList}>
              {savedRecipes.length === 0 ? (
                <View style={styles.emptyPicker}>
                  <Text style={styles.emptyTitle}>No saved recipes yet</Text>
                  <Text style={styles.emptyHint}>
                    Save a recipe from the Recipes tab, then add its missing ingredients here.
                  </Text>
                </View>
              ) : null}
              {savedRecipes.map((recipe) => (
                <Pressable
                  key={recipe.localId}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${recipe.title} to grocery`}
                  disabled={isPickerBusy}
                  onPress={() => handlePickRecipe(recipe)}
                  style={({ pressed }) => [
                    styles.recipeOption,
                    pressed && !isPickerBusy ? styles.pressed : null,
                  ]}>
                  <Text style={styles.recipeTitle}>{recipe.title}</Text>
                  <Text style={styles.recipeMeta}>
                    {recipe.cuisine} · {recipe.ingredients.length} ingredients
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

type GroceryRowProps = {
  item: GroceryItem;
  onToggle: () => void;
  onRemove: () => void;
};

function GroceryRow({ item, onToggle, onRemove }: GroceryRowProps) {
  const checkLabel = item.isChecked
    ? `Mark ${item.name} as not bought`
    : `Mark ${item.name} as bought`;

  return (
    <View style={[styles.row, item.isChecked ? styles.rowChecked : null]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.isChecked }}
        accessibilityLabel={checkLabel}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.checkbox,
          item.isChecked ? styles.checkboxChecked : null,
          pressed ? styles.pressed : null,
        ]}>
        {item.isChecked ? <Check size={18} stroke={KitchenDesign.colors.cream} /> : null}
      </Pressable>

      <View style={styles.rowCopy}>
        <Text
          style={[styles.rowName, item.isChecked ? styles.rowNameChecked : null]}
          numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {formatQuantity(item)}
          {item.recipeTitle ? ` · ${item.recipeTitle}` : ''}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${item.name}`}
        onPress={onRemove}
        style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null]}>
        <Trash2 size={18} stroke={KitchenDesign.colors.ink} />
      </Pressable>
    </View>
  );
}

function AddSummaryBanner({ summary }: { summary: LastAddSummary }) {
  const segments: string[] = [];
  segments.push(
    `Added ${summary.addedCount} ${summary.addedCount === 1 ? 'item' : 'items'} from ${summary.recipeTitle}`,
  );
  if (summary.alreadyHaveCount > 0) {
    segments.push(`already have ${summary.alreadyHaveCount}`);
  }
  if (summary.alreadyOnList > 0) {
    segments.push(`already on list ${summary.alreadyOnList}`);
  }
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{segments.join(' · ')}</Text>
    </View>
  );
}

function formatQuantity(item: GroceryItem): string {
  const quantity = item.quantity?.trim() ?? '';
  const unit = item.unit?.trim() ?? '';
  if (!quantity && !unit) return '';
  if (!unit) return quantity;
  if (!quantity) return unit;
  return `${quantity} ${unit}`;
}

function toUserMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong with the grocery list.';
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
    gap: 14,
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
  banner: {
    minHeight: 52,
    borderRadius: KitchenDesign.radius.button,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFF8EA',
    borderColor: '#F1B35C',
    borderWidth: 1,
    justifyContent: 'center',
  },
  bannerText: {
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  addButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: KitchenDesign.radius.button,
    backgroundColor: KitchenDesign.colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 17,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: KitchenDesign.radius.button,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    fontWeight: '800',
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
  row: {
    minHeight: 64,
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
  rowChecked: {
    backgroundColor: KitchenDesign.colors.linen,
    opacity: 0.85,
  },
  checkbox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: KitchenDesign.colors.border,
    backgroundColor: KitchenDesign.colors.cream,
  },
  checkboxChecked: {
    backgroundColor: KitchenDesign.colors.sage,
    borderColor: KitchenDesign.colors.sage,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowName: {
    color: KitchenDesign.colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  rowNameChecked: {
    textDecorationLine: 'line-through',
    color: KitchenDesign.colors.muted,
  },
  rowMeta: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
});
