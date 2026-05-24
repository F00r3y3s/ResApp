import { router } from 'expo-router';
import {
  Bookmark,
  ChefHat,
  ChevronRight,
  Heart,
  Mic,
  Moon,
  ShoppingBasket,
  Sparkles,
  Sun,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { KitchenAssets, KitchenDesign } from '@/constants/kitchen-design';
import type { GuestPreferences, PreferencesRepository } from '@/features/onboarding/preferences-repository';
import { buildTodaySummary } from '@/features/today/today-model';

const expiringItems = [
  { name: 'Spinach', daysLeft: '2 days left', image: KitchenAssets.todaySpinach },
  { name: 'Yogurt', daysLeft: '3 days left', image: KitchenAssets.todayYogurt },
  { name: 'Tomatoes', daysLeft: '4 days left', image: KitchenAssets.todayTomatoes },
] as const;

const mealPlan = [
  { label: 'Breakfast: Oats', Icon: Sun, color: '#E69B12' },
  { label: 'Lunch: Lentil soup', Icon: Sun, color: '#E69B12' },
  { label: 'Dinner: Traybake', Icon: Moon, color: '#1C5F8F' },
] as const;

export function TodayScreenContent({
  preferencesRepository,
}: {
  preferencesRepository: PreferencesRepository;
}) {
  const [preferences, setPreferences] = useState<GuestPreferences | null>(null);
  const summary = buildTodaySummary({
    pantryExpiringCount: 3,
    savedRecipeCount: 4,
    groceryOpenCount: 3,
    isOnline: false,
    hasAccount: false,
    preferences,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPreferences() {
      const nextPreferences = await preferencesRepository.getPreferences();
      if (isMounted) {
        setPreferences(nextPreferences);
      }
    }

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, [preferencesRepository]);

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.greetingCopy}>
          <Text style={styles.greeting}>Good evening, Khan family</Text>
          <Text style={styles.subGreeting}>{summary.dinnerPlanLabel}</Text>
        </View>
        <Image source={KitchenAssets.todayFamilyAvatar} resizeMode="cover" style={styles.familyAvatar} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/recipes')}
        style={({ pressed }) => [styles.promptBar, pressed ? styles.pressed : null]}>
        <Sparkles size={28} stroke={KitchenDesign.colors.orange} />
        <Text style={styles.promptText}>Ask what to cook, swap, or prep</Text>
        <Mic size={30} stroke={KitchenDesign.colors.ink} />
      </Pressable>

      <View style={styles.cookCard}>
        <ImageBackground
          source={KitchenAssets.todayTraybake}
          resizeMode="cover"
          imageStyle={styles.cookImage}
          style={styles.cookImageFrame}>
          <View style={styles.cookTextPanel}>
            <Text style={styles.cookKicker}>{"Tonight's cook"}</Text>
            <Text style={styles.cookTitle}>Lemon herb chicken traybake</Text>
            <Text style={styles.cookMeta}>35 min · Serves 4 · Uses pantry</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/recipes')}
              style={({ pressed }) => [styles.startButton, pressed ? styles.pressed : null]}>
              <ChefHat size={22} stroke={KitchenDesign.colors.cream} />
              <Text style={styles.startButtonText}>Start cooking</Text>
            </Pressable>
          </View>
          <View style={styles.bookmarkButton}>
            <Bookmark size={27} stroke={KitchenDesign.colors.ink} />
          </View>
        </ImageBackground>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Use soon</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/pantry')}>
          <Text style={styles.sectionAction}>See all</Text>
        </Pressable>
      </View>

      <View style={styles.expiringRow}>
        {expiringItems.map((item) => (
          <View key={item.name} style={styles.expiringCard}>
            <Image source={item.image} resizeMode="cover" style={styles.expiringImage} />
            <View style={styles.expiringCopy}>
              <Text style={styles.expiringName}>{item.name}</Text>
              <Text style={styles.expiringDays}>{item.daysLeft}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.gridRow}>
        <View style={styles.mealCard}>
          <Text style={styles.tileTitle}>Meal plan</Text>
          <View style={styles.mealList}>
            {mealPlan.map(({ label, Icon, color }) => (
              <Pressable
                key={label}
                accessibilityRole="button"
                onPress={() => router.push('/planner')}
                style={({ pressed }) => [styles.mealRow, pressed ? styles.pressed : null]}>
                <Icon size={22} stroke={color} />
                <Text style={styles.mealText}>{label}</Text>
                <ChevronRight size={22} stroke={KitchenDesign.colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.groceryCard}>
          <View style={styles.groceryIcon}>
            <ShoppingBasket size={32} stroke={KitchenDesign.colors.ink} />
          </View>
          <Text style={styles.tileTitle}>Grocery gaps</Text>
          <Text style={styles.groceryCount}>3 items needed{'\n'}for this week</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/grocery')}
            style={({ pressed }) => [styles.reviewButton, pressed ? styles.pressed : null]}>
            <Text style={styles.reviewButtonText}>Review list</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>From your circle</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/recipes')}>
          <Text style={styles.sectionAction}>See all</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/recipes')}
        style={({ pressed }) => [styles.circleCard, pressed ? styles.pressed : null]}>
        <View style={styles.circleAvatarWrap}>
          <Image source={KitchenAssets.todayAishaAvatar} resizeMode="cover" style={styles.circleAvatar} />
          <View style={styles.heartBadge}>
            <Heart size={18} fill={KitchenDesign.colors.orange} stroke={KitchenDesign.colors.cream} />
          </View>
        </View>
        <View style={styles.circleCopy}>
          <Text style={styles.circleText}>
            Aisha saved <Text style={styles.circleRecipe}>Chicken Biryani</Text>
          </Text>
          <Text style={styles.circleTime}>2 hours ago</Text>
        </View>
        <Image source={KitchenAssets.todayBiryani} resizeMode="cover" style={styles.biryaniImage} />
        <ChevronRight size={25} stroke={KitchenDesign.colors.ink} />
      </Pressable>
    </ScrollView>
  );
}

const cardBorder = {
  borderColor: KitchenDesign.colors.border,
  borderWidth: 1,
} as const;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 34,
    paddingBottom: 112,
    gap: 20,
  },
  header: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  greetingCopy: {
    flex: 1,
    gap: 8,
  },
  greeting: {
    color: '#111111',
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '800',
  },
  subGreeting: {
    color: KitchenDesign.colors.muted,
    fontSize: 20,
    lineHeight: 26,
  },
  familyAvatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: KitchenDesign.colors.linen,
  },
  promptBar: {
    minHeight: 74,
    borderRadius: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: KitchenDesign.colors.porcelain,
    ...cardBorder,
  },
  promptText: {
    flex: 1,
    color: KitchenDesign.colors.muted,
    fontSize: 22,
    lineHeight: 28,
  },
  cookCard: {
    minHeight: 270,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: KitchenDesign.colors.porcelain,
    ...cardBorder,
  },
  cookImageFrame: {
    minHeight: 270,
  },
  cookImage: {
    borderRadius: 18,
  },
  cookTextPanel: {
    width: '49%',
    minHeight: 270,
    padding: 24,
    gap: 16,
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 252, 247, 0.93)',
  },
  cookKicker: {
    color: '#111111',
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
  },
  cookTitle: {
    color: '#111111',
    fontSize: 27,
    lineHeight: 37,
    fontWeight: '800',
  },
  cookMeta: {
    color: KitchenDesign.colors.muted,
    fontSize: 16,
    lineHeight: 21,
  },
  startButton: {
    alignSelf: 'flex-start',
    minHeight: 58,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: KitchenDesign.colors.orange,
  },
  startButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 20,
    fontWeight: '800',
  },
  bookmarkButton: {
    position: 'absolute',
    top: 30,
    right: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.porcelain,
  },
  sectionHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#111111',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  sectionAction: {
    color: KitchenDesign.colors.orangePressed,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  expiringRow: {
    flexDirection: 'row',
    gap: 12,
  },
  expiringCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: KitchenDesign.colors.porcelain,
    ...cardBorder,
  },
  expiringImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: KitchenDesign.colors.linen,
  },
  expiringCopy: {
    flex: 1,
    gap: 8,
  },
  expiringName: {
    color: '#111111',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
  },
  expiringDays: {
    color: KitchenDesign.colors.orangePressed,
    fontSize: 16,
    lineHeight: 20,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 14,
  },
  mealCard: {
    flex: 1,
    minHeight: 222,
    borderRadius: 18,
    padding: 22,
    gap: 18,
    backgroundColor: KitchenDesign.colors.porcelain,
    ...cardBorder,
  },
  groceryCard: {
    flex: 1,
    minHeight: 222,
    borderRadius: 18,
    padding: 22,
    gap: 18,
    backgroundColor: KitchenDesign.colors.porcelain,
    ...cardBorder,
  },
  tileTitle: {
    color: '#111111',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  mealList: {
    overflow: 'hidden',
    borderRadius: 12,
    borderColor: 'rgba(221, 208, 195, 0.72)',
    borderWidth: 1,
  },
  mealRow: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 249, 241, 0.72)',
    borderBottomColor: 'rgba(221, 208, 195, 0.72)',
    borderBottomWidth: 1,
  },
  mealText: {
    flex: 1,
    color: '#1C1A18',
    fontSize: 17,
    lineHeight: 22,
  },
  groceryIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6DFC8',
  },
  groceryCount: {
    color: '#35312D',
    fontSize: 22,
    lineHeight: 31,
    marginTop: 10,
  },
  reviewButton: {
    alignSelf: 'flex-start',
    minHeight: 50,
    borderRadius: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: KitchenDesign.colors.orange,
    borderWidth: 1,
  },
  reviewButtonText: {
    color: KitchenDesign.colors.orangePressed,
    fontSize: 18,
    fontWeight: '800',
  },
  circleCard: {
    minHeight: 120,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: KitchenDesign.colors.porcelain,
    ...cardBorder,
  },
  circleAvatarWrap: {
    width: 72,
    height: 72,
  },
  circleAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: KitchenDesign.colors.linen,
  },
  heartBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.porcelain,
    borderWidth: 3,
  },
  circleCopy: {
    flex: 1,
    gap: 8,
  },
  circleText: {
    color: '#111111',
    fontSize: 20,
    lineHeight: 26,
  },
  circleRecipe: {
    color: KitchenDesign.colors.orangePressed,
    fontWeight: '800',
  },
  circleTime: {
    color: KitchenDesign.colors.muted,
    fontSize: 16,
    lineHeight: 20,
  },
  biryaniImage: {
    width: 108,
    height: 72,
    borderRadius: 10,
    backgroundColor: KitchenDesign.colors.linen,
  },
  pressed: {
    opacity: 0.82,
  },
});
