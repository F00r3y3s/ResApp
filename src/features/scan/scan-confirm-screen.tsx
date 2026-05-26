import { AlertTriangle, Check, ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { GroceryRepository } from '@/features/grocery/grocery-repository';
import type { PantryRepository } from '@/features/pantry/pantry-repository';

import {
    detectedItemToGroceryDraft,
    detectPantryDuplicates,
    LOW_CONFIDENCE_THRESHOLD,
    type DetectedItem,
    type DuplicateMatch
} from './detected-item';

export type ScanConfirmScreenProps = {
  detectedItems: DetectedItem[];
  pantryRepository: PantryRepository;
  /** Required when `scanMode === 'receipt'` so grocery-bound items can be saved. */
  groceryRepository?: GroceryRepository;
  /** Picks default UI behavior. Defaults to `'pantry-photo'` for the T8.2 flow. */
  scanMode?: 'receipt' | 'pantry-photo';
  /** Called after items are saved to pantry. */
  onConfirmed: (savedCount: number) => void;
  /** Called when user dismisses the confirm view (e.g., to rescan). */
  onCancel: () => void;
};

type DuplicateResolution = 'merge' | 'add';
type DuplicateResolutionMap = Record<string, DuplicateResolution>; // keyed by DetectedItem.id
type SkipPantryByDetectedId = Record<string, boolean>;

type SaveState =
  | { kind: 'idle' }
  | { kind: 'checking-duplicates' }
  | { kind: 'prompting-duplicates'; matches: DuplicateMatch[]; resolutions: DuplicateResolutionMap }
  | { kind: 'saving' }
  | { kind: 'error'; message: string }
  | { kind: 'partial'; saved: number; failed: number };

export function ScanConfirmScreen({
  detectedItems,
  pantryRepository,
  groceryRepository,
  scanMode = 'pantry-photo',
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
    if (saveState.kind === 'saving' || saveState.kind === 'checking-duplicates') return;
    if (includedCount === 0) return;

    if (scanMode === 'receipt') {
      setSaveState({ kind: 'checking-duplicates' });

      let existing: Awaited<ReturnType<PantryRepository['listItems']>> = [];
      try {
        existing = await pantryRepository.listItems();
      } catch (error) {
        // Failing to read existing pantry should never block a save the
        // user has already approved. Degrade gracefully to "no duplicates".
        console.warn(
          '[ScanConfirmScreen] pantryRepository.listItems failed during duplicate check; proceeding without prompt.',
          error,
        );
        await commitSave({});
        return;
      }

      const matches = detectPantryDuplicates(items, existing);
      if (matches.length === 0) {
        await commitSave({});
        return;
      }

      const resolutions: DuplicateResolutionMap = {};
      for (const match of matches) {
        resolutions[match.detectedItemId] = 'merge';
      }
      setSaveState({ kind: 'prompting-duplicates', matches, resolutions });
      return;
    }

    await commitSave({});
  }

  async function commitSave(skipPantryByDetectedId: SkipPantryByDetectedId) {
    setSaveState({ kind: 'saving' });

    const includedItems = items.filter((item) => item.isIncluded);
    const pantryToAdd = includedItems.filter((item) => item.destination !== 'grocery');
    const groceryToAdd = includedItems.filter((item) => item.destination === 'grocery');

    let saved = 0;
    let failed = 0;
    const errors: string[] = [];

    // Pantry adds run one-by-one so we can preserve partial-failure semantics
    // and continue on individual errors. Items the user resolved as `merge`
    // are skipped entirely (no add, not counted as failure).
    for (const item of pantryToAdd) {
      if (skipPantryByDetectedId[item.id] === true) {
        continue;
      }
      try {
        await pantryRepository.addItem({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          location: item.location,
          expiresAt: item.expiresAt,
        });
        saved += 1;
      } catch {
        failed += 1;
        errors.push(item.name);
      }
    }

    // Grocery adds run as a single atomic batch — we can't split partial
    // success within a single addMultipleToList call.
    if (groceryToAdd.length > 0) {
      if (groceryRepository) {
        try {
          const drafts = groceryToAdd.map(detectedItemToGroceryDraft);
          await groceryRepository.addMultipleToList(drafts);
          saved += groceryToAdd.length;
        } catch {
          failed += groceryToAdd.length;
          for (const item of groceryToAdd) {
            errors.push(item.name);
          }
        }
      } else {
        // Misconfigured caller: receipt-mode items routed to grocery but no
        // grocery repo provided. Surface a warning and treat as failed.
        console.warn(
          '[ScanConfirmScreen] grocery-bound items present but no groceryRepository supplied; treating as failed.',
        );
        failed += groceryToAdd.length;
        for (const item of groceryToAdd) {
          errors.push(item.name);
        }
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

  function handleDuplicateResolutionChange(
    detectedItemId: string,
    choice: DuplicateResolution,
  ) {
    setSaveState((prev) => {
      if (prev.kind !== 'prompting-duplicates') return prev;
      return {
        ...prev,
        resolutions: { ...prev.resolutions, [detectedItemId]: choice },
      };
    });
  }

  async function handleDuplicatePromptContinue() {
    if (saveState.kind !== 'prompting-duplicates') return;
    const skip: SkipPantryByDetectedId = {};
    for (const [detectedId, choice] of Object.entries(saveState.resolutions)) {
      if (choice === 'merge') {
        skip[detectedId] = true;
      }
    }
    await commitSave(skip);
  }

  function handleDuplicatePromptBack() {
    setSaveState({ kind: 'idle' });
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

  const isBusy =
    saveState.kind === 'saving' || saveState.kind === 'checking-duplicates';

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
            scanMode={scanMode}
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
        accessibilityState={{ disabled: includedCount === 0 || isBusy }}
        disabled={includedCount === 0 || isBusy}
        onPress={handleConfirmAll}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && !isBusy ? styles.pressed : null,
          includedCount === 0 || isBusy ? styles.disabled : null,
        ]}>
        {isBusy ? (
          <ActivityIndicator color={KitchenDesign.colors.cream} />
        ) : (
          <Check size={22} stroke={KitchenDesign.colors.cream} />
        )}
        <Text style={styles.primaryButtonText}>
          {saveState.kind === 'saving'
            ? 'Saving...'
            : saveState.kind === 'checking-duplicates'
              ? 'Checking...'
              : `Confirm ${includedCount} item${includedCount === 1 ? '' : 's'}`}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onCancel}
        style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
        <Text style={styles.secondaryButtonText}>Rescan</Text>
      </Pressable>

      {saveState.kind === 'prompting-duplicates' ? (
        <DuplicatePromptModal
          matches={saveState.matches}
          resolutions={saveState.resolutions}
          onChange={handleDuplicateResolutionChange}
          onContinue={() => {
            void handleDuplicatePromptContinue();
          }}
          onBack={handleDuplicatePromptBack}
        />
      ) : null}
    </ScrollView>
  );
}

type DetectedItemRowProps = {
  item: DetectedItem;
  scanMode: 'receipt' | 'pantry-photo';
  onChange: (patch: Partial<DetectedItem>) => void;
  onToggle: () => void;
};

function DetectedItemRow({ item, scanMode, onChange, onToggle }: DetectedItemRowProps) {
  const isLowConfidence = item.confidence < LOW_CONFIDENCE_THRESHOLD;
  const confidencePercent = Math.round(item.confidence * 100);
  const showDestinationToggle = scanMode === 'receipt';
  const showPantryFields = item.destination !== 'grocery';

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

      {showDestinationToggle ? (
        <View
          accessible
          accessibilityRole="radiogroup"
          style={styles.destinationToggle}>
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`Send ${item.name} to pantry`}
            accessibilityState={{ selected: item.destination === 'pantry' }}
            onPress={() => onChange({ destination: 'pantry' })}
            style={({ pressed }) => [
              styles.toggleSegment,
              item.destination === 'pantry' ? styles.toggleSegmentActive : null,
              pressed ? styles.pressed : null,
            ]}>
            <Text
              style={[
                styles.toggleSegmentText,
                item.destination === 'pantry' ? styles.toggleSegmentTextActive : null,
              ]}>
              Pantry
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`Send ${item.name} to grocery list`}
            accessibilityState={{ selected: item.destination === 'grocery' }}
            onPress={() => onChange({ destination: 'grocery' })}
            style={({ pressed }) => [
              styles.toggleSegment,
              item.destination === 'grocery' ? styles.toggleSegmentActive : null,
              pressed ? styles.pressed : null,
            ]}>
            <Text
              style={[
                styles.toggleSegmentText,
                item.destination === 'grocery' ? styles.toggleSegmentTextActive : null,
              ]}>
              Grocery
            </Text>
          </Pressable>
        </View>
      ) : null}

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
        {showPantryFields ? (
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
        ) : null}
      </View>

      {showPantryFields ? (
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
      ) : null}
    </View>
  );
}

