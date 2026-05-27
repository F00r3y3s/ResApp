import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useVoiceCookControls } from './use-voice-cook-controls';
import type { VoiceController } from './voice-controller';

function createMockVoiceController(
  overrides: Partial<VoiceController> = {},
): VoiceController {
  return {
    requestPermission: jest.fn<VoiceController['requestPermission']>().mockResolvedValue('granted'),
    startListening: jest.fn<VoiceController['startListening']>(),
    stopListening: jest.fn<VoiceController['stopListening']>(),
    onResult: jest.fn<VoiceController['onResult']>(),
    onError: jest.fn<VoiceController['onError']>(),
    destroy: jest.fn<VoiceController['destroy']>(),
    ...overrides,
  };
}

describe('useVoiceCookControls', () => {
  let onNext: jest.Mock;
  let onBack: jest.Mock;
  let onRepeat: jest.Mock;

  beforeEach(() => {
    onNext = jest.fn();
    onBack = jest.fn();
    onRepeat = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts in a non-listening state', () => {
    const controller = createMockVoiceController();
    const { result } = renderHook(() =>
      useVoiceCookControls({ controller, onNext, onBack, onRepeat }),
    );

    expect(result.current.isListening).toBe(false);
    expect(result.current.isPermissionDenied).toBe(false);
  });

  it('requests permission and starts listening when startVoice is called', async () => {
    const controller = createMockVoiceController();
    const { result } = renderHook(() =>
      useVoiceCookControls({ controller, onNext, onBack, onRepeat }),
    );

    await act(async () => {
      await result.current.startVoice();
    });

    expect(controller.requestPermission).toHaveBeenCalled();
    expect(controller.startListening).toHaveBeenCalled();
    expect(result.current.isListening).toBe(true);
  });

  it('sets isPermissionDenied when permission is denied', async () => {
    const controller = createMockVoiceController({
      requestPermission: jest.fn<VoiceController['requestPermission']>().mockResolvedValue('denied'),
    });
    const { result } = renderHook(() =>
      useVoiceCookControls({ controller, onNext, onBack, onRepeat }),
    );

    await act(async () => {
      await result.current.startVoice();
    });

    expect(result.current.isPermissionDenied).toBe(true);
    expect(result.current.isListening).toBe(false);
    expect(controller.startListening).not.toHaveBeenCalled();
  });

  it('calls onNext when "next" is recognized', async () => {
    let resultCallback: ((text: string) => void) | null = null;
    const controller = createMockVoiceController({
      onResult: jest.fn<VoiceController['onResult']>().mockImplementation((cb) => {
        resultCallback = cb;
      }),
    });

    const { result } = renderHook(() =>
      useVoiceCookControls({ controller, onNext, onBack, onRepeat }),
    );

    await act(async () => {
      await result.current.startVoice();
    });

    act(() => {
      resultCallback!('next step');
    });

    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when "go back" is recognized', async () => {
    let resultCallback: ((text: string) => void) | null = null;
    const controller = createMockVoiceController({
      onResult: jest.fn<VoiceController['onResult']>().mockImplementation((cb) => {
        resultCallback = cb;
      }),
    });

    const { result } = renderHook(() =>
      useVoiceCookControls({ controller, onNext, onBack, onRepeat }),
    );

    await act(async () => {
      await result.current.startVoice();
    });

    act(() => {
      resultCallback!('go back');
    });

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onRepeat when "repeat" is recognized', async () => {
    let resultCallback: ((text: string) => void) | null = null;
    const controller = createMockVoiceController({
      onResult: jest.fn<VoiceController['onResult']>().mockImplementation((cb) => {
        resultCallback = cb;
      }),
    });

    const { result } = renderHook(() =>
      useVoiceCookControls({ controller, onNext, onBack, onRepeat }),
    );

    await act(async () => {
      await result.current.startVoice();
    });

    act(() => {
      resultCallback!('say again');
    });

    expect(onRepeat).toHaveBeenCalledTimes(1);
  });

  it('does not call any handler for unrecognized speech', async () => {
    let resultCallback: ((text: string) => void) | null = null;
    const controller = createMockVoiceController({
      onResult: jest.fn<VoiceController['onResult']>().mockImplementation((cb) => {
        resultCallback = cb;
      }),
    });

    const { result } = renderHook(() =>
      useVoiceCookControls({ controller, onNext, onBack, onRepeat }),
    );

    await act(async () => {
      await result.current.startVoice();
    });

    act(() => {
      resultCallback!('hello world');
    });

    expect(onNext).not.toHaveBeenCalled();
    expect(onBack).not.toHaveBeenCalled();
    expect(onRepeat).not.toHaveBeenCalled();
  });

  it('stops listening when stopVoice is called', async () => {
    const controller = createMockVoiceController();
    const { result } = renderHook(() =>
      useVoiceCookControls({ controller, onNext, onBack, onRepeat }),
    );

    await act(async () => {
      await result.current.startVoice();
    });
    expect(result.current.isListening).toBe(true);

    act(() => {
      result.current.stopVoice();
    });

    expect(controller.stopListening).toHaveBeenCalled();
    expect(result.current.isListening).toBe(false);
  });

  it('cleans up on unmount by calling destroy', async () => {
    const controller = createMockVoiceController();
    const { result, unmount } = renderHook(() =>
      useVoiceCookControls({ controller, onNext, onBack, onRepeat }),
    );

    await act(async () => {
      await result.current.startVoice();
    });

    unmount();
    expect(controller.destroy).toHaveBeenCalled();
  });

  it('exposes isVoiceAvailable as false when controller is null', () => {
    const { result } = renderHook(() =>
      useVoiceCookControls({ controller: null, onNext, onBack, onRepeat }),
    );

    expect(result.current.isVoiceAvailable).toBe(false);
    expect(result.current.isListening).toBe(false);
  });
});
