/**
 * Injectable voice controller interface for speech-to-text in cook mode.
 *
 * This follows the same injectable-controller pattern as scan-controller.ts,
 * allowing the feature to be fully testable without a real microphone.
 *
 * ## Native dependency required
 *
 * A real implementation requires `@react-native-voice/voice` (or equivalent).
 * This package is NOT currently installed. To enable real voice recognition:
 *
 * 1. Install: `npx expo install @react-native-voice/voice`
 * 2. iOS: Add `NSSpeechRecognitionUsageDescription` and
 *    `NSMicrophoneUsageDescription` to Info.plist via app.json plugins.
 * 3. Android: Add `RECORD_AUDIO` permission to AndroidManifest.xml
 *    (expo-config-plugin or app.json).
 * 4. Replace `createStubVoiceController()` with a real implementation
 *    that wraps `@react-native-voice/voice`.
 *
 * ## Manual QA test stubs (iOS & Android)
 *
 * ### iOS
 * - Verify permission dialog appears on first mic activation.
 * - Verify "next", "back", "repeat" are recognized via Siri speech engine.
 * - Verify denied permission shows fallback UI.
 * - Verify voice works in background audio mode (if applicable).
 *
 * ### Android
 * - Verify RECORD_AUDIO permission dialog appears.
 * - Verify Google speech engine recognizes commands.
 * - Verify denied permission shows fallback UI.
 * - Verify voice works on Android 12+ with restricted background mic access.
 */

export type VoicePermissionStatus = 'granted' | 'denied';

export type VoiceController = {
  /** Request microphone/speech recognition permission from the OS. */
  requestPermission(): Promise<VoicePermissionStatus>;

  /** Begin listening for speech input. */
  startListening(): void;

  /** Stop listening for speech input. */
  stopListening(): void;

  /** Register a callback for speech recognition results. */
  onResult(callback: (text: string) => void): void;

  /** Register a callback for speech recognition errors. */
  onError(callback: (error: string) => void): void;

  /** Clean up resources (remove listeners, release native handles). */
  destroy(): void;
};

/**
 * Stub implementation that always denies permission.
 * Used when no native speech recognition package is installed.
 * The feature degrades gracefully — fallback buttons remain available.
 */
export function createStubVoiceController(): VoiceController {
  return {
    async requestPermission() {
      return 'denied';
    },
    startListening() {
      // No-op: native speech package not installed.
    },
    stopListening() {
      // No-op: native speech package not installed.
    },
    onResult(_callback) {
      // No-op: will never fire without a real implementation.
    },
    onError(_callback) {
      // No-op: will never fire without a real implementation.
    },
    destroy() {
      // No-op: nothing to clean up.
    },
  };
}
