import { router } from 'expo-router';
import { ArrowLeft, Camera, ImagePlus, RefreshCcw } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KitchenDesign } from '@/constants/kitchen-design';
import type { PantryRepository } from '@/features/pantry/pantry-repository';

import {
    parseDetectedItems,
    type DetectedItem,
    type ScanParseResponse
} from './detected-item';
import { ScanConfirmScreen } from './scan-confirm-screen';
import { createScanController, type ScanController } from './scan-controller';

export type ScanParseSender = (imageUri: string) => Promise<ScanParseResponse>;

type ScanReviewScreenContentProps = {
  controller?: ScanController;
  /** Pantry repository for saving confirmed items. */
  pantryRepository?: PantryRepository;
  /** AI gateway sender for scan-parse. If null, confirm flow is disabled (T8.1 fallback). */
  scanParseSender?: ScanParseSender | null;
};

type ScanState =
  | { kind: 'idle' }
  | { kind: 'requesting' }
  | { kind: 'reviewing'; uri: string }
  | { kind: 'parsing'; uri: string }
  | { kind: 'confirming'; uri: string; items: DetectedItem[] }
  | { kind: 'denied'; source: 'camera' | 'gallery' };

const defaultController = createScanController();

export function ScanReviewScreenContent({
  controller = defaultController,
  pantryRepository,
  scanParseSender,
}: ScanReviewScreenContentProps) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<ScanState>({ kind: 'idle' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCapture = useCallback(async () => {
    setErrorMessage(null);
    setState({ kind: 'requesting' });
    try {
      const permission = await controller.requestCameraPermission();
      if (permission !== 'granted') {
        setState({ kind: 'denied', source: 'camera' });
        return;
      }
      const capture = await controller.capture();
      if (!capture) {
        setState({ kind: 'idle' });
        return;
      }
      setState({ kind: 'reviewing', uri: capture.uri });
    } catch (error) {
      setErrorMessage(toMessage(error));
      setState({ kind: 'idle' });
    }
  }, [controller]);

  const handlePickFromGallery = useCallback(async () => {
    setErrorMessage(null);
    setState({ kind: 'requesting' });
    try {
      const permission = await controller.requestGalleryPermission();
      if (permission !== 'granted') {
        setState({ kind: 'denied', source: 'gallery' });
        return;
      }
      const capture = await controller.pickFromGallery();
      if (!capture) {
        setState({ kind: 'idle' });
        return;
      }
      setState({ kind: 'reviewing', uri: capture.uri });
    } catch (error) {
      setErrorMessage(toMessage(error));
      setState({ kind: 'idle' });
    }
  }, [controller]);

  const handleCancel = useCallback(() => {
    if (router.canGoBack?.()) {
      router.back();
      return;
    }
    router.back();
  }, []);

  const handleRescan = useCallback(() => {
    setErrorMessage(null);
    setState({ kind: 'idle' });
  }, []);

  const handleConfirm = useCallback(async () => {
    if (state.kind !== 'reviewing') return;

    // If no AI sender or pantry repo provided, fall back to T8.1 behavior:
    // just dismiss the screen.
    if (!scanParseSender || !pantryRepository) {
      handleCancel();
      return;
    }

    setState({ kind: 'parsing', uri: state.uri });
    setErrorMessage(null);

    try {
      const response = await scanParseSender(state.uri);
      const items = parseDetectedItems(response);
      setState({ kind: 'confirming', uri: state.uri, items });
    } catch (error) {
      setErrorMessage(toMessage(error));
      setState({ kind: 'reviewing', uri: state.uri });
    }
  }, [state, scanParseSender, pantryRepository, handleCancel]);

  const handleConfirmed = useCallback(
    (savedCount: number) => {
      // Save complete — return user to wherever they came from.
      // Future: emit a toast or navigate to pantry.
      console.log(`[scan] saved ${savedCount} items to pantry`);
      handleCancel();
    },
    [handleCancel],
  );

  const handleCancelConfirm = useCallback(() => {
    setState({ kind: 'idle' });
    setErrorMessage(null);
  }, []);

  // Confirm view — separate full-screen flow once items are detected.
  if (state.kind === 'confirming' && pantryRepository) {
    return (
      <ScanConfirmScreen
        detectedItems={state.items}
        pantryRepository={pantryRepository}
        onConfirmed={handleConfirmed}
        onCancel={handleCancelConfirm}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 24) }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={handleCancel}
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}>
          <ArrowLeft size={22} stroke={KitchenDesign.colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Kitchen Lens</Text>
        <View style={styles.iconButton} />
      </View>

      {state.kind === 'reviewing' || state.kind === 'parsing' ? (
        <ReviewView
          uri={state.uri}
          isParsing={state.kind === 'parsing'}
          errorMessage={errorMessage}
          onCancel={handleCancel}
          onRescan={handleRescan}
          onConfirm={handleConfirm}
        />
      ) : (
        <CaptureView
          state={state}
          errorMessage={errorMessage}
          onCapture={handleCapture}
          onPickFromGallery={handlePickFromGallery}
        />
      )}
    </ScrollView>
  );
}

type CaptureViewProps = {
  state: ScanState;
  errorMessage: string | null;
  onCapture: () => void;
  onPickFromGallery: () => void;
};

