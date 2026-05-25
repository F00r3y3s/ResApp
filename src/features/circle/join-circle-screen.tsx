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

import { inviteCodeSchema, type CircleRepository } from './circle-repository';

type Props = {
  repository: CircleRepository;
  isOnline: boolean;
};

export function JoinCircleScreenContent({ repository, isOnline }: Props) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (isSubmitting || !isOnline) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const cleaned = inviteCodeSchema.parse(code);
      await repository.joinByCode(cleaned);
      router.back();
    } catch (error) {
      if (error instanceof ZodError) {
        setErrorMessage(error.issues[0]?.message ?? 'Please check the invite code.');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Could not join circle.');
      }
    } finally {
      setIsSubmitting(false);
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
        <Text style={styles.title}>Join circle</Text>
        <View style={styles.iconButton} />
      </View>

      <Text style={styles.helper}>
        Ask the person who created the circle for the invite code. We&apos;ll add you as a
        member after we verify it.
      </Text>

      {!isOnline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineTitle}>Needs internet</Text>
          <Text style={styles.offlineBody}>
            We don&apos;t queue circle joins offline. Reconnect and try again.
          </Text>
        </View>
      ) : null}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Invite code</Text>
        <TextInput
          value={code}
          onChangeText={(value) => setCode(value.toUpperCase())}
          placeholder="Invite code"
          placeholderTextColor={KitchenDesign.colors.muted}
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={16}
        />
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Join circle"
        onPress={handleSubmit}
        disabled={isSubmitting || !isOnline}
        style={({ pressed }) => [
          styles.primaryButton,
          (isSubmitting || !isOnline) ? styles.disabled : null,
          pressed && !isSubmitting && isOnline ? styles.pressed : null,
        ]}>
        {isSubmitting ? (
          <ActivityIndicator color={KitchenDesign.colors.cream} />
        ) : (
          <Text style={styles.primaryButtonText}>Join circle</Text>
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
    letterSpacing: 2,
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
