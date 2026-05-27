/**
 * Scan controller for the Kitchen Lens capture-and-review slice (T8.1).
 *
 * This module is the only place in the app that talks to the device camera
 * and gallery for the scan flow. Behavior lives behind a tiny interface so
 * the screen can be unit-tested with an injected fake instead of a real
 * native module.
 *
 * Privacy contract (privacy-contract.md, threat-model.md):
 * - Captured/imported images are local-only in this slice. The controller
 *   only returns a temporary file `uri`. It MUST NOT upload, persist, or
 *   send the image anywhere remote. Uploading and AI processing belong to
 *   T8.2 and require explicit consent + entitlement.
 * - Permission rationale copy is shown by the UI; system prompt strings
 *   live in app.json (NSCameraUsageDescription / NSPhotoLibraryUsageDescription).
 *
 * SDK reference: https://docs.expo.dev/versions/v54.0.0/sdk/imagepicker/
 */

import * as ImagePicker from 'expo-image-picker';

export type ScanPermission = 'granted' | 'denied';

export type ScanCapture = { uri: string };

/**
 * Minimal interface used by the scan review screen. Implementations:
 * - `createScanController()` (default, backed by expo-image-picker)
 * - test fakes (see scan-controller.test.ts)
 */
export type ScanController = {
  /** Ask the OS for camera permission. Returns final granted/denied state. */
  requestCameraPermission(): Promise<ScanPermission>;
  /** Ask the OS for photo library permission. Returns final granted/denied state. */
  requestGalleryPermission(): Promise<ScanPermission>;
  /** Launch the system camera UI. Resolves to `null` if the user cancels. */
  capture(): Promise<ScanCapture | null>;
  /** Launch the system gallery picker. Resolves to `null` if the user cancels. */
  pickFromGallery(): Promise<ScanCapture | null>;
};

/**
 * Subset of the expo-image-picker API the controller needs. Extracting it
 * keeps the controller testable without mocking the whole module.
 */
export type ScanImagePicker = {
  requestCameraPermissionsAsync: typeof ImagePicker.requestCameraPermissionsAsync;
  requestMediaLibraryPermissionsAsync: typeof ImagePicker.requestMediaLibraryPermissionsAsync;
  launchCameraAsync: typeof ImagePicker.launchCameraAsync;
  launchImageLibraryAsync: typeof ImagePicker.launchImageLibraryAsync;
};

const captureOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  allowsEditing: false,
  exif: false,
};

const galleryOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.8,
  allowsEditing: false,
  exif: false,
};

export function createScanController(picker: ScanImagePicker = ImagePicker): ScanController {
  return {
    async requestCameraPermission() {
      const result = await picker.requestCameraPermissionsAsync();
      return result.granted ? 'granted' : 'denied';
    },
    async requestGalleryPermission() {
      const result = await picker.requestMediaLibraryPermissionsAsync();
      return result.granted ? 'granted' : 'denied';
    },
    async capture() {
      const result = await picker.launchCameraAsync(captureOptions);
      return toCapture(result);
    },
    async pickFromGallery() {
      const result = await picker.launchImageLibraryAsync(galleryOptions);
      return toCapture(result);
    },
  };
}

function toCapture(result: ImagePicker.ImagePickerResult): ScanCapture | null {
  if (result.canceled) {
    return null;
  }
  const asset = result.assets?.[0];
  if (!asset?.uri) {
    return null;
  }
  return { uri: asset.uri };
}
