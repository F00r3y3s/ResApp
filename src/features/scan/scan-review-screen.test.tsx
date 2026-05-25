import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ScanController } from './scan-controller';

const mockBackCalls: number[] = [];

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBackCalls.push(1),
  },
}));

import { ScanReviewScreenContent } from './scan-review-screen';

type ControllerOverrides = Partial<ScanController>;

function makeController(overrides: ControllerOverrides = {}): ScanController {
  return {
    async requestCameraPermission() {
      return 'granted';
    },
    async requestGalleryPermission() {
      return 'granted';
    },
    async capture() {
      return { uri: 'file:///tmp/captured.jpg' };
    },
    async pickFromGallery() {
      return { uri: 'file:///tmp/library.jpg' };
    },
    ...overrides,
  };
}

describe('ScanReviewScreenContent — capture & review (T8.1)', () => {
  beforeEach(() => {
    mockBackCalls.length = 0;
  });

  it('shows capture and gallery actions before any image is picked', () => {
    render(<ScanReviewScreenContent controller={makeController()} />);

    expect(screen.getByText('Kitchen Lens')).toBeTruthy();
    expect(screen.getByText(/Take photo/i)).toBeTruthy();
    expect(screen.getByText(/Choose from gallery/i)).toBeTruthy();
    // Privacy reassurance copy must be visible before the camera prompt.
    expect(screen.getByText(/stays on your device/i)).toBeTruthy();
  });

  it('captures an image and renders it on the review screen', async () => {
    const controller = makeController({
      async capture() {
        return { uri: 'file:///tmp/captured.jpg' };
      },
    });

    render(<ScanReviewScreenContent controller={controller} />);

    fireEvent.press(screen.getByText(/Take photo/i));

    await screen.findByA11yHint('Captured image preview');
    const image = screen.getByA11yHint('Captured image preview');
    expect(image.props.source).toEqual({ uri: 'file:///tmp/captured.jpg' });
    expect(screen.getByText('Review')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Rescan')).toBeTruthy();
  });

  it('imports an image from the gallery and renders it', async () => {
    const controller = makeController({
      async pickFromGallery() {
        return { uri: 'file:///tmp/library-import.jpg' };
      },
    });

    render(<ScanReviewScreenContent controller={controller} />);

    fireEvent.press(screen.getByText(/Choose from gallery/i));

    const image = await screen.findByA11yHint('Captured image preview');
    expect(image.props.source).toEqual({ uri: 'file:///tmp/library-import.jpg' });
  });

  it('shows a permission denied message when camera access is blocked', async () => {
    const controller = makeController({
      async requestCameraPermission() {
        return 'denied';
      },
      async capture() {
        throw new Error('capture should not be called when permission denied');
      },
    });

    render(<ScanReviewScreenContent controller={controller} />);

    fireEvent.press(screen.getByText(/Take photo/i));

    await waitFor(() => {
      expect(screen.getByText(/Camera access is off/i)).toBeTruthy();
    });
    // We should not show a captured image preview.
    expect(screen.queryByA11yHint('Captured image preview')).toBeNull();
  });

  it('shows a permission denied message when gallery access is blocked', async () => {
    const controller = makeController({
      async requestGalleryPermission() {
        return 'denied';
      },
      async pickFromGallery() {
        throw new Error('gallery picker should not be called when permission denied');
      },
    });

    render(<ScanReviewScreenContent controller={controller} />);

    fireEvent.press(screen.getByText(/Choose from gallery/i));

    await waitFor(() => {
      expect(screen.getByText(/Photo library access is off/i)).toBeTruthy();
    });
  });

  it('returns to the previous screen when the user cancels review', async () => {
    render(<ScanReviewScreenContent controller={makeController()} />);

    fireEvent.press(screen.getByText(/Take photo/i));
    await screen.findByA11yHint('Captured image preview');

    fireEvent.press(screen.getByText('Cancel'));

    expect(mockBackCalls.length).toBe(1);
  });

  it('clears the preview and returns to capture controls when the user rescans', async () => {
    const captureUris = ['file:///tmp/first.jpg', 'file:///tmp/second.jpg'];
    let captureIndex = 0;

    const controller = makeController({
      async capture() {
        const uri = captureUris[captureIndex];
        captureIndex += 1;
        return { uri };
      },
    });

    render(<ScanReviewScreenContent controller={controller} />);

    fireEvent.press(screen.getByText(/Take photo/i));
    let image = await screen.findByA11yHint('Captured image preview');
    expect(image.props.source).toEqual({ uri: 'file:///tmp/first.jpg' });

    fireEvent.press(screen.getByText('Rescan'));

    // Capture controls return.
    expect(await screen.findByText(/Take photo/i)).toBeTruthy();

    fireEvent.press(screen.getByText(/Take photo/i));
    image = await screen.findByA11yHint('Captured image preview');
    expect(image.props.source).toEqual({ uri: 'file:///tmp/second.jpg' });
  });

  it('handles cancellation from the system camera UI by staying on capture controls', async () => {
    const controller = makeController({
      async capture() {
        return null;
      },
    });

    render(<ScanReviewScreenContent controller={controller} />);

    fireEvent.press(screen.getByText(/Take photo/i));

    await waitFor(() => {
      // Still on the capture step — no preview rendered.
      expect(screen.queryByA11yHint('Captured image preview')).toBeNull();
    });
    expect(screen.getByText(/Take photo/i)).toBeTruthy();
  });
});

describe('ScanReviewScreenContent — AI scan parse (T8.2)', () => {
  beforeEach(() => {
    mockBackCalls.length = 0;
  });

  function makeTestPantryRepo() {
    const items: any[] = [];
    return {
      pantryRepository: {
        async addItem(input: any) {
          const item = {
            localId: `local-${items.length + 1}`,
            name: String(input.name),
            normalizedName: String(input.name).toLocaleLowerCase(),
            quantity: Number(input.quantity),
            unit: String(input.unit),
            location: String(input.location),
            expiresAt: input.expiresAt || null,
            privacy: 'local-only' as const,
            createdAt: '2026-05-25T10:00:00.000Z',
            updatedAt: '2026-05-25T10:00:00.000Z',
          };
          items.push(item);
          return item;
        },
        async updateItem() {
          throw new Error('not used');
        },
        async deleteItem() {
          throw new Error('not used');
        },
        async listItems() {
          return [...items];
        },
      } as any,
      getItems: () => items,
    };
  }

  it('shows "Detect items" button instead of "Looks good" when AI sender is provided', async () => {
    const { pantryRepository } = makeTestPantryRepo();
    const scanParseSender = jest
      .fn()
      .mockResolvedValue({ items: [] }) as any;

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        scanParseSender={scanParseSender}
      />,
    );

    fireEvent.press(screen.getByText(/Take photo/i));

    await waitFor(() => {
      expect(screen.getByText('Detect items')).toBeTruthy();
    });

    expect(screen.queryByText('Looks good')).toBeNull();
  });

  it('calls AI gateway scan-parse and shows confirm screen with detected items', async () => {
    const { pantryRepository } = makeTestPantryRepo();
    const scanParseSender = jest.fn().mockResolvedValue({
      items: [
        {
          name: 'Spinach',
          confidence: 0.92,
          quantity: '1',
          unit: 'bag',
          location: 'Fridge',
          expiresAt: '2026-05-30',
        },
        { name: 'Yogurt', confidence: 0.85 },
      ],
    }) as any;

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        scanParseSender={scanParseSender}
      />,
    );

    fireEvent.press(screen.getByText(/Take photo/i));

    await waitFor(() => {
      expect(screen.getByText('Detect items')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Detect items'));

    await waitFor(() => {
      expect(screen.getByText('Review detected items')).toBeTruthy();
    });

    expect(screen.getByDisplayValue('Spinach')).toBeTruthy();
    expect(screen.getByDisplayValue('Yogurt')).toBeTruthy();
    expect(scanParseSender).toHaveBeenCalledWith('file:///tmp/captured.jpg');
  });

  it('saves confirmed items to pantry repository and dismisses screen', async () => {
    const { pantryRepository, getItems } = makeTestPantryRepo();
    const scanParseSender = jest.fn().mockResolvedValue({
      items: [{ name: 'Spinach', confidence: 0.92, quantity: '1', unit: 'bag', location: 'Fridge' }],
    }) as any;

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        scanParseSender={scanParseSender}
      />,
    );

    fireEvent.press(screen.getByText(/Take photo/i));

    await waitFor(() => {
      expect(screen.getByText('Detect items')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Detect items'));

    await waitFor(() => {
      expect(screen.getByText('Review detected items')).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(getItems()).toHaveLength(1);
    });

    expect(getItems()[0].name).toBe('Spinach');
    // Should navigate back after saving
    expect(mockBackCalls.length).toBeGreaterThan(0);
  });

  it('shows error when AI gateway fails and lets user rescan', async () => {
    const { pantryRepository } = makeTestPantryRepo();
    const scanParseSender = jest.fn().mockRejectedValue(new Error('Gateway timeout')) as any;

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        scanParseSender={scanParseSender}
      />,
    );

    fireEvent.press(screen.getByText(/Take photo/i));

    await waitFor(() => {
      expect(screen.getByText('Detect items')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Detect items'));

    await waitFor(() => {
      expect(screen.getByText('Gateway timeout')).toBeTruthy();
    });

    // User is back on review screen — can rescan
    expect(screen.getByText('Detect items')).toBeTruthy();
  });
});
