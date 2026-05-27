import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, Heart, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { SeedRecipe } from '@/features/recipes/seed-recipes';
import { SEED_RECIPES } from '@/features/recipes/seed-recipes';

import { getCreatorById, getCreatorRecipes } from './creators-data';
import type { FollowRepository } from './follow-repository';

type CreatorDetailScreenContentProps = {
  creatorId: string;
  followRepository: FollowRepository;
};

export function CreatorDetailScreenContent({
  creatorId,
  followRepository,
}: CreatorDetailScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [isFollowing, setIsFollowing] = useState(false);
  const creator = getCreatorById(creatorId);
  const recipes = creator ? getCreatorRecipes(creatorId, SEED_RECIPES) : [];

  const loadFollowState = useCallback(async () => {
    const following = await followRepository.isFollowing(creatorId);
    setIsFollowing(following);
  }, [followRepository, creatorId]);

  useEffect(() => {
    loadFollowState();
  }, [loadFollowState]);

  const handleToggleFollow = useCallback(async () => {
    if (isFollowing) {
      await followRepository.unfollowCreator(creatorId);
    } else {
      await followRepository.followCreator(creatorId);
    }
    await loadFollowState();
  }, [isFollowing, followRepository, creatorId, loadFollowState]);

  if (!creator) {
    return (
      <View style={[styles.screen, { paddingTop: Math.max(insets.top, 28) }]}>
        <Text style={styles.errorText}>Creator not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 28) }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.backButton}>
        <ArrowLeft size={22} stroke={KitchenDesign.colors.ink} />
      </Pressable>

      <View style={styles.profileSection}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarEmojiLarge}>{creator.avatarEmoji}</Text>
        </View>
        <Text style={styles.creatorName}>{creator.name}</Text>
        <Text style={styles.creatorBio}>{creator.bio}</Text>

        <View style={styles.statsRow}>
          <Text style={styles.statText}>
            {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
          </Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.statText}>
            {creator.cuisines.map(formatCuisine).join(', ')}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isFollowing ? `Unfollow ${creator.name}` : `Follow ${creator.name}`}
          onPress={handleToggleFollow}
          style={({ pressed }) => [
            styles.followButton,
            isFollowing ? styles.followButtonActive : null,
            pressed ? styles.pressed : null,
          ]}>
          {isFollowing ? (
            <Heart size={18} stroke={KitchenDesign.colors.cream} fill={KitchenDesign.colors.cream} />
          ) : (
            <Users size={18} stroke={KitchenDesign.colors.orange} />
          )}
          <Text style={[styles.followText, isFollowing ? styles.followTextActive : null]}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.recipesSection}>
        <Text style={styles.sectionTitle}>Recipes</Text>
        <View style={styles.recipeList}>
          {recipes.map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function RecipeRow({ recipe }: { recipe: SeedRecipe }) {
  const totalMinutes = recipe.prepMinutes + recipe.cookMinutes;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${recipe.title}`}
      onPress={() => router.push(`/recipe/${recipe.id}`)}
      style={({ pressed }) => [styles.recipeRow, pressed ? styles.pressed : null]}>
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeTitle}>{recipe.title}</Text>
        <Text style={styles.recipeMeta}>
          {formatCuisine(recipe.cuisine)} · {totalMinutes} min · Serves {recipe.servings}
        </Text>
      </View>
      <ChevronRight size={20} stroke={KitchenDesign.colors.muted} />
    </Pressable>
  );
}

function formatCuisine(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 124,
    gap: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  profileSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  avatarEmojiLarge: {
    fontSize: 40,
  },
  creatorName: {
    color: KitchenDesign.colors.ink,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  creatorBio: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  statDot: {
    color: KitchenDesign.colors.muted,
    fontSize: 14,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 28,
    backgroundColor: KitchenDesign.colors.linen,
    borderColor: KitchenDesign.colors.orange,
    borderWidth: 1.5,
  },
  followButtonActive: {
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.orange,
  },
  followText: {
    color: KitchenDesign.colors.orange,
    fontSize: 16,
    fontWeight: '800',
  },
  followTextActive: {
    color: KitchenDesign.colors.cream,
  },
  recipesSection: {
    gap: 12,
  },
  sectionTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  recipeList: {
    gap: 10,
  },
  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    borderRadius: 14,
    padding: 14,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  recipeInfo: {
    flex: 1,
    gap: 4,
  },
  recipeTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  recipeMeta: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    padding: 24,
  },
  pressed: {
    opacity: 0.84,
  },
});
