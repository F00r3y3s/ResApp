import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { ArrowLeft, ChefHat, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
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
import type { Recipe, RecipesRepository } from '@/features/recipes/recipes-repository';

import { convert, getCompatibleUnits, SUPPORTED_UNITS, type Unit } from './conversions';
import {
    createCookModeState,
    isFirstStep,
    isLastStep,
    nextStep,
    prevStep,
    progressFraction,
    progressLabel,
    type CookModeState,
} from './cook-mode-model';
import { formatTimeRemaining } from './timer-model';
import { useCountdownTimer } from './use-countdown-timer';

const KEEP_AWAKE_TAG = 'family-ai-kitchen-cook-mode';

type CookModeScreenContentProps = {
  recipeId: string;
  repository: RecipesRepository;
};

export function CookModeScreenContent({ recipeId, repository }: CookModeScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cookState, setCookState] = useState<CookModeState>(() => createCookModeState(0));
  const [showConverter, setShowConverter] = useState(false);

  // Load the recipe.
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    repository
      .getRecipeById(recipeId)
      .then((next) => {
        if (!isMounted) return;
        setRecipe(next);
        setCookState(createCookModeState(next?.steps.length ?? 0));
        setErrorMessage(null);
      })
      .catch((error: unknown) => {
        if (!isMounted) return;
        setErrorMessage(error instanceof Error ? error.message : 'Could not load recipe.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [recipeId, repository]);

  // Keep the screen awake while cook mode is mounted.
  useEffect(() => {
    let cancelled = false;
    activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {
      // Swallow — keep-awake is best-effort and must not break cook mode.
    });
    return () => {
      cancelled = true;
      try {
        deactivateKeepAwake(KEEP_AWAKE_TAG);
      } catch {
        // Best-effort — already-released or unsupported platforms shouldn't crash.
      }
      // Reference cancelled to satisfy strict lint configs.
      void cancelled;
    };
  }, []);

  const currentStep = useMemo(() => {
    if (!recipe) return null;
    return recipe.steps[cookState.currentIndex] ?? null;
  }, [recipe, cookState.currentIndex]);

  const timerDurationSeconds = currentStep?.timerMinutes ? currentStep.timerMinutes * 60 : 0;
  const { state: timerState, isTimerFinished, start: startCountdown, pause: pauseCountdown, reset: resetCountdown } =
    useCountdownTimer(timerDurationSeconds);

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: Math.max(insets.top, 18) }]}>
        <ActivityIndicator color={KitchenDesign.colors.orange} />
      </View>
    );
  }

  if (!recipe) {
    return (
      <View style={[styles.centered, { paddingTop: Math.max(insets.top, 32) }]}>
        <Text style={styles.missingTitle}>We couldn&apos;t find that recipe</Text>
        <Text style={styles.missingHint}>
          It may have been removed, or cook mode was opened with an unknown id.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={20} stroke={KitchenDesign.colors.cream} />
          <Text style={styles.primaryButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const atFirst = isFirstStep(cookState);
  const atLast = isLastStep(cookState);
  const fraction = progressFraction(cookState);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 18) }]}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Exit cook mode"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={22} stroke={KitchenDesign.colors.ink} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {recipe.title}
          </Text>
          <Text style={styles.progressLabel}>{progressLabel(cookState)}</Text>
        </View>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ now: Math.round(fraction * 100), min: 0, max: 100 }}
        style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(0, fraction * 100)}%` }]} />
      </View>

      <ScrollView
        style={styles.stepScroll}
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.stepBadge}>
          <ChefHat size={28} stroke={KitchenDesign.colors.cream} />
          <Text style={styles.stepBadgeText}>
            {currentStep ? `Step ${currentStep.order}` : 'No steps'}
          </Text>
        </View>
        <Text style={styles.stepInstruction}>
          {currentStep ? currentStep.instruction : 'This recipe has no steps yet.'}
        </Text>
        {currentStep?.timerMinutes ? (
          <TimerWidget
            timerState={timerState}
            isTimerFinished={isTimerFinished}
            onStart={startCountdown}
            onPause={pauseCountdown}
            onReset={resetCountdown}
          />
        ) : null}
      </ScrollView>

      {errorMessage ? (
        <Text selectable style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open unit converter"
        onPress={() => setShowConverter(true)}
        style={({ pressed }) => [styles.convertButton, pressed ? styles.pressed : null]}>
        <Text style={styles.convertButtonText}>Convert</Text>
      </Pressable>

      <ConversionModal visible={showConverter} onClose={() => setShowConverter(false)} />

      <View style={[styles.controlsRow, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          accessibilityState={{ disabled: atFirst }}
          disabled={atFirst}
          onPress={() => setCookState((s) => prevStep(s))}
          style={({ pressed }) => [
            styles.controlButton,
            styles.secondaryButton,
            atFirst ? styles.disabledButton : null,
            pressed && !atFirst ? styles.pressed : null,
          ]}>
          <ChevronLeft
            size={24}
            stroke={atFirst ? KitchenDesign.colors.muted : KitchenDesign.colors.ink}
          />
          <Text
            style={[
              styles.controlButtonText,
              atFirst ? styles.disabledText : styles.secondaryButtonText,
            ]}>
            Previous
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next step"
          accessibilityState={{ disabled: atLast }}
          disabled={atLast}
          onPress={() => setCookState((s) => nextStep(s))}
          style={({ pressed }) => [
            styles.controlButton,
            styles.primaryButtonControl,
            atLast ? styles.disabledButton : null,
            pressed && !atLast ? styles.pressed : null,
          ]}>
          <Text
            style={[
              styles.controlButtonText,
              atLast ? styles.disabledText : styles.primaryButtonControlText,
            ]}>
            Next
          </Text>
          <ChevronRight
            size={24}
            stroke={atLast ? KitchenDesign.colors.muted : KitchenDesign.colors.cream}
          />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Timer widget shown on steps with timerMinutes.
 * Displays start/pause/resume controls and a countdown.
 * Shows an in-app "Time's up!" alert when finished.
 *
 * NOTE: Local/push notifications are a follow-up enhancement.
 * This slice uses an in-app banner to keep setup minimal and testable.
 */
function TimerWidget({
  timerState,
  isTimerFinished,
  onStart,
  onPause,
  onReset,
}: {
  timerState: { remaining: number; status: string };
  isTimerFinished: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  if (timerState.status === 'idle') {
    return (
      <View style={styles.timerContainer}>
        <Text style={styles.timerDisplay}>{formatTimeRemaining(timerState.remaining)}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onStart}
          style={({ pressed }) => [styles.timerButton, styles.timerStartButton, pressed ? styles.pressed : null]}>
          <Text style={styles.timerButtonText}>Start timer</Text>
        </Pressable>
      </View>
    );
  }

  if (isTimerFinished) {
    return (
      <View style={styles.timerContainer}>
        <View style={styles.timerAlert}>
          <Text style={styles.timerAlertText}>Time&apos;s up!</Text>
        </View>
        <Text style={styles.timerDisplay}>{formatTimeRemaining(timerState.remaining)}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [styles.timerButton, styles.timerResetButton, pressed ? styles.pressed : null]}>
          <Text style={styles.timerResetButtonText}>Reset</Text>
        </Pressable>
      </View>
    );
  }

  const isPaused = timerState.status === 'paused';

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerDisplay}>{formatTimeRemaining(timerState.remaining)}</Text>
      <View style={styles.timerButtonRow}>
        {isPaused ? (
          <Pressable
            accessibilityRole="button"
            onPress={onStart}
            style={({ pressed }) => [styles.timerButton, styles.timerStartButton, pressed ? styles.pressed : null]}>
            <Text style={styles.timerButtonText}>Resume</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onPause}
            style={({ pressed }) => [styles.timerButton, styles.timerPauseButton, pressed ? styles.pressed : null]}>
            <Text style={styles.timerPauseButtonText}>Pause</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={onReset}
          style={({ pressed }) => [styles.timerButton, styles.timerResetButton, pressed ? styles.pressed : null]}>
          <Text style={styles.timerResetButtonText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Modal for unit conversions.
 * Supports volume, weight, and temperature conversions.
 */
function ConversionModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [inputValue, setInputValue] = useState('1');
  const [fromUnit, setFromUnit] = useState<Unit>('cups');
  const [toUnit, setToUnit] = useState<Unit>('ml');

  const compatibleUnits = useMemo(() => getCompatibleUnits(fromUnit), [fromUnit]);

  // When fromUnit changes, ensure toUnit is compatible
  useEffect(() => {
    const compatible = getCompatibleUnits(fromUnit);
    if (!compatible.includes(toUnit)) {
      setToUnit(compatible[0] ?? 'ml');
    }
  }, [fromUnit, toUnit]);

  const numericValue = parseFloat(inputValue) || 0;
  const result = convert(numericValue, fromUnit, toUnit);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Unit Converter</Text>

          <View style={styles.converterRow}>
            <TextInput
              style={styles.converterInput}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              accessibilityLabel="Conversion input value"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPicker}>
              {SUPPORTED_UNITS.map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => setFromUnit(unit)}
                  style={[styles.unitChip, fromUnit === unit ? styles.unitChipActive : null]}>
                  <Text style={[styles.unitChipText, fromUnit === unit ? styles.unitChipTextActive : null]}>
                    {unit}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.converterArrow}>↓</Text>

          <View style={styles.converterRow}>
            <Text style={styles.converterResult}>
              {result !== null ? result.toFixed(2) : '—'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitPicker}>
              {compatibleUnits.map((unit) => (
                <Pressable
                  key={unit}
                  onPress={() => setToUnit(unit)}
                  style={[styles.unitChip, toUnit === unit ? styles.unitChipActive : null]}>
                  <Text style={[styles.unitChipText, toUnit === unit ? styles.unitChipTextActive : null]}>
                    {unit}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.modalCloseButton, pressed ? styles.pressed : null]}>
            <Text style={styles.modalCloseButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
    paddingHorizontal: 18,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 14,
    backgroundColor: KitchenDesign.colors.cream,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  iconButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  titleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: KitchenDesign.colors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  progressLabel: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  progressTrack: {
    marginTop: 14,
    height: 8,
    borderRadius: 4,
    backgroundColor: KitchenDesign.colors.linen,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: KitchenDesign.colors.orange,
  },
  stepScroll: {
    flex: 1,
    marginTop: 18,
  },
  stepContent: {
    paddingVertical: 18,
    gap: 18,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: KitchenDesign.radius.pill,
    backgroundColor: KitchenDesign.colors.orange,
  },
  stepBadgeText: {
    color: KitchenDesign.colors.cream,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  stepInstruction: {
    color: KitchenDesign.colors.ink,
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '700',
  },
  timerHint: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: KitchenDesign.radius.pill,
    backgroundColor: KitchenDesign.colors.linen,
  },
  timerHintText: {
    color: KitchenDesign.colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  timerContainer: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: KitchenDesign.colors.linen,
  },
  timerDisplay: {
    fontSize: 36,
    fontWeight: '900',
    color: KitchenDesign.colors.ink,
    fontVariant: ['tabular-nums'],
  },
  timerButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timerButton: {
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerStartButton: {
    backgroundColor: KitchenDesign.colors.orange,
  },
  timerPauseButton: {
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  timerResetButton: {
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  timerButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 16,
    fontWeight: '800',
  },
  timerPauseButtonText: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  timerResetButtonText: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  timerAlert: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: KitchenDesign.radius.pill,
    backgroundColor: KitchenDesign.colors.orange,
  },
  timerAlertText: {
    color: KitchenDesign.colors.cream,
    fontSize: 16,
    fontWeight: '900',
  },
  convertButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
    marginTop: 8,
  },
  convertButtonText: {
    color: KitchenDesign.colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: KitchenDesign.colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: KitchenDesign.colors.ink,
    textAlign: 'center',
  },
  converterRow: {
    gap: 10,
  },
  converterInput: {
    borderWidth: 1,
    borderColor: KitchenDesign.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    color: KitchenDesign.colors.ink,
    backgroundColor: KitchenDesign.colors.porcelain,
  },
  converterResult: {
    fontSize: 24,
    fontWeight: '900',
    color: KitchenDesign.colors.ink,
    paddingVertical: 8,
  },
  converterArrow: {
    fontSize: 24,
    textAlign: 'center',
    color: KitchenDesign.colors.muted,
  },
  unitPicker: {
    flexDirection: 'row',
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: KitchenDesign.radius.pill,
    backgroundColor: KitchenDesign.colors.porcelain,
    marginRight: 8,
    borderWidth: 1,
    borderColor: KitchenDesign.colors.border,
  },
  unitChipActive: {
    backgroundColor: KitchenDesign.colors.orange,
    borderColor: KitchenDesign.colors.orange,
  },
  unitChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: KitchenDesign.colors.ink,
  },
  unitChipTextActive: {
    color: KitchenDesign.colors.cream,
  },
  modalCloseButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: KitchenDesign.colors.orange,
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 17,
    fontWeight: '900',
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  controlButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  secondaryButton: {
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  primaryButtonControl: {
    backgroundColor: KitchenDesign.colors.orange,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: KitchenDesign.colors.ink,
  },
  primaryButtonControlText: {
    color: KitchenDesign.colors.cream,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledText: {
    color: KitchenDesign.colors.muted,
  },
  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: KitchenDesign.colors.orange,
  },
  primaryButtonText: {
    color: KitchenDesign.colors.cream,
    fontSize: 17,
    fontWeight: '900',
  },
  missingTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  missingHint: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.84,
  },
});
