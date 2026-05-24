import {
  Barcode,
  ChevronRight,
  Plus,
  Search,
  Snowflake,
  UserCircle,
  Warehouse,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ZodError } from 'zod';

import { KitchenAssets, KitchenDesign } from '@/constants/kitchen-design';

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

type PantryGroup = {
  title: string;
  badge: string;
  tone: 'danger' | 'warning' | 'muted';
  items: PantryItem[];
};

const initialFormState: PantryFormState = {
  name: '',
  quantity: '',
  unit: '',
  location: '',
  expiresAt: '',
};

const pantryTabs = ['Fridge', 'Freezer', 'Pantry'] as const;
const referenceToday = Date.UTC(2026, 4, 24);

const pantryItemDetails = {
  spinach: { localName: 'سبانخ', image: KitchenAssets.pantrySpinach },
  'greek yogurt': { localName: 'زبادي', image: KitchenAssets.pantryYogurt },
  yogurt: { localName: 'زبادي', image: KitchenAssets.pantryYogurt },
  tomatoes: { localName: 'Tomato', image: KitchenAssets.pantryTomatoes },
  'frozen peas': { localName: 'مٹر', image: KitchenAssets.pantryPeas },
  'basmati rice': { localName: 'Rice', image: KitchenAssets.pantryRice },
} as const;

export function PantryScreenContent({ repository }: PantryScreenContentProps) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [form, setForm] = useState(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const groups = useMemo(() => groupPantryItems(items), [items]);

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
    if (!isFormOpen) {
      setIsFormOpen(true);
      return;
    }

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
      setIsFormOpen(false);
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
        <Text style={styles.title}>Pantry</Text>
        <UserCircle size={44} stroke={KitchenDesign.colors.ink} />
      </View>

      <View style={styles.tabs}>
        {pantryTabs.map((tab) => (
          <Pressable key={tab} accessibilityRole="button" style={styles.tabButton}>
            <Text style={[styles.tabText, tab === 'Fridge' ? styles.activeTabText : null]}>
              {tab}
            </Text>
            {tab === 'Fridge' ? <View style={styles.activeTabIndicator} /> : null}
          </Pressable>
        ))}
      </View>

      <View style={styles.toolsRow}>
        <View style={styles.searchBox}>
          <Search size={30} stroke={KitchenDesign.colors.muted} />
          <Text style={styles.searchText}>Search ingredients</Text>
        </View>
        <Pressable accessibilityRole="button" style={styles.barcodeButton}>
          <Barcode size={34} stroke={KitchenDesign.colors.ink} />
          <Text style={styles.barcodeText}>barcode scan</Text>
        </Pressable>
      </View>

      {isFormOpen ? (
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
              styles.saveButton,
              pressed && !isSaving ? styles.pressed : null,
              isSaving ? styles.disabled : null,
            ]}>
            {isSaving ? (
              <ActivityIndicator color={KitchenDesign.colors.cream} />
            ) : (
              <Plus size={20} stroke={KitchenDesign.colors.cream} />
            )}
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save item'}</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? <ActivityIndicator color={KitchenDesign.colors.orange} /> : null}

      {!isLoading && items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No pantry items yet</Text>
          <Text style={styles.emptyHint}>Add your first fridge, freezer, or pantry item.</Text>
        </View>
      ) : null}

      {groups.map((group) =>
        group.items.length > 0 ? (
          <PantrySection key={group.title} group={group} />
        ) : null,
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving }}
        disabled={isSaving}
        onPress={handleAddItem}
        style={({ pressed }) => [
          styles.addButton,
          pressed && !isSaving ? styles.pressed : null,
          isSaving ? styles.disabled : null,
        ]}>
        <Plus size={34} stroke={KitchenDesign.colors.cream} />
        <Text style={styles.addButtonText}>Add item</Text>
      </Pressable>
    </ScrollView>
  );
}