function CaptureView({ state, errorMessage, onCapture, onPickFromGallery }: CaptureViewProps) {
  const isBusy = state.kind === 'requesting';
  const isCameraDenied = state.kind === 'denied' && state.source === 'camera';
  const isGalleryDenied = state.kind === 'denied' && state.source === 'gallery';

  return (
    <View style={styles.captureWrap}>
      <View style={styles.heroCard}>
        <View style={styles.iconBubble}>
          <Camera size={32} stroke={KitchenDesign.colors.ink} />
        </View>
        <Text style={styles.heroTitle}>Scan something</Text>
        <Text style={styles.heroBody}>
          Take a photo of your pantry, a receipt, or a recipe to start a Kitchen Lens scan. The
          image stays on your device until you confirm a save in a future step.
        </Text>
      </View>

      {isCameraDenied ? (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Camera access is off</Text>
          <Text style={styles.alertBody}>
            Turn on camera access in Settings to take a scan photo. You can still pick an image
            from your gallery.
          </Text>
        </View>
      ) : null}

      {isGalleryDenied ? (
        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Photo library access is off</Text>
          <Text style={styles.alertBody}>
            Turn on photo library access in Settings to import an image. You can still take a
            new photo with the camera.
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <Text selectable style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Take photo"
        accessibilityState={{ disabled: isBusy }}
        disabled={isBusy}
        onPress={onCapture}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && !isBusy ? styles.pressed : null,
          isBusy ? styles.disabled : null,
        ]}>
        {isBusy ? (
          <ActivityIndicator color={KitchenDesign.colors.cream} />
        ) : (
          <Camera size={22} stroke={KitchenDesign.colors.cream} />
        )}
        <Text style={styles.primaryButtonText}>Take photo</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose from gallery"
        accessibilityState={{ disabled: isBusy }}
        disabled={isBusy}
        onPress={onPickFromGallery}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && !isBusy ? styles.pressed : null,
          isBusy ? styles.disabled : null,
        ]}>
        <ImagePlus size={20} stroke={KitchenDesign.colors.ink} />
        <Text style={styles.secondaryButtonText}>Choose from gallery</Text>
      </Pressable>

      <Text style={styles.privacyNote}>
        Family AI Kitchen never uploads images at this step. Sending photos for AI processing
        comes later and asks for explicit consent.
      </Text>
    </View>
  );
}

type ReviewViewProps = {
  uri: string;
  isParsing: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onRescan: () => void;
  onConfirm: () => void;
};

function ReviewView({ uri, isParsing, errorMessage, onCancel, onRescan, onConfirm }: ReviewViewProps) {
  return (
    <View style={styles.reviewWrap}>
      <Text style={styles.reviewTitle}>Review</Text>
      <Text style={styles.reviewBody}>
        Looks good? Confirm to detect items in the photo. Detected items can be edited and
        confirmed before saving.
      </Text>

      <View style={styles.imageFrame}>
        <Image
          accessibilityRole="image"
          accessibilityLabel="Captured scan image"
          accessibilityHint="Captured image preview"
          source={{ uri }}
          resizeMode="cover"
          style={styles.image}
        />
      </View>

      {errorMessage ? (
        <Text selectable style={styles.errorText}>
          {errorMessage}
        </Text>
      ) : null}

      <View style={styles.reviewActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isParsing}
          onPress={onRescan}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && !isParsing ? styles.pressed : null,
            isParsing ? styles.disabled : null,
          ]}>
          <RefreshCcw size={20} stroke={KitchenDesign.colors.ink} />
          <Text style={styles.secondaryButtonText}>Rescan</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={isParsing}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.tertiaryButton,
            pressed && !isParsing ? styles.pressed : null,
            isParsing ? styles.disabled : null,
          ]}>
          <Text style={styles.tertiaryButtonText}>Cancel</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Confirm and detect items"
        accessibilityState={{ disabled: isParsing }}
        disabled={isParsing}
        onPress={onConfirm}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && !isParsing ? styles.pressed : null,
          isParsing ? styles.disabled : null,
        ]}>
        {isParsing ? (
          <ActivityIndicator color={KitchenDesign.colors.cream} />
        ) : null}
        <Text style={styles.primaryButtonText}>
          {isParsing ? 'Detecting items...' : 'Detect items'}
        </Text>
      </Pressable>
    </View>
  );
}

function toMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong with the camera. Try again.';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: KitchenDesign.colors.cream,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 80,
    gap: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 22,
    fontWeight: '900',
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
  captureWrap: {
    gap: 16,
  },
  heroCard: {
    minHeight: 200,
    borderRadius: 18,
    padding: 20,
    gap: 12,
    backgroundColor: KitchenDesign.colors.porcelain,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  iconBubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F6DFC8',
  },
  heroTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
  },
  heroBody: {
    color: KitchenDesign.colors.muted,
    fontSize: 16,
    lineHeight: 23,
  },
  alertCard: {
    borderRadius: 14,
    padding: 14,
    gap: 6,
    backgroundColor: '#FFF0EB',
    borderColor: '#F3B5A4',
    borderWidth: 1,
  },
  alertTitle: {
    color: '#8A2A14',
    fontSize: 16,
    fontWeight: '900',
  },
  alertBody: {
    color: '#8A2A14',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: KitchenDesign.colors.danger,
    fontSize: 14,
    lineHeight: 20,
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
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
  tertiaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: KitchenDesign.colors.cream,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  tertiaryButtonText: {
    color: KitchenDesign.colors.ink,
    fontSize: 16,
    fontWeight: '800',
  },
  privacyNote: {
    color: KitchenDesign.colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  reviewWrap: {
    gap: 14,
  },
  reviewTitle: {
    color: KitchenDesign.colors.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
  },
  reviewBody: {
    color: KitchenDesign.colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  imageFrame: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: KitchenDesign.colors.linen,
    borderColor: KitchenDesign.colors.border,
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  pressed: {
    opacity: 0.84,
  },
  disabled: {
    opacity: 0.6,
  },
});
