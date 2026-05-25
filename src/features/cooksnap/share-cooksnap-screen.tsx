/**
 * Share Cooksnap Screen — allows the user to share a dish photo with a caption
 * to a selected private circle after cooking.
 *
 * Privacy contract:
 * - Image stays local until the user explicitly taps "Share" (consent-before-upload).
 * - Caption is user-generated content within the private circle (not analytics-tracked).
 * - Requires internet (server-required data class).
 */

import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import type { Circle } from '../circle/circle-repository';
import type { CooksnapRepository, CreateCooksnapInput } from './cooksnap-repository';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ShareCooksnapScreenProps = {
  recipeId: string;
  recipeTitle: string;
  imageUri: string;
  circles: Circle[];
  repository: CooksnapRepository;
  onSuccess: () => void;
  onCancel: () => void;
  isOnline: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MAX_CAPTION = 200;

export function ShareCooksnapScreen({
  recipeId,
  recipeTitle,
  imageUri,
  circles,
  repository,
  onSuccess,
  onCancel,
  isOnline,
}: ShareCooksnapScreenProps) {
  const [caption, setCaption] = useState('');
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canShare = isOnline && selectedCircleId !== null && !isSharing;

  const handleShare = useCallback(async () => {
    if (!canShare || !selectedCircleId) return;

    setIsSharing(true);
    setError(null);

    try {
      const input: CreateCooksnapInput = {
        recipeId,
        circleId: selectedCircleId,
        imageUri,
        caption: caption.trim() || undefined,
      };

      await repository.createCooksnap(input);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSharing(false);
    }
  }, [canShare, selectedCircleId, recipeId, imageUri, caption, repository, onSuccess]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Cancel button */}
      <Pressable testID="cancel-button" onPress={onCancel} style={{ marginBottom: 12 }}>
        <Text>Cancel</Text>
      </Pressable>

      {/* Recipe title */}
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
        Share your {recipeTitle}
      </Text>

      {/* Photo preview */}
      <Image
        testID="cooksnap-image-preview"
        source={{ uri: imageUri }}
        style={{ width: '100%', height: 240, borderRadius: 12, marginBottom: 16 }}
        resizeMode="cover"
        accessibilityLabel="Preview of your dish photo"
      />

      {/* Caption input */}
      <TextInput
        placeholder="Add a caption (optional)"
        value={caption}
        onChangeText={setCaption}
        maxLength={MAX_CAPTION}
        multiline
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 12,
          minHeight: 60,
          marginBottom: 4,
        }}
        accessibilityLabel="Caption input"
      />
      <Text style={{ fontSize: 12, color: '#666', marginBottom: 16, textAlign: 'right' }}>
        {caption.length}/{MAX_CAPTION}
      </Text>

      {/* Circle picker */}
      <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8 }}>
        Share to circle
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {circles.map((circle) => (
          <Pressable
            key={circle.id}
            onPress={() => setSelectedCircleId(circle.id)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: selectedCircleId === circle.id ? '#007AFF' : '#ccc',
              backgroundColor: selectedCircleId === circle.id ? '#E8F0FE' : '#fff',
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCircleId === circle.id }}
          >
            <Text
              style={{
                color: selectedCircleId === circle.id ? '#007AFF' : '#333',
                fontWeight: selectedCircleId === circle.id ? '600' : '400',
              }}
            >
              {circle.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Offline warning */}
      {!isOnline && (
        <Text style={{ color: '#c00', marginBottom: 12 }}>
          Needs internet to share your cooksnap.
        </Text>
      )}

      {/* Error message */}
      {error && (
        <Text style={{ color: '#c00', marginBottom: 12 }}>
          Share failed: {error}
        </Text>
      )}

      {/* Share button */}
      <Pressable
        testID="share-button"
        onPress={handleShare}
        disabled={!canShare}
        accessibilityState={{ disabled: !canShare }}
        style={{
          backgroundColor: canShare ? '#007AFF' : '#ccc',
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>
          {isSharing ? 'Sharing…' : 'Share'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
