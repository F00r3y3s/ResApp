import { Plus } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ZodError } from 'zod';

import { Colors, Spacing } from '@/constants/theme';

import type { PantryItem, PantryRepository } from './pantry-repository';

type PantryScreenContentProps = {
  repository: PantryRepository;
};

type PantryFormState = {
  name: string;
  quantity: string;
  unit: string;
  location: string;
  expiresAt: string;
};

const initialFormState: PantryFormState = {
  name: '',
  quantity: '',
  unit: '',
  location: '',
  expiresAt: '',
};

export function PantryScreenContent({ repository }: PantryScreenContentProps) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [form, setForm] = useState(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const itemCountLabel = useMemo(() => {
    if (items.length === 0) {
      return 'No pantry items yet';
    }

    return `${items.length} local ${items.length === 1 ? 'item' : 'items'}`;
  }, [items.length]);

  const refreshItems = useCallback(async () => {
    const nextItems = await repository.listItems();
    setItems(nextItems);
  }, [repository]);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      try {
        const nextItems = await repository.listItems();
        if (isMounted) {
          setItems(nextItems);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(toUserMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [repository]);

  async function handleAddItem() {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await repository.addItem({
        name: form.name,
        quantity: form.quantity,
        unit: form.unit,
        location: form.location,
        expiresAt: form.expiresAt,
      });
      setForm(initialFormState);
      await refreshItems();
    } catch (error) {
      setErrorMessage(toUserMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Local pantry</Text>
        <Text style={styles.body}>
          Guest items stay on this device until you choose account sync.
        </Text>
      </View>

      <View style={styles.formPanel}>
        <View style={styles.formRow}>
          <LabeledInput
            label="Name"
            value={form.name}
            placeholder="Brown rice"
            onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          />
          <LabeledInput
            label="Quantity"
            value={form.quantity}
            placeholder="2"
            keyboardType="decimal-pad"
            onChangeText={(quantity) => setForm((current) => ({ ...current, quantity }))}
          />
        </View>
        <View style={styles.formRow}>
          <LabeledInput
            label="Unit"
            value={form.unit}
            placeholder="bags"
            onChangeText={(unit) => setForm((current) => ({ ...current, unit }))}
          />
          <LabeledInput
            label="Location"
            value={form.location}
            placeholder="Pantry"
            onChangeText={(location) => setForm((current) => ({ ...current, location }))}
          />
        </View>
        <LabeledInput
          label="Expiry"
          value={form.expiresAt}
          placeholder="YYYY-MM-DD"
          onChangeText={(expiresAt) => setForm((current) => ({ ...current, expiresAt }))}
        />
        {errorMessage ? (
          <Text selectable style={styles.errorText}>
            {errorMessage}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaving }}
          disabled={isSaving}
          onPress={handleAddItem}
          style={({ pressed }) => [
            styles.addButton,
            pressed && !isSaving ? styles.addButtonPressed : null,
            isSaving ? styles.addButtonDisabled : null,
          ]}>
          {isSaving ? (
            <ActivityIndicator color={Colors.light.surface} />
          ) : (
            <Plus color={Colors.light.surface} size={18} />
          )}
          <Text style={styles.addButtonText}>{isSaving ? 'Adding...' : 'Add item'}</Text>
        </Pressable>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionTitle}>On-device list</Text>
        <Text selectable style={styles.countLabel}>
          {itemCountLabel}
        </Text>
      </View>

      {isLoading ? <ActivityIndicator color={Colors.light.herb} /> : null}

      {!isLoading && items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No pantry items yet</Text>
        </View>
      ) : null}

      {items.map((item) => (
        <View key={item.localId} style={styles.itemRow}>
          <View style={styles.itemMain}>
            <Text selectable style={styles.itemName}>
              {item.name}
            </Text>
            <Text selectable style={styles.itemMeta}>
              {item.quantity} {item.unit}
            </Text>
          </View>
          <View style={styles.itemAside}>
            <Text selectable style={styles.locationText}>
              {item.location}
            </Text>
            {item.expiresAt ? (
              <Text selectable style={styles.expiryText}>
                Expires {item.expiresAt}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function LabeledInput({
  label,
  value,
  placeholder,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad';
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor={Colors.light.textSecondary}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={styles.input}
      />
    </View>
  );
}

function toUserMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? 'Check the pantry item details.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while saving this pantry item.';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: Spacing.four, gap: Spacing.three },
  header: { gap: Spacing.two },
  title: { color: Colors.light.text, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  body: { color: Colors.light.textSecondary, fontSize: 16, lineHeight: 24 },
  formPanel: {
    borderRadius: 8,
    padding: Spacing.three,
    gap: Spacing.three,
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderWidth: 1,
  },
  formRow: { flexDirection: 'row', gap: Spacing.three },
  inputGroup: { flex: 1, gap: Spacing.one, minWidth: 0 },
  inputLabel: { color: Colors.light.text, fontSize: 14, fontWeight: '800' },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderColor: Colors.light.border,
    borderWidth: 1,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  errorText: { color: Colors.light.tomato, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  addButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: Colors.light.herb,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  addButtonPressed: { opacity: 0.86 },
  addButtonDisabled: { opacity: 0.7 },
  addButtonText: { color: Colors.light.surface, fontSize: 16, fontWeight: '900' },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  sectionTitle: { color: Colors.light.text, fontSize: 20, fontWeight: '900' },
  countLabel: { color: Colors.light.textSecondary, fontSize: 14, fontWeight: '700' },
  emptyState: {
    minHeight: 72,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.backgroundElement,
  },
  emptyText: { color: Colors.light.textSecondary, fontSize: 15, fontWeight: '700' },
  itemRow: {
    minHeight: 72,
    borderRadius: 8,
    padding: Spacing.three,
    backgroundColor: Colors.light.surface,
    borderColor: Colors.light.border,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  itemMain: { flex: 1, gap: Spacing.one, minWidth: 0 },
  itemName: { color: Colors.light.text, fontSize: 18, fontWeight: '900' },
  itemMeta: { color: Colors.light.textSecondary, fontSize: 14, lineHeight: 20 },
  itemAside: { alignItems: 'flex-end', gap: Spacing.one, minWidth: 112 },
  locationText: { color: Colors.light.blue, fontSize: 14, fontWeight: '900' },
  expiryText: { color: Colors.light.textSecondary, fontSize: 12, lineHeight: 16 },
});
