import { router } from 'expo-router';
import { Plus, Ticket, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
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

import type { Circle, CircleRepository } from './circle-repository';

type Props = {
  repository: CircleRepository;
  isOnline: boolean;
};

export function CircleListScreenContent({ repository, isOnline }: Props) {
  const insets = useSafeAreaInsets();
  const [circles, setCircles] = useState<Circle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const next = await repository.getMyCircles();
      setCircles(next);
    } catch (error) {
      setCircles([]);
      setLoadError(error instanceof Error ? error.message : 'Could not load circles.');
    }
  }, [repository]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 24) }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Family circle</Text>
        <Text style={styles.subtitle}>
          A private space for your household. Recipes, plans, and cooksnaps you share here stay
          inside the circle.
        </Text>
      </View>

      {!isOnline ? (
        <View style={styles.offlineBanner} accessibilityRole="alert">
          <Text style={styles.offlineTitle}>Needs internet</Text>
          <Text style={styles.offlineBody}>
            We don&apos;t queue circle changes offline so nothing gets out of sync. Reconnect and
            try again.
          </Text>
        </View>
      ) : null}

      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create new circle"
          disabled={!isOnline}
          onPress={() => router.push('/circle/create')}
          style={({ pressed }) => [
            styles.primaryAction,
            !isOnline ? styles.disabled : null,
            pressed && isOnline ? styles.pressed : null,
          ]}>
          <Plus size={18} stroke={KitchenDesign.colors.cream} />
          <Text style={styles.primaryActionText}>Create new circle</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter invite code"
          disabled={!isOnline}
          onPress={() => router.push('/circle/join')}
          style={({ pressed }) => [
            styles.secondaryAction,
            !isOnline ? styles.disabled : null,
            pressed && isOnline ? styles.pressed : null,
          ]}>
          <Ticket size={18} stroke={KitchenDesign.colors.ink} />
          <Text style={styles.secondaryActionText}>Enter invite code</Text>
        </Pressable>
      </View>

      {circles === null ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={KitchenDesign.colors.ink} />
        </View>
      ) : circles.length === 0 ? (
        <View style={styles.emptyState}>
          <Users size={28} stroke={KitchenDesign.colors.ink} />
          <Text style={styles.emptyTitle}>No circles yet</Text>
          <Text style={styles.emptyBody}>
            Start a private circle for your household, or join an existing one with the code a
            family member shared.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {circles.map((circle) => (
            <Pressable
              key={circle.id}
              accessibilityRole="button"
              accessibilityLabel={`Open circle ${circle.name}`}
              onPress={() => router.push(`/circle/${circle.id}`)}
              style={({ pressed }) => [styles.circleRow, pressed ? styles.pressed : null]}>
              <View style={styles.circleAvatar}>
                <Users size={20} stroke={KitchenDesign.colors.ink} />
              </View>
              <View style={styles.circleCopy}>
                <Text style={styles.circleName}>{circle.name}</Text>
                <Text style={styles.circleMeta}>
                  Private · code {circle.inviteCode}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KitchenDesign.colors.cream },
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 18 },
  header: { gap: 8 },
  title: { color: KitchenDesign.colors.ink, fontSize: 30, fontWeight: '900' },
  subtitle: { color: KitchenDesign.colors.muted, fontSize: 15, lineHeight: 22 },
  offlineBanner: {
    borderRadius: KitchenDesign.radius.card,
    padding: 16,
    gap: 6,
    backgroundColor: '#F8E4CC',
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  offlineTitle: { color: KitchenDesign.colors.ink, fontSize: 15, fontWeight: '900' },
  offlineBody: { color: KitchenDesign.colors.muted, fontSize: 13, lineHeight: 19 },
  actionRow: { gap: 10 },
  primaryAction: {
    minHeight: 52,
    borderRadius: KitchenDesign.radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryActionText: {
    color: KitchenDesign.colors.cream,
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryAction: {
    minHeight: 52,
    borderRadius: KitchenDesign.radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: KitchenDesign.colors.linen,
  },
  secondaryActionText: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  list: { gap: 12 },
  circleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: KitchenDesign.radius.card,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  circleAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  circleCopy: { flex: 1, gap: 4 },
  circleName: { color: KitchenDesign.colors.ink, fontSize: 16, fontWeight: '900' },
  circleMeta: { color: KitchenDesign.colors.muted, fontSize: 13 },
  emptyState: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: KitchenDesign.radius.card,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  emptyTitle: { color: KitchenDesign.colors.ink, fontSize: 18, fontWeight: '900' },
  emptyBody: {
    color: KitchenDesign.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingRow: { paddingVertical: 24, alignItems: 'center' },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.5 },
});
