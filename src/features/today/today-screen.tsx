import { router } from 'expo-router';
import { ChefHat, Clock3, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { KitchenAssets, KitchenDesign } from '@/constants/kitchen-design';
import { buildTodaySummary } from '@/features/today/today-model';

const summary = buildTodaySummary({
  pantryExpiringCount: 2,
  savedRecipeCount: 4,
  groceryOpenCount: 6,
  isOnline: false,
  hasAccount: false,
});

const quickActions = [
  {
    title: 'Add pantry item',
    detail: 'Save food on this device first.',
    href: '/pantry',
    icon: ChefHat,
  },
  {
    title: 'Plan from leftovers',
    detail: 'Offline ideas before sync.',
    href: '/recipes',
    icon: Sparkles,
  },
] as const;

export function TodayScreenContent() {
  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <View style={styles.heroFrame}>
        <ImageBackground
          source={KitchenAssets.welcomeHero}
          resizeMode="cover"
          imageStyle={styles.heroImage}
          style={styles.heroImageFrame}>
          <View style={styles.heroOverlay}>
            <View style={styles.privacyBadge}>
              <ShieldCheck color={KitchenDesign.colors.cream} size={16} />
              <Text style={styles.privacyBadgeText}>{summary.modeLabel}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>

      <View style={styles.sheet}>
        <View style={styles.brandLockup}>
          <View style={styles.logoTile}>
            <Image
              source={KitchenAssets.countertopSplash}
              resizeMode="cover"
              style={styles.logoTileImage}
            />
            <View style={styles.logoMark}>
              <ChefHat color={KitchenDesign.colors.ink} size={34} />
              <Sparkles color={KitchenDesign.colors.orange} size={18} />
            </View>
          </View>
          <Text style={styles.title}>Family Kitchen</Text>
          <Text style={styles.subtitle}>Cook from what your family already has.</Text>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIcon}>
            <Clock3 color={KitchenDesign.colors.orange} size={20} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Core tools work offline</Text>
            <Text style={styles.statusDetail}>{summary.networkMessage}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/pantry')}
          style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}>
          <ChefHat color={KitchenDesign.colors.cream} size={22} />
          <Text style={styles.primaryButtonText}>Add pantry item</Text>
        </Pressable>

        <View style={styles.metricsRow}>
          {summary.cards.map((card) => (
            <View key={card.title} style={styles.metricCard}>
              <Text style={styles.metricValue}>{card.value}</Text>
              <Text style={styles.metricTitle}>{card.title}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Start cooking</Text>
          <Text style={styles.sectionCaption}>Local-first steps for today</Text>
        </View>

        <View style={styles.actionList}>
          {quickActions.slice(1).map((action) => {
            const Icon = action.icon;

            return (
              <Pressable
                key={action.title}
                accessibilityRole="button"
                onPress={() => router.push(action.href)}
                style={({ pressed }) => [styles.actionRow, pressed ? styles.pressed : null]}>
                <View style={styles.actionIcon}>
                  <Icon color={KitchenDesign.colors.ink} size={22} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDetail}>{action.detail}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    paddingBottom: 104,
  },
  heroFrame: {
    backgroundColor: KitchenDesign.colors.cream,
  },
  heroImageFrame: {
    minHeight: 300,
    justifyContent: 'flex-start',
  },
  heroImage: {
    borderBottomLeftRadius: KitchenDesign.radius.sheet,
    borderBottomRightRadius: KitchenDesign.radius.sheet,
  },
  heroOverlay: {
    flex: 1,
    paddingHorizontal: KitchenDesign.spacing.lg,
    paddingTop: KitchenDesign.spacing.xl,
    backgroundColor: 'rgba(23, 53, 41, 0.10)',
    borderBottomLeftRadius: KitchenDesign.radius.sheet,
    borderBottomRightRadius: KitchenDesign.radius.sheet,
  },
  privacyBadge: {
    alignSelf: 'flex-start',
    minHeight: 44,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: KitchenDesign.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: KitchenDesign.spacing.sm,
    backgroundColor: 'rgba(23, 53, 41, 0.72)',
  },
  privacyBadgeText: {
    color: KitchenDesign.colors.cream,
    fontSize: KitchenDesign.type.caption,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sheet: {
    marginTop: -34,
    marginHorizontal: KitchenDesign.spacing.md,
    borderRadius: KitchenDesign.radius.sheet,
    padding: 20,
    gap: KitchenDesign.spacing.md,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: 'rgba(221, 208, 195, 0.70)',
    borderWidth: 1,
  },
  brandLockup: {
    alignItems: 'center',
    gap: KitchenDesign.spacing.sm,
    paddingTop: KitchenDesign.spacing.sm,
  },
  logoTile: {
    width: 82,
    height: 82,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: KitchenDesign.colors.cream,
  },
  logoTileImage: {
    position: 'absolute',
    inset: 0,
    opacity: 0.3,
  },
  logoMark: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '500',
    textAlign: 'center',
  },
  subtitle: {
    color: KitchenDesign.colors.muted,
    fontSize: KitchenDesign.type.body,
    lineHeight: 24,
    textAlign: 'center',
  },
  statusCard: {
    minHeight: 72,
    borderRadius: KitchenDesign.radius.card,
    padding: KitchenDesign.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: KitchenDesign.spacing.md,
    backgroundColor: KitchenDesign.colors.cream,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: KitchenDesign.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4E1C8',
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  statusTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  statusDetail: {
    color: KitchenDesign.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: KitchenDesign.spacing.sm,
  },
  metricCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: KitchenDesign.radius.card,
    padding: KitchenDesign.spacing.md,
    backgroundColor: KitchenDesign.colors.cream,
    justifyContent: 'center',
  },
  metricValue: {
    color: KitchenDesign.colors.orange,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  metricTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: KitchenDesign.type.section,
    fontWeight: '900',
  },
  sectionCaption: {
    color: KitchenDesign.colors.muted,
    fontSize: 14,
  },
  actionList: {
    gap: KitchenDesign.spacing.md,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: KitchenDesign.radius.button,
    paddingHorizontal: KitchenDesign.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: KitchenDesign.spacing.sm,
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 18,
    fontWeight: '800',
  },
  actionRow: {
    minHeight: 78,
    borderRadius: KitchenDesign.radius.button,
    padding: KitchenDesign.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: KitchenDesign.spacing.md,
    borderColor: '#BDB2A6',
    borderWidth: 1,
    backgroundColor: KitchenDesign.colors.porcelain,
  },
  pressed: {
    opacity: 0.86,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: KitchenDesign.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 249, 241, 0.20)',
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 17,
    fontWeight: '800',
  },
  actionDetail: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
  },
});
