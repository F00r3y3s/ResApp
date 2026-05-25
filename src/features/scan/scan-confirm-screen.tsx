import { AlertTriangle, Check, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
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
import type { PantryRepository } from '@/features/pantry/pantry-repository';

import { LOW_CONFIDENCE_THRESHOLD, type DetectedItem } from './detected-item';

export type ScanConfirmScreenProps = {
  detectedItems: DetectedItem[];
  pantryRepository: PantryRepository;
  /** Called after items are saved to pantry. */
  onConfirmed: (savedCount: number) => void;
  /** Called when user dismisses the confirm view (e.g., to rescan). */
  onCancel: () => void;
};

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string }
  | { kind: 'partial'; saved: number; failed: number };

export function ScanConfirmScreen({
  detectedItems,
  pantryRepository,
  onConfirmed,
  onCancel,
}: ScanConfirmScreenProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<DetectedItem[]>(detectedItems);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });

  const includedCount = items.filter((i) => i.isIncluded).length;
  const lowConfidenceCount = items.filter(
    (i) => i.isIncluded && i.confidence < LOW_CONFIDENCE_THRESHOLD,
  ).length;

  function updateItem(id: string, patch: Partial<DetectedItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function toggleIncluded(id: string) {
    updateItem(id, { isIncluded: !items.find((i) => i.id === id)?.isIncluded });
  }

  async function handleConfirmAll() {
    if (saveState.kind === 'saving' || includedCount === 0) return;

    setSaveState({ kind: 'saving' });

    let saved = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of items) {
      if (!item.isIncluded) continue;

      try {
        await pantryRepository.addItem({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          location: item.location,
          expiresAt: item.expiresAt,
        });
        saved += 1;
      } catch (error) {
        failed += 1;
        errors.push(item.name);
      }
    }

    if (failed === 0) {
      setSaveState({ kind: 'idle' });
      onConfirmed(saved);
      return;
    }

    if (saved === 0) {
      setSaveState({
        kind: 'error',
        message: `Couldn't save: ${errors.join(', ')}. Check the values and try again.`,
      });
      return;
    }

    setSaveState({ kind: 'partial', saved, failed });
  }

  if (items.length === 0) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 24) },
          styles.emptyContent,
        ]}>
        <Text style={styles.emptyTitle}>No items detected</Text>
        <Text style={styles.emptyBody}>
          The scan didn&apos;t find anything we recognized. Try a clearer photo.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onCancel}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <ChevronLeft size={22} stroke={KitchenDesign.colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Review detected items</Text>
        <View style={styles.iconButton} />
      </View>

      <Text style={styles.summary}>
        {items.length} item{items.length === 1 ? '' : 's'} detected · {includedCount} to add
      </Text>

      {lowConfidenceCount > 0 ? (
        <View style={styles.warningCard}>
          <AlertTriangle size={20} stroke={KitchenDesign.colors.danger} />
          <Text style={styles.warningText}>
            {lowConfidenceCount} item{lowConfidenceCount === 1 ? '' : 's'} need{lowConfidenceCount === 1 ? 's' : ''} a
            closer look. Verify the highlighted entries before saving.
          </Text>
        </View>
      ) : null}

      <View style={styles.itemList}>
        {items.map((item) => (
          <DetectedItemRow
            key={item.id}
            item={item}
            onChange={(patch) => updateItem(item.id, patch)}
            onToggle={() => toggleIncluded(item.id)}
          />
        ))}
      </View>

      {saveState.kind === 'error' ? (
        <Text style={styles.errorText}>{saveState.message}</Text>
      ) : null}

      {saveState.kind === 'partial' ? (
        <Text style={styles.partialText}>
          Saved {saveState.saved} of {saveState.saved + saveState.failed}. {saveState.failed} couldn&apos;t be saved.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Confirm all and save"
        accessibilityState={{ disabled: includedCount === 0 || saveState.kind === 'saving' }}
        disabled={includedCount === 0 || saveState.kind === 'saving'}
        onPress={handleConfirmAll}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && saveState.kind !== 'saving' ? styles.pressed : null,
          includedCount === 0 || saveState.kind === 'saving' ? styles.disabled : null,
        ]}>
        {saveState.kind === 'saving' ? (
          <ActivityIndicator color={KitchenDesign.colors.cream} />
        ) : (
          <Check size={22} stroke={KitchenDesign.colors.cream} />
        )}
        <Text style={styles.primaryButtonText}>
          {saveState.kind === 'saving'
            ? 'Saving...'
            : `Confirm ${includedCount} item${includedCount === 1 ? '' : 's'}`}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
        <Text style={styles.secondaryButtonText}>Rescan</Text>
      </Pressable>
    </ScrollView>
  );
}

