import { router } from 'expo-router';
import { ChefHat, Mail, Smartphone } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenAssets, KitchenDesign } from '@/constants/kitchen-design';

export function WelcomeScreenContent() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 48) }]}>
      <Image
        source={KitchenAssets.welcomeHero}
        resizeMode="cover"
        style={styles.heroImage}
        accessibilityLabel="Kitchen scene"
      />

      <View style={styles.content}>
        <View style={styles.brandRow}>
          <ChefHat size={36} stroke={KitchenDesign.colors.orange} />
          <Text style={styles.appName}>Family AI Kitchen</Text>
        </View>

        <Text style={styles.tagline}>
          Cook smarter together. Pantry tracking, meal planning, and AI-powered suggestions for your
          household.
        </Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}>
            <Mail size={22} stroke={KitchenDesign.colors.cream} />
            <Text style={styles.primaryButtonText}>Continue with email</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/login')}
            style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]}>
            <Smartphone size={22} stroke={KitchenDesign.colors.ink} />
            <Text style={styles.secondaryButtonText}>Continue with phone</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [styles.skipButton, pressed ? styles.pressed : null]}>
          <Text style={styles.skipText}>Continue as guest</Text>
        </Pressable>

        <Text style={styles.privacyText}>
          Your data stays on your device until you choose to sync. No tracking without consent.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  heroImage: {
    width: '100%',
    height: 260,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 24,
    justifyContent: 'flex-end',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  appName: {
    color: KitchenDesign.colors.ink,
    fontSize: 32,
    fontWeight: '900',
  },
  tagline: {
    color: KitchenDesign.colors.muted,
    fontSize: 18,
    lineHeight: 26,
  },
  actions: {
    gap: 14,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 19,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 58,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: KitchenDesign.colors.ink,
    fontSize: 19,
    fontWeight: '800',
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    color: KitchenDesign.colors.orangePressed,
    fontSize: 17,
    fontWeight: '700',
  },
  privacyText: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
});
