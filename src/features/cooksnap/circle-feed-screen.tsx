/**
 * Circle Feed Screen — displays cooksnaps shared within a circle, newest first.
 *
 * Each card shows: image thumbnail, caption, recipe title link, and timestamp.
 * Tapping the recipe title navigates to the recipe detail.
 */

import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, Text, View } from 'react-native';

import type { Cooksnap, CooksnapRepository } from './cooksnap-repository';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type CircleFeedScreenProps = {
  circleId: string;
  repository: CooksnapRepository;
  recipeTitles: Record<string, string>;
  onRecipePress: (recipeId: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CircleFeedScreen({
  circleId,
  repository,
  recipeTitles,
  onRecipePress,
}: CircleFeedScreenProps) {
  const [cooksnaps, setCooksnaps] = useState<Cooksnap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await repository.getCooksnapsByCircle(circleId);
        if (!cancelled) {
          setCooksnaps(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [circleId, repository]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading…</Text>
      </View>
    );
  }

  if (cooksnaps.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, color: '#666' }}>
          No cooksnaps yet. Be the first to share!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={cooksnaps}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <CooksnapCard
          cooksnap={item}
          imageUrl={repository.getImageUrl(item.imagePath)}
          recipeTitle={recipeTitles[item.recipeId] ?? 'Recipe'}
          onRecipePress={() => onRecipePress(item.recipeId)}
        />
      )}
    />
  );
}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------

type CooksnapCardProps = {
  cooksnap: Cooksnap;
  imageUrl: string;
  recipeTitle: string;
  onRecipePress: () => void;
};

function CooksnapCard({ cooksnap, imageUrl, recipeTitle, onRecipePress }: CooksnapCardProps) {
  const formattedDate = format(new Date(cooksnap.createdAt), 'MMM d, yyyy');

  return (
    <View
      style={{
        marginBottom: 16,
        borderRadius: 12,
        backgroundColor: '#fff',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      {/* Image thumbnail */}
      <Image
        testID="cooksnap-thumbnail"
        source={{ uri: imageUrl }}
        style={{ width: '100%', height: 200 }}
        resizeMode="cover"
        accessibilityLabel={
          cooksnap.caption
            ? `Cooksnap: ${cooksnap.caption}`
            : 'Cooksnap photo'
        }
      />

      <View style={{ padding: 12 }}>
        {/* Caption */}
        {cooksnap.caption && (
          <Text style={{ fontSize: 14, marginBottom: 8 }}>{cooksnap.caption}</Text>
        )}

        {/* Recipe link */}
        <Pressable onPress={onRecipePress} accessibilityRole="link">
          <Text style={{ fontSize: 13, color: '#007AFF', fontWeight: '500' }}>
            {recipeTitle}
          </Text>
        </Pressable>

        {/* Timestamp */}
        <Text style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
          {formattedDate}
        </Text>
      </View>
    </View>
  );
}