function PantrySection({ group }: { group: PantryGroup }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{group.title}</Text>
        <View style={styles.sectionCountWrap}>
          <View style={[styles.sectionBadge, badgeToneStyle[group.tone]]}>
            <Text style={styles.sectionBadgeText}>{group.badge}</Text>
          </View>
          <ChevronRight size={26} stroke={KitchenDesign.colors.ink} />
        </View>
      </View>
      <View style={styles.itemGroup}>
        {group.items.map((item, index) => (
          <PantryItemRow
            key={item.localId}
            item={item}
            showDivider={index < group.items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function PantryItemRow({ item, showDivider }: { item: PantryItem; showDivider: boolean }) {
  const details = getItemDetails(item);
  const locationTone = getLocationTone(item.location);

  return (
    <View style={[styles.itemRow, showDivider ? styles.itemDivider : null]}>
      {details.image ? (
        <Image source={details.image} resizeMode="cover" style={styles.itemImage} />
      ) : (
        <View style={styles.itemImageFallback}>
          <Text style={styles.itemImageInitial}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.itemCopy}>
        <Text selectable style={styles.itemName}>
          {item.name}
        </Text>
        <Text selectable style={styles.localName}>
          {details.localName}
        </Text>
      </View>
      <Text selectable style={styles.quantityText}>
        {formatQuantity(item)}
      </Text>
      <View style={[styles.locationChip, locationTone.chip]}>
        {locationTone.Icon ? <locationTone.Icon size={18} stroke={locationTone.color} /> : null}
        <Text selectable style={[styles.locationText, { color: locationTone.color }]}>
          {item.location}
        </Text>
      </View>
      <View style={[styles.expiryChip, expiryToneStyle(item.expiresAt)]}>
        <Text selectable style={styles.expiryText}>
          {formatExpiry(item.expiresAt)}
        </Text>
      </View>
    </View>
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
        placeholderTextColor={KitchenDesign.colors.muted}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        style={styles.input}
      />
    </View>
  );
}

function groupPantryItems(items: PantryItem[]): PantryGroup[] {
  const expiringSoon: PantryItem[] = [];
  const thisWeek: PantryItem[] = [];
  const later: PantryItem[] = [];

  items.forEach((item) => {
    const daysUntilExpiry = getDaysUntilExpiry(item.expiresAt);

    if (daysUntilExpiry !== null && daysUntilExpiry <= 3) {
      expiringSoon.push(item);
      return;
    }

    if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
      thisWeek.push(item);
      return;
    }

    later.push(item);
  });

  return [
    { title: 'Expiring soon', badge: String(expiringSoon.length), tone: 'danger', items: expiringSoon },
    { title: 'This week', badge: String(thisWeek.length), tone: 'warning', items: thisWeek },
    { title: 'Later', badge: String(later.length), tone: 'muted', items: later },
  ];
}

function getDaysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) {
    return null;
  }

  const expiryTime = Date.parse(`${expiresAt}T00:00:00.000Z`);
  if (Number.isNaN(expiryTime)) {
    return null;
  }

  return Math.ceil((expiryTime - referenceToday) / 86_400_000);
}

function getItemDetails(item: PantryItem) {
  const normalizedName = item.normalizedName as keyof typeof pantryItemDetails;
  const knownDetails = pantryItemDetails[normalizedName];

  return {
    localName: knownDetails?.localName ?? item.normalizedName,
    image: knownDetails?.image,
  };
}

function getLocationTone(location: string) {
  const normalizedLocation = location.trim().toLocaleLowerCase();

  if (normalizedLocation === 'freezer') {
    return {
      Icon: Snowflake,
      color: '#087C9C',
      chip: styles.freezerChip,
    };
  }

  if (normalizedLocation === 'pantry') {
    return {
      Icon: Warehouse,
      color: KitchenDesign.colors.orange,
      chip: styles.pantryChip,
    };
  }

  return {
    Icon: null,
    color: '#1767B1',
    chip: styles.fridgeChip,
  };
}

function formatQuantity(item: PantryItem): string {
  const quantity = Number.isInteger(item.quantity) ? String(item.quantity) : String(item.quantity);
  const unit = item.unit.trim();
  return unit ? `${quantity} ${unit}` : quantity;
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) {
    return 'Later';
  }

  const date = new Date(`${expiresAt}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return 'Later';
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function expiryToneStyle(expiresAt: string | null) {
  const daysUntilExpiry = getDaysUntilExpiry(expiresAt);

  if (daysUntilExpiry !== null && daysUntilExpiry <= 3) {
    return styles.expiryDanger;
  }

  if (daysUntilExpiry !== null && daysUntilExpiry <= 7) {
    return styles.expiryWarning;
  }

  return styles.expiryMuted;
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

const badgeToneStyle = {
  danger: { backgroundColor: '#D7391F' },
  warning: { backgroundColor: '#DC8900' },
  muted: { backgroundColor: '#777777' },
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 30,
    paddingBottom: 118,
    gap: 20,
  },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#151515',
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
  },
  tabs: {
    minHeight: 88,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    color: '#1F1D1B',
    fontSize: 23,
    lineHeight: 29,
  },
  activeTabText: {
    color: KitchenDesign.colors.orangePressed,
    fontWeight: '800',
  },
  activeTabIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: KitchenDesign.colors.orangePressed,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 14,
  },
  searchBox: {
    flex: 1,
    minHeight: 76,
    borderRadius: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: '#BFB8B0',
    borderWidth: 1,
  },
  searchText: {
    color: '#8A8784',
    fontSize: 21,
    lineHeight: 27,
  },
  barcodeButton: {
    width: 94,
    minHeight: 76,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: '#BFB8B0',
    borderWidth: 1,
  },
  barcodeText: {
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    lineHeight: 17,
    textAlign: 'center',
  },
  formPanel: {
    borderRadius: 18,
    padding: 16,
    gap: 14,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    gap: 7,
    minWidth: 0,
  },
  inputLabel: {
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: 10,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    color: KitchenDesign.colors.ink,
    backgroundColor: KitchenDesign.colors.cream,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: KitchenDesign.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
  },
  saveButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 18,
    fontWeight: '900',
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#151515',
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
  },
  sectionCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sectionBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionBadgeText: {
    color: KitchenDesign.colors.cream,
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  itemGroup: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  itemRow: {
    minHeight: 142,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemDivider: {
    borderBottomColor: KitchenDesign.colors.border,
    borderBottomWidth: 1,
  },
  itemImage: {
    width: 76,
    height: 76,
    borderRadius: 8,
    backgroundColor: KitchenDesign.colors.linen,
  },
  itemImageFallback: {
    width: 76,
    height: 76,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.linen,
  },
  itemImageInitial: {
    color: KitchenDesign.colors.ink,
    fontSize: 28,
    fontWeight: '900',
  },
  itemCopy: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  itemName: {
    color: '#151515',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
  },
  localName: {
    color: '#151515',
    fontSize: 17,
    lineHeight: 22,
  },
  quantityText: {
    width: 76,
    color: '#151515',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  locationChip: {
    minWidth: 112,
    minHeight: 44,
    borderRadius: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
  },
  fridgeChip: {
    borderColor: '#77AEE8',
    backgroundColor: '#EEF7FF',
  },
  freezerChip: {
    borderColor: '#7FC4D8',
    backgroundColor: '#EFFBFF',
  },
  pantryChip: {
    borderColor: '#F1B35C',
    backgroundColor: '#FFF8EA',
  },
  locationText: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
  },
  expiryChip: {
    minWidth: 86,
    minHeight: 44,
    borderRadius: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  expiryDanger: {
    borderColor: '#F3B5A4',
    backgroundColor: '#FFF0EB',
  },
  expiryWarning: {
    borderColor: '#F1D08C',
    backgroundColor: '#FFF9EA',
  },
  expiryMuted: {
    borderColor: '#D8D8D8',
    backgroundColor: '#F1F1F1',
  },
  expiryText: {
    color: '#C94728',
    fontSize: 17,
    lineHeight: 21,
  },
  emptyState: {
    minHeight: 118,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  emptyText: {
    color: KitchenDesign.colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyHint: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  addButton: {
    minHeight: 74,
    borderRadius: 12,
    backgroundColor: KitchenDesign.colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
  },
  addButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.68,
  },
});
