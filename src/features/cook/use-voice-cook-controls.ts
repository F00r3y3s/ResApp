import { useCallback, useEffect, useRef, useState } from 'react';

import { parseVoiceCommand } from './voice-command-parser';
import type { VoiceController } from './voice-controller';

export type UseVoiceCookControlsOptions = {
  /** Injected voice controller (null = voice unavailable). */
  controller: VoiceController | null;
  /** Called when "next" command is recognized. */
  onNext: () => void;
  /** Called when "back" command is recognized. */
  onBack: () => void;
  /** Called when "repeat" command is recognized. */
  onRepeat: () => void;
};

export type UseVoiceCookControlsResult = {
  /** Whether voice recognition is currently active. */
  isListening: boolean;
  /** Whether the user denied microphone/speech permission. */
  isPermissionDenied: boolean;
  /** Whether voice recognition is available on this device. */
  isVoiceAvailable: boolean;
  /** Request permission and start listening. */
  startVoice: () => Promise<void>;
  /** Stop listening. */
  stopVoice: () => void;
};

export function useVoiceCookControls({
  controller,
  onNext,
  onBack,
  onRepeat,
}: UseVoiceCookControlsOptions): UseVoiceCookControlsResult {
  const [isListening, setIsListening] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);

  // Keep stable references to callbacks to avoid re-registering listeners.
  const onNextRef = useRef(onNext);
  const onBackRef = useRef(onBack);
  const onRepeatRef = useRef(onRepeat);
  onNextRef.current = onNext;
  onBackRef.current = onBack;
  onRepeatRef.current = onRepeat;

  const isVoiceAvailable = controller !== null;

  // Register the result handler when controller is available.
  useEffect(() => {
    if (!controller) return;

    controller.onResult((text: string) => {
      const command = parseVoiceCommand(text);
      if (command === 'next') onNextRef.current();
      else if (command === 'back') onBackRef.current();
      else if (command === 'repeat') onRepeatRef.current();
    });

    controller.onError(() => {
      // Errors during listening are non-fatal; we just stop.
      setIsListening(false);
    });

    return () => {
      controller.destroy();
    };
  }, [controller]);

  const startVoice = useCallback(async () => {
    if (!controller) return;

    const status = await controller.requestPermission();
    if (status === 'denied') {
      setIsPermissionDenied(true);
      return;
    }

    controller.startListening();
    setIsListening(true);
  }, [controller]);

  const stopVoice = useCallback(() => {
    if (!controller) return;
    controller.stopListening();
    setIsListening(false);
  }, [controller]);

  return {
    isListening,
    isPermissionDenied,
    isVoiceAvailable,
    startVoice,
    stopVoice,
  };
}
