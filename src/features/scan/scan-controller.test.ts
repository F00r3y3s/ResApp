import { describe, expect, it, jest } from '@jest/globals';

import { createScanController, type ScanImagePicker } from './scan-controller';

type Permission = { granted: boolean; status: 'granted' | 'denied' | 'undetermined' };

function permission(granted: boolean): Permission {
  return { granted, status: granted ? 'granted' : 'denied' };
}

function makePickerStub(overrides: Partial<ScanImagePicker> = {}): ScanImagePicker {
  return {
    requestCameraPermissionsAsync: jest.fn(async () => permission(true)) as any,
    requestMediaLibraryPermissionsAsync: jest.fn(async () => permission(true)) as any,
    launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })) as any,
    launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })) as any,
    ...overrides,
  };
}

describe('createScanController — camera permissions', () => {
  it('returns granted when the OS grants camera access', async () => {
    const picker = makePickerStub({
      requestCameraPermissionsAsync: jest.fn(async () => permission(true)) as any,
    });
    const controller = createScanController(picker);

    expect(await controller.requestCameraPermission()).toBe('granted');
    expect(picker.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('returns denied when the user blocks camera access', async () => {
    const picker = makePickerStub({
      requestCameraPermissionsAsync: jest.fn(async () => permission(false)) as any,
    });
    const controller = createScanController(picker);

    expect(await controller.requestCameraPermission()).toBe('denied');
  });

  it('also exposes a gallery permission request that mirrors the OS result', async () => {
    const picker = makePickerStub({
      requestMediaLibraryPermissionsAsync: jest.fn(async () => permission(false)) as any,
    });
    const controller = createScanController(picker);

    expect(await controller.requestGalleryPermission()).toBe('denied');
  });
});

describe('createScanController — capture()', () => {
  it('returns the first asset uri when the user confirms a photo', async () => {
    const picker = makePickerStub({
      launchCameraAsync: jest.fn(async () => ({
        canceled: false,
        assets: [{ uri: 'file:///tmp/scan-1.jpg', width: 1, height: 1 }],
      })) as any,
    });
    const controller = createScanController(picker);

    const captured = await controller.capture();

    expect(captured).toEqual({ uri: 'file:///tmp/scan-1.jpg' });
  });

  it('returns null when the user cancels the camera', async () => {
    const picker = makePickerStub({
      launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })) as any,
    });
    const controller = createScanController(picker);

    expect(await controller.capture()).toBeNull();
  });

  it('does not request any remote upload — only forwards the local uri', async () => {
    // Privacy contract sanity: capture() returns whatever uri the OS gives us.
    // It should not contain an http(s) URL because nothing in T8.1 uploads.
    const picker = makePickerStub({
      launchCameraAsync: jest.fn(async () => ({
        canceled: false,
        assets: [{ uri: 'file:///private/var/scan-2.jpg', width: 1, height: 1 }],
      })) as any,
    });
    const controller = createScanController(picker);

    const captured = await controller.capture();

    expect(captured?.uri.startsWith('file:')).toBe(true);
  });
});

describe('createScanController — pickFromGallery()', () => {
  it('returns the chosen asset uri', async () => {
    const picker = makePickerStub({
      launchImageLibraryAsync: jest.fn(async () => ({
        canceled: false,
        assets: [{ uri: 'file:///tmp/library-1.jpg', width: 1, height: 1 }],
      })) as any,
    });
    const controller = createScanController(picker);

    expect(await controller.pickFromGallery()).toEqual({ uri: 'file:///tmp/library-1.jpg' });
  });

  it('returns null when the gallery picker is cancelled', async () => {
    const picker = makePickerStub({
      launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })) as any,
    });
    const controller = createScanController(picker);

    expect(await controller.pickFromGallery()).toBeNull();
  });

  it('returns null when the result has no assets', async () => {
    const picker = makePickerStub({
      launchImageLibraryAsync: jest.fn(async () => ({ canceled: false, assets: [] })) as any,
    });
    const controller = createScanController(picker);

    expect(await controller.pickFromGallery()).toBeNull();
  });
});
