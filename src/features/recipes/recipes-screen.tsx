import { router } from 'expo-router';
import { ChevronRight, Plus, Search, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { PantryItem, PantryRepository } from '@/features/pantry/pantry-repository';

import { computePantryMatch, type PantryMatchResult } from './pantry-match';
import { RecipeHero } from './recipe-hero';
import type { Recipe, RecipeFilters, RecipesRepository } from './recipes-repository';

type RecipesScreenContentProps = {
  repository: RecipesRepository;
  pantryRepository?: PantryRepository;
};

type LibraryFilter = 'all' | 'saved' | 'pantry-friendly' | 'quick';

const filters: { id: LibraryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'saved', label: 'Saved' },
  { id: 'pantry-friendly', label: 'Pantry friendly' },
  { id: 'quick', label: 'Under 30 min' },
];

const cuisinePalette: Record<string, string> = {
  levantine: '#A35D2C',
  british: '#3C6F8F',
  indian: '#C25C2C',
  pakistani: '#A03B3B',
  turkish: '#8E5A2C',
  emirati: '#7A5A1F',
};

export function RecipesScreenContent({ repository, pantryRepository }: RecipesScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    async function loadRecipes() {
      const filters: RecipeFilters = {};
      const trimmedQuery = query.trim();
      if (trimmedQuery.length > 0) {
        filters.query = trimmedQuery;
      }
      if (activeFilter === 'saved') {
        filters.savedOnly = true;
      }
      if (activeFilter === 'quick') {
        filters.maxPrepCook = 30;
      }

      try {
        const next = await repository.listRecipes(filters);
        if (isMounted) {
          setRecipes(next);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Could not load recipes.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadRecipes();

    return () => {
      isMounted = false;
    };
  }, [repository, query, activeFilter]);

  const visibleRecipes = useMemo(() => {
    if (activeFilter !== 'pantry-friendly' || !pantryRepository) {
      return recipes;
    }
    return recipes.filter((recipe) => {
      const match = computePantryMatch(recipe, pantryItems);
      return match.totalCount > 0 && match.matchedCount === match.totalCount;
    });
  }, [recipes, activeFilter, pantryRepository, pantryItems]);

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 28) }]}
        keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.title}>Recipes</Text>
        </View>

      <View style={styles.searchBox}>
        <Search size={22} stroke={KitchenDesign.colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search recipes"
          placeholderTextColor={KitchenDesign.colors.muted}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {filters.map((filter) => {
          const isActive = filter.id === activeFilter;
          return (
            <Pressable
              key={filter.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => setActiveFilter(filter.id)}
              style={({ pressed }) => [
                styles.filterChip,
                isActive ? styles.filterChipActive : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.filterText, isActive ? styles.filterTextActive : null]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {errorMessage ? (
        <Text selectable style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      {isLoading ? <ActivityIndicator color={KitchenDesign.colors.orange} /> : null}

      {!isLoading && visibleRecipes.length === 0 ? (
        <View style={styles.emptyState}>
          <Sparkles size={28} stroke={KitchenDesign.colors.orange} />
          <Text style={styles.emptyText}>No recipes match this filter</Text>
          <Text style={styles.emptyHint}>
            Try clearing the search or saving a seed recipe to your library.
          </Text>
        </View>
      ) : null}

      <View style={styles.cardList}>
        {visibleRecipes.map((recipe) => (
          <RecipeCard
            key={recipe.localId}
            recipe={recipe}
            pantryMatch={
              pantryRepository ? computePantryMatch(recipe, pantryItems) : null
            }
          />
        ))}
      </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add recipe"
        onPress={() => router.push('/recipe-edit')}
        style={({ pressed }) => [styles.fabFloating, pressed ? styles.pressed : null]}>
        <Plus size={26} stroke={KitchenDesign.colors.cream} />
      </Pressable>
    </View>
  );
}

function RecipeCard({
  recipe,
  pantryMatch,
}: {
  recipe: Recipe;
  pantryMatch: PantryMatchResult | null;
}) {
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;
  const cuisineColor = cuisinePalette[recipe.cuisine] ?? KitchenDesign.colors.orangePressed;
  const targetId = recipe.seedId ?? recipe.localId;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${recipe.title}`}
      onPress={() => router.push(`/recipe/${targetId}`)}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <View style={styles.cardImageWrap}>
        <RecipeHero
          seedId={recipe.seedId}
          cuisine={recipe.cuisine}
          title={recipe.title}
          size={92}
          variant="card"
        />
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{recipe.title}</Text>
        <View style={styles.cardMetaRow}>
          <View style={[styles.cuisineChip, { borderColor: cuisineColor }]}>
            <Text style={[styles.cuisineText, { color: cuisineColor }]}>
              {formatCuisine(recipe.cuisine)}
            </Text>
          </View>
          <Text style={styles.timeText}>{totalMinutes} min</Text>
          <Text style={styles.servingsText}>· Serves {recipe.servings}</Text>
        </View>
        <View style={styles.tagRow}>
          {recipe.dietTags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.dietPill}>
              <Text style={styles.dietPillText}>{formatTag(tag)}</Text>
            </View>
          ))}
          {pantryMatch ? <PantryMatchBadge match={pantryMatch} /> : null}
          {recipe.isSaved ? (
            <View
              accessibilityLabel="Recipe is saved to library"
              style={styles.savedDot}
            />
          ) : null}
        </View>
      </View>
      <ChevronRight size={22} stroke={KitchenDesign.colors.muted} />
    </Pressable>
  );
}

function PantryMatchBadge({ match }: { match: PantryMatchResult }) {
  if (match.totalCount === 0) {
    return null;
  }

  if (match.matchedCount === match.totalCount) {
    return (
      <View style={styles.usesPantryBadge}>
        <Text style={styles.usesPantryText}>Uses pantry</Text>
      </View>
    );
  }

  const missingCount = match.totalCount - match.matchedCount;
  return (
    <View style={styles.missingBadge}>
      <Text style={styles.missingText}>Missing {missingCount}</Text>
    </View>
  );
}

function formatCuisine(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

function formatTag(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 124,
    gap: 18,
  },
  header: {
    minHeight: 56,
    justifyContent: 'center',
  },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
  },
  fabFloating: {
    position: 'absolute',
    right: 22,
    bottom: 28,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  searchBox: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    color: KitchenDesign.colors.ink,
    fontSize: 17,
    paddingVertical: 0,
  },
  filterRow: {
    gap: 10,
    paddingRight: 12,
  },
  filterChip: {
    minHeight: 44,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  filterChipActive: {
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.orange,
  },
  filterText: {
    color: KitchenDesign.colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  filterTextActive: {
    color: KitchenDesign.colors.cream,
  },
  cardList: {
    gap: 12,
  },
  card: {
    minHeight: 124,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  cardImageWrap: {
    width: 92,
    height: 92,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardCopy: {
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '800',
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineChip: {
    minHeight: 26,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cuisineText: {
    fontSize: 12,
    fontWeight: '800',
  },
  timeText: {
    color: KitchenDesign.colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  servingsText: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dietPill: {
    minHeight: 24,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  dietPillText: {
    color: KitchenDesign.colors.ink,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  savedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: KitchenDesign.colors.sage,
  },
  usesPantryBadge: {
    minHeight: 24,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.sage,
  },
  usesPantryText: {
    color: KitchenDesign.colors.cream,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  missingBadge: {
    minHeight: 24,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  missingText: {
    color: KitchenDesign.colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  emptyState: {
    minHeight: 140,
    borderRadius: 18,
    padding: 24,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  emptyText: {
    color: KitchenDesign.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  emptyHint: {
    color: KitchenDesign.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