type DuplicatePromptModalProps = {
  matches: DuplicateMatch[];
  resolutions: DuplicateResolutionMap;
  onChange: (detectedItemId: string, choice: DuplicateResolution) => void;
  onContinue: () => void;
  onBack: () => void;
};

function DuplicatePromptModal({
  matches,
  resolutions,
  onChange,
  onContinue,
  onBack,
}: DuplicatePromptModalProps) {
  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onBack}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Already in your pantry</Text>
          <Text style={styles.modalSubtitle}>
            We found {matches.length} item{matches.length === 1 ? '' : 's'} that already
            exist{matches.length === 1 ? 's' : ''} in your pantry. Pick what to do with each.
          </Text>

          <ScrollView
            style={styles.modalList}
            contentContainerStyle={styles.modalListContent}
            keyboardShouldPersistTaps="handled">
            {matches.map((match) => {
              const choice = resolutions[match.detectedItemId] ?? 'merge';
              return (
                <View key={match.detectedItemId} style={styles.duplicateRow}>
                  <View style={styles.duplicateNameBlock}>
                    <Text style={styles.duplicateName}>{match.detectedName}</Text>
                    <Text style={styles.duplicateSub}>
                      Existing: {match.existingName}
                    </Text>
                  </View>
                  <View style={styles.duplicateActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Merge ${match.detectedName}`}
                      accessibilityState={{ selected: choice === 'merge' }}
                      onPress={() => onChange(match.detectedItemId, 'merge')}
                      style={({ pressed }) => [
                        styles.duplicateActionButton,
                        choice === 'merge' ? styles.duplicateActionButtonActive : null,
                        pressed ? styles.pressed : null,
                      ]}>
                      <Text
                        style={[
                          styles.duplicateActionText,
                          choice === 'merge' ? styles.duplicateActionTextActive : null,
                        ]}>
                        Merge
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${match.detectedName} anyway`}
                      accessibilityState={{ selected: choice === 'add' }}
                      onPress={() => onChange(match.detectedItemId, 'add')}
                      style={({ pressed }) => [
                        styles.duplicateActionButton,
                        choice === 'add' ? styles.duplicateActionButtonActive : null,
                        pressed ? styles.pressed : null,
                      ]}>
                      <Text
                        style={[
                          styles.duplicateActionText,
                          choice === 'add' ? styles.duplicateActionTextActive : null,
                        ]}>
                        Add anyway
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to review"
              onPress={onBack}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.modalFooterButton,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with selections"
              onPress={onContinue}
              style={({ pressed }) => [
                styles.primaryButton,
                styles.modalFooterButton,
                pressed ? styles.pressed : null,
              ]}>
              <Check size={20} stroke={KitchenDesign.colors.cream} />
              <Text style={styles.primaryButtonText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  destinationToggle: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 999,
    padding: 4,
    gap: 4,
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  toggleSegment: {
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  toggleSegmentActive: {
    backgroundColor: KitchenDesign.colors.orange,
  },
  toggleSegmentText: {
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  toggleSegmentTextActive: {
    color: KitchenDesign.colors.cream,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(23, 53, 41, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: KitchenDesign.colors.cream,
    borderTopLeftRadius: KitchenDesign.radius.sheet,
    borderTopRightRadius: KitchenDesign.radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
    gap: 16,
    maxHeight: '85%',
  },
  modalTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: KitchenDesign.colors.muted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  modalList: {
    flexGrow: 0,
  },
  modalListContent: {
    gap: 12,
    paddingBottom: 4,
  },
  duplicateRow: {
    padding: 14,
    borderRadius: 14,
    gap: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  duplicateNameBlock: {
    gap: 2,
  },
  duplicateName: {
    color: KitchenDesign.colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  duplicateSub: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  duplicateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  duplicateActionButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  duplicateActionButtonActive: {
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.orange,
  },
  duplicateActionText: {
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  duplicateActionTextActive: {
    color: KitchenDesign.colors.cream,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  modalFooterButton: {
    flex: 1,
  },
});
