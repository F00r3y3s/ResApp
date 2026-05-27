import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { KitchenDesign } from '@/constants/kitchen-design';

/**
 * Lens-tab entry point for the scan modal (T8.3).
 *
 * Renders a small row of pill buttons that route into `(modals)/scan` with the
 * appropriate `?type` query param. The route handles capture/review and falls
 * back gracefully when the AI gateway is unconfigured (e.g., guest user with
 * no Supabase env vars), so these pills don't need any auth gating themselves.
 */
export function ScanModePillRow() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Kitchen Lens</Text>
      <Text style={styles.subheading}>
        Snap your pantry to log what you have, or scan a receipt to split items between your
        pantry and grocery list.
      </Text>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan pantry"
          accessibilityHint="Opens the camera to scan your pantry"
          onPress={() => router.push('/scan?type=pantry-photo')}
          style={({ pressed }) => [styles.pill, styles.pillPrimary, pressed ? styles.pressed : null]}>
          <Text style={[styles.pillText, styles.pillTextPrimary]}>Scan pantry</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Scan receipt"
          accessibilityHint="Opens the camera to scan a grocery receipt"
          onPress={() => router.push('/scan?type=receipt')}
          style={({ pressed }) => [styles.pill, styles.pillSecondary, pressed ? styles.pressed : null]}>
          <Text style={[styles.pillText, styles.pillTextSecondary]}>Scan receipt</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
    paddingHorizontal: 18,
    paddingTop: 24,
    gap: 12,
  },
  heading: {
    color: KitchenDesign.colors.ink,
    fontSize: KitchenDesign.type.title,
    lineHeight: KitchenDesign.type.title + 6,
    fontWeight: '900',
  },
  subheading: {
    color: KitchenDesign.colors.muted,
    fontSize: KitchenDesign.type.body,
    lineHeight: 22,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pill: {
    minHeight: 48,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillPrimary: {
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.orange,
  },
  pillSecondary: {
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
  },
  pillText: {
    fontSize: 16,
    fontWeight: '800',
  },
  pillTextPrimary: {
    color: KitchenDesign.colors.cream,
  },
  pillTextSecondary: {
    color: KitchenDesign.colors.ink,
  },
  pressed: {
    opacity: 0.84,
  },
});
