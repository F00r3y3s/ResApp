import { router } from 'expo-router';
import { Heart, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';

import type { Creator } from './creators-data';
import { SEED_CREATORS } from './creators-data';
import type { FollowRepository } from './follow-repository';

type CreatorListScreenContentProps = {
  followRepository: FollowRepository;
};

export function CreatorListScreenContent({ followRepository }: CreatorListScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [followedIds, setFollowedIds] = useState<string[]>([]);

  const loadFollowed = useCallback(async () => {
    const ids = await followRepository.getFollowedCreatorIds();
    setFollowedIds(ids);
  }, [followRepository]);

  useEffect(() => {
    loadFollowed();
  }, [loadFollowed]);

  const handleToggleFollow = useCallback(
    async (creatorId: string) => {
      const isCurrentlyFollowing = followedIds.includes(creatorId);
      if (isCurrentlyFollowing) {
        await followRepository.unfollowCreator(creatorId);
      } else {
        await followRepository.followCreator(creatorId);
      }
      await loadFollowed();
    },
    [followedIds, followRepository, loadFollowed],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 28) }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Creators</Text>
        <Text style={styles.subtitle}>
          Discover recipe creators and follow your favourites
        </Text>
      </View>

      <View style={styles.cardList}>
        {SEED_CREATORS.map((creator) => (
          <CreatorCard
            key={creator.id}
            creator={creator}
            isFollowing={followedIds.includes(creator.id)}
            onToggleFollow={() => handleToggleFollow(creator.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function CreatorCard({
  creator,
  isFollowing,
  onToggleFollow,
}: {
  creator: Creator;
  isFollowing: boolean;
  onToggleFollow: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${creator.name}`}
      onPress={() => router.push(`/creator/${creator.id}`)}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <View style={styles.cardTop}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>{creator.avatarEmoji}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{creator.name}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {creator.recipeIds.length} {creator.recipeIds.length === 1 ? 'recipe' : 'recipes'}
            </Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>
              {creator.cuisines.map(formatCuisine).join(', ')}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.bio} numberOfLines={2}>
        {creator.bio}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isFollowing ? `Unfollow ${creator.name}` : `Follow ${creator.name}`}
        onPress={() => {
          onToggleFollow();
        }}
        style={({ pressed }) => [
          styles.followButton,
          isFollowing ? styles.followButtonActive : null,
          pressed ? styles.pressed : null,
        ]}>
        {isFollowing ? (
          <Heart size={16} stroke={KitchenDesign.colors.cream} fill={KitchenDesign.colors.cream} />
        ) : (
          <Users size={16} stroke={KitchenDesign.colors.orange} />
        )}
        <Text style={[styles.followText, isFollowing ? styles.followTextActive : null]}>
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      </Pressable>
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
    gap: 18,
  },
  header: {
    gap: 6,
  },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
  },
  subtitle: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    lineHeight: 20,
  },
  cardList: {
    gap: 14,
  },
  card: {
    borderRadius: 18,
    padding: 18,
    gap: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  avatarEmoji: {
    fontSize: 26,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    color: KitchenDesign.colors.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  metaDot: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
  },
  bio: {
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 20,
    backgroundColor: KitchenDesign.colors.linen,
    borderColor: KitchenDesign.colors.orange,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  followButtonActive: {
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.orange,
  },
  followText: {
    color: KitchenDesign.colors.orange,
    fontSize: 14,
    fontWeight: '800',
  },
  followTextActive: {
    color: KitchenDesign.colors.cream,
  },
  pressed: {
    opacity: 0.84,
  },
});
