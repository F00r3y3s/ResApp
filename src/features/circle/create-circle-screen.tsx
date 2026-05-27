import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
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
import { ZodError } from 'zod';

import { KitchenDesign } from '@/constants/kitchen-design';

import { circleNameSchema, type CircleRepository } from './circle-repository';

type Props = {
  repository: CircleRepository;
  isOnline: boolean;
};

export function CreateCircleScreenContent({ repository, isOnline }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    if (isSaving || !isOnline) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const cleaned = circleNameSchema.parse(name);
      await repository.createCircle(cleaned);
      router.back();
    } catch (error) {
      if (error instanceof ZodError) {
        setErrorMessage(error.issues[0]?.message ?? 'Please check the form.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Could not create circle.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top + 8, 24) }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={20} stroke={KitchenDesign.colors.ink} />
        </Pressable>
        <Text style={styles.title}>Create circle</Text>
        <View style={styles.iconButton} />
      </View>

      <Text style={styles.helper}>
        A circle is private to its members. Anyone you invite can see recipes, plans, and
        cooksnaps you share inside it.
      </Text>

      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineTitle}>Needs internet</Text>
          <Text style={styles.offlineBody}>
            Circles are server-side. Reconnect before creating one to keep things in sync.
          </Text>
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Circle name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Circle name"
          placeholderTextColor={KitchenDesign.colors.muted}
          style={styles.input}
          maxLength={60}
          autoCapitalize="words"
        />
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create circle"
        onPress={handleSubmit}
        disabled={isSaving || !isOnline}
        style={({ pressed }) => [
          styles.primaryButton,
          (isSaving || !isOnline) ? styles.disabled : null,
          pressed && !isSaving && isOnline ? styles.pressed : null,
        ]}>
        {isSaving ? (
          <ActivityIndicator color={KitchenDesign.colors.cream} />
        ) : (
          <Text style={styles.primaryButtonText}>Create circle</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KitchenDesign.colors.cream },
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: KitchenDesign.colors.ink, fontSize: 22, fontWeight: '900' },
  helper: { color: KitchenDesign.colors.muted, fontSize: 14, lineHeight: 21 },
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
  fieldGroup: { gap: 6 },
  label: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryButtonText: { color: KitchenDesign.colors.cream, fontSize: 17, fontWeight: '900' },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
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
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.5 },
});
