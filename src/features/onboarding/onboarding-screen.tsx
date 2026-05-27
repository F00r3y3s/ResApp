import { router } from 'expo-router';
import { Check, Minus, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';
import { Analytics } from '@/lib/analytics/analytics';


import type { GuestPreferencesInput, PreferencesRepository } from './preferences-repository';

type StepKey = 'region' | 'diet' | 'cuisine' | 'pantry' | 'recipe';

type OnboardingScreenContentProps = {
  repository: PreferencesRepository;
};

type OnboardingPreferencesState = {
  language: GuestPreferencesInput['language'];
  region: GuestPreferencesInput['region'];
  householdSize: number;
  dietaryRules: string[];
  allergies: string[];
  cuisines: string[];
  goals: string[];
};

const steps: StepKey[] = ['region', 'diet', 'cuisine', 'pantry', 'recipe'];

const languageOptions = [
  { id: 'english', label: 'English' },
  { id: 'arabic', label: 'Arabic' },
  { id: 'hindi', label: 'Hindi' },
  { id: 'urdu', label: 'Urdu' },
  { id: 'bengali', label: 'Bengali' },
  { id: 'tamil', label: 'Tamil' },
  { id: 'malayalam', label: 'Malayalam' },
  { id: 'turkish', label: 'Turkish' },
] as const;

const regionOptions = [
  { id: 'uae-gcc', label: 'UAE / GCC' },
  { id: 'india', label: 'India' },
  { id: 'pakistan', label: 'Pakistan' },
  { id: 'bangladesh', label: 'Bangladesh' },
  { id: 'turkey', label: 'Turkey' },
  { id: 'uk-us', label: 'UK / US' },
] as const;

const dietaryOptions = ['halal', 'vegetarian', 'vegan', 'gluten-free'] as const;
const allergyOptions = ['peanuts', 'tree-nuts', 'dairy', 'eggs', 'seafood'] as const;
const cuisineOptions = ['levantine', 'indian', 'pakistani', 'turkish', 'emirati', 'british'] as const;
const goalOptions = ['save-money', 'reduce-waste', 'quick-dinners', 'ramadan-prep', 'healthy-meals'] as const;

export function OnboardingScreenContent({ repository }: OnboardingScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<OnboardingPreferencesState>({
    language: 'english',
    region: 'uae-gcc',
    householdSize: 4,
    dietaryRules: [],
    allergies: [],
    cuisines: [],
    goals: [],
  });

  const currentStep = steps[stepIndex];
  const progressLabel = useMemo(() => `${stepIndex + 1} of ${steps.length}`, [stepIndex]);

  async function handleContinue() {
    if (currentStep !== 'recipe') {
      setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await repository.savePreferences(preferences);
      Analytics.track('onboarding_completed', { step_count: steps.length });
      router.replace('/sync-consent');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save preferences.');
    } finally {
      setIsSaving(false);
    }
  }

  function updateList(field: 'dietaryRules' | 'allergies' | 'cuisines' | 'goals', value: string) {
    setPreferences((current) => {
      const currentValues = current[field];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return { ...current, [field]: nextValues };
    });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 18) }]}>

      <View style={styles.progressRow}>
        <Text style={styles.progressText}>{progressLabel}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((stepIndex + 1) / steps.length) * 100}%` }]} />
        </View>
      </View>

      {currentStep === 'region' ? (
        <View style={styles.panel}>
          <Text style={styles.title}>Language + region</Text>
          <Text style={styles.body}>Choose the household defaults Smart Chef should remember offline.</Text>
          <Text style={styles.groupTitle}>Language</Text>
          <View style={styles.chipGrid}>
            {languageOptions.map((option) => (
              <ChoiceChip
                key={option.id}
                label={option.label}
                selected={preferences.language === option.id}
                onPress={() => setPreferences((current) => ({ ...current, language: option.id }))}
              />
            ))}
          </View>
          <Text style={styles.groupTitle}>Region</Text>
          <View style={styles.chipGrid}>
            {regionOptions.map((option) => (
              <ChoiceChip
                key={option.id}
                label={option.label}
                selected={preferences.region === option.id}
                onPress={() => setPreferences((current) => ({ ...current, region: option.id }))}
              />
            ))}
          </View>
        </View>
      ) : null}

      {currentStep === 'diet' ? (
        <View style={styles.panel}>
          <Text style={styles.title}>Diet + household</Text>
          <Text style={styles.body}>Set serving size, diet rules, and allergy guardrails before recipes appear.</Text>
          <View style={styles.stepperRow}>
            <Text style={styles.groupTitle}>Household size</Text>
            <View style={styles.stepperControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease household size"
                onPress={() =>
                  setPreferences((current) => ({
                    ...current,
                    householdSize: Math.max(1, Number(current.householdSize) - 1),
                  }))
                }
                style={styles.iconButton}>
                <Minus size={20} stroke={KitchenDesign.colors.ink} />
              </Pressable>
              <Text style={styles.householdCount}>{preferences.householdSize}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase household size"
                onPress={() =>
                  setPreferences((current) => ({
                    ...current,
                    householdSize: Math.min(24, Number(current.householdSize) + 1),
                  }))
                }
                style={styles.iconButton}>
                <Plus size={20} stroke={KitchenDesign.colors.ink} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.groupTitle}>Diet rules</Text>
          <View style={styles.chipGrid}>
            {dietaryOptions.map((option) => (
              <ChoiceChip
                key={option}
                label={formatOption(option)}
                selected={preferences.dietaryRules.includes(option)}
                onPress={() => updateList('dietaryRules', option)}
              />
            ))}
          </View>
          <Text style={styles.groupTitle}>Allergies</Text>
          <View style={styles.chipGrid}>
            {allergyOptions.map((option) => (
              <ChoiceChip
                key={option}
                label={formatOption(option)}
                selected={preferences.allergies.includes(option)}
                onPress={() => updateList('allergies', option)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {currentStep === 'cuisine' ? (
        <View style={styles.panel}>
          <Text style={styles.title}>Cuisine + goals</Text>
          <Text style={styles.body}>Pick the flavors and outcomes your family wants first.</Text>
          <Text style={styles.groupTitle}>Cuisines</Text>
          <View style={styles.chipGrid}>
            {cuisineOptions.map((option) => (
              <ChoiceChip
                key={option}
                label={formatOption(option)}
                selected={preferences.cuisines.includes(option)}
                onPress={() => updateList('cuisines', option)}
              />
            ))}
          </View>
          <Text style={styles.groupTitle}>Goals</Text>
          <View style={styles.chipGrid}>
            {goalOptions.map((option) => (
              <ChoiceChip
                key={option}
                label={formatOption(option)}
                selected={preferences.goals.includes(option)}
                onPress={() => updateList('goals', option)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {currentStep === 'pantry' ? (
        <View style={styles.panel}>
          <Text style={styles.title}>First pantry scan</Text>
          <Text style={styles.body}>Start with a scan when camera review is ready, or add ingredients manually now.</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Pantry / fridge preview</Text>
            <Text style={styles.previewBody}>Scan pantry, Add manually, or Skip for now.</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={handleContinue} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Add manually</Text>
          </Pressable>
        </View>
      ) : null}

      {currentStep === 'recipe' ? (
        <View style={styles.panel}>
          <Text style={styles.title}>First recipe import</Text>
          <Text style={styles.body}>Paste a recipe later, import from photo/PDF/voice, or start with manual entry.</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewTitle}>Parsed recipe preview</Text>
            <Text style={styles.previewBody}>Recipes stay local until you consent to sync.</Text>
          </View>
          {errorMessage ? (
            <Text selectable style={styles.errorText}>
              {errorMessage}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving }}
        disabled={isSaving}
        onPress={handleContinue}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && !isSaving ? styles.pressed : null,
          isSaving ? styles.disabled : null,
        ]}>
        {isSaving ? <ActivityIndicator color={KitchenDesign.colors.cream} /> : null}
        <Text style={styles.primaryButtonText}>
          {currentStep === 'recipe' ? 'Save preferences' : 'Continue'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.selectedChip : null,
        pressed ? styles.pressed : null,
      ]}>
      {selected ? <Check size={16} stroke={KitchenDesign.colors.cream} /> : null}
      <Text style={[styles.chipText, selected ? styles.selectedChipText : null]}>{label}</Text>
    </Pressable>
  );
}

function formatOption(value: string): string {
  return value
    .split('-')
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: KitchenDesign.colors.cream },
  content: { padding: 18, paddingBottom: 112, gap: 18 },
  progressRow: { gap: 10 },
  progressText: { color: KitchenDesign.colors.muted, fontSize: 14, fontWeight: '800' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: KitchenDesign.colors.linen,
  },
  progressFill: { height: 8, backgroundColor: KitchenDesign.colors.orange },
  panel: {
    borderRadius: 18,
    padding: 20,
    gap: 16,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  title: { color: KitchenDesign.colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '900' },
  body: { color: KitchenDesign.colors.muted, fontSize: 16, lineHeight: 23 },
  groupTitle: { color: KitchenDesign.colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '900' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    minHeight: 46,
    borderRadius: KitchenDesign.radius.pill,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  selectedChip: { backgroundColor: KitchenDesign.colors.orange, borderColor: KitchenDesign.colors.orange },
  chipText: { color: KitchenDesign.colors.ink, fontSize: 16, fontWeight: '800' },
  selectedChipText: { color: KitchenDesign.colors.cream },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  householdCount: {
    minWidth: 32,
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  previewBox: {
    minHeight: 150,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  previewTitle: { color: KitchenDesign.colors.ink, fontSize: 20, fontWeight: '900' },
  previewBody: { color: KitchenDesign.colors.muted, fontSize: 15, lineHeight: 22 },
  primaryButton: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryButtonText: { color: KitchenDesign.colors.cream, fontSize: 19, fontWeight: '900' },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: KitchenDesign.colors.orange,
    borderWidth: 1,
  },
  secondaryButtonText: { color: KitchenDesign.colors.orangePressed, fontSize: 18, fontWeight: '900' },
  errorText: { color: KitchenDesign.colors.danger, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  pressed: { opacity: 0.84 },
  disabled: { opacity: 0.68 },
});