type DetectedItemRowProps = {
  item: DetectedItem;
  onChange: (patch: Partial<DetectedItem>) => void;
  onToggle: () => void;
};

function DetectedItemRow({ item, onChange, onToggle }: DetectedItemRowProps) {
  const isLowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;
  const confidencePercent = Math.round(item.confidence * 100);

  return (
    <View
      style={[
        styles.itemCard,
        isLowConfidence ? styles.itemCardLowConfidence : null,
        !item.isIncluded ? styles.itemCardExcluded : null,
      ]}>
      <View style={styles.itemHeader}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={`${item.isIncluded ? 'Exclude' : 'Include'} ${item.name}`}
          accessibilityState={{ checked: item.isIncluded }}
          onPress={onToggle}
          style={({ pressed }) => [
            styles.checkbox,
            item.isIncluded ? styles.checkboxChecked : null,
            pressed ? styles.pressed : null,
          ]}>
          {item.isIncluded ? <Check size={16} stroke={KitchenDesign.colors.cream} /> : null}
        </Pressable>
        <TextInput
          value={item.name}
          onChangeText={(name) => onChange({ name })}
          placeholder="Item name"
          placeholderTextColor={KitchenDesign.colors.muted}
          style={styles.nameInput}
          accessibilityLabel={`Name for ${item.name}`}
        />
        <View
          style={[
            styles.confidenceBadge,
            isLowConfidence ? styles.confidenceBadgeLow : null,
          ]}>
          {isLowConfidence ? (
            <AlertTriangle size={12} stroke={KitchenDesign.colors.danger} />
          ) : null}
          <Text
            style={[
              styles.confidenceText,
              isLowConfidence ? styles.confidenceTextLow : null,
            ]}>
            {confidencePercent}%
          </Text>
        </View>
      </View>

      <View style={styles.itemFields}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Qty</Text>
          <TextInput
            value={item.quantity}
            onChangeText={(quantity) => onChange({ quantity })}
            placeholder="1"
            placeholderTextColor={KitchenDesign.colors.muted}
            keyboardType="decimal-pad"
            style={styles.fieldInput}
            accessibilityLabel={`Quantity for ${item.name}`}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Unit</Text>
          <TextInput
            value={item.unit}
            onChangeText={(unit) => onChange({ unit })}
            placeholder="bag"
            placeholderTextColor={KitchenDesign.colors.muted}
            style={styles.fieldInput}
            accessibilityLabel={`Unit for ${item.name}`}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Location</Text>
          <TextInput
            value={item.location}
            onChangeText={(location) => onChange({ location })}
            placeholder="Pantry"
            placeholderTextColor={KitchenDesign.colors.muted}
            style={styles.fieldInput}
            accessibilityLabel={`Location for ${item.name}`}
          />
        </View>
      </View>

      <View style={styles.expiryRow}>
        <Text style={styles.fieldLabel}>Expiry</Text>
        <TextInput
          value={item.expiresAt}
          onChangeText={(expiresAt) => onChange({ expiresAt })}
          placeholder="YYYY-MM-DD (optional)"
          placeholderTextColor={KitchenDesign.colors.muted}
          style={styles.fieldInput}
          accessibilityLabel={`Expiry for ${item.name}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 80,
    gap: 16,
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
    gap: 16,
  },
  emptyTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 80,
  },
  emptyBody: {
    color: KitchenDesign.colors.muted,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  summary: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFF0EB',
    borderColor: '#F3B5A4',
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    color: '#8A2A14',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  itemList: {
    gap: 12,
  },
  itemCard: {
    padding: 14,
    borderRadius: 14,
    gap: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  itemCardLowConfidence: {
    borderColor: '#F3B5A4',
    backgroundColor: '#FFFAF8',
  },
  itemCardExcluded: {
    opacity: 0.5,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: KitchenDesign.colors.border,
    borderWidth: 2,
    backgroundColor: KitchenDesign.colors.cream,
  },
  checkboxChecked: {
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.orange,
  },
  nameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: KitchenDesign.colors.ink,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E6F3EA',
    borderColor: '#A6D2B0',
    borderWidth: 1,
  },
  confidenceBadgeLow: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F3B5A4',
  },
  confidenceText: {
    color: '#1F6B33',
    fontSize: 12,
    fontWeight: '900',
  },
  confidenceTextLow: {
    color: KitchenDesign.colors.danger,
  },
  itemFields: {
    flexDirection: 'row',
    gap: 8,
  },
  fieldGroup: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    color: KitchenDesign.colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  fieldInput: {
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    color: KitchenDesign.colors.ink,
    fontSize: 14,
  },
  expiryRow: {
    gap: 4,
  },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  partialText: {
    color: KitchenDesign.colors.orangePressed,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 18,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.6,
  },
});
