import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';


import type { GroceryItem, GroceryRepository } from '@/features/grocery/grocery-repository';
import type { PantryItem, PantryItemInput, PantryRepository } from '@/features/pantry/pantry-repository';

import type { ScanParseResponse } from './detected-item';
import type { ScanController } from './scan-controller';

const mockBackCalls: number[] = [];

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBackCalls.push(1),
  },
}));

import { ScanReviewScreenContent, type ScanParseSender } from './scan-review-screen';

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

// ---------------------------------------------------------------------------
// T8.3 — receipt mode flow
//
// These tests are intentionally failing until Task 10 plumbs `scanMode` and
// `groceryRepository` through `ScanReviewScreenContent` and forwards them to
// `ScanConfirmScreen`. They cover:
//   1. Receipt mode defaults each detected item to grocery (visible via the
//      destination toggle's `accessibilityState: { selected: true }` on the
//      grocery segment).
//   2. The destination toggle is rendered per item — observable via
//      `getAllByRole('radiogroup')` count matching the item count.
//   3. The grocery repository is forwarded: confirming with all-grocery
//      defaults calls only `groceryRepository.addMultipleToList` (and not
//      `pantryRepository.addItem`).
//   4. Toggling one item to pantry partitions saves correctly between
//      `pantryRepository.addItem` and `groceryRepository.addMultipleToList`.
//   5. Pantry-photo regression: with no `scanMode` (or `scanMode='pantry-photo'`)
//      no destination toggle renders and no grocery repo is needed.
// ---------------------------------------------------------------------------

type GroceryRepoCalls = {
  addMultipleToList: jest.Mock;
};

type PantryRepoCalls = {
  addItem: jest.Mock;
};

function createTestPantryRepository(): {
  pantryRepository: PantryRepository;
  calls: PantryRepoCalls;
  getItems: () => PantryItem[];
} {
  const items: PantryItem[] = [];
  const addItem = jest.fn(async (input: PantryItemInput) => {
    const item: PantryItem = {
      localId: `local-pantry-${items.length + 1}`,
      name: String(input.name),
      normalizedName: String(input.name).toLocaleLowerCase(),
      quantity: Number(input.quantity),
      unit: String(input.unit),
      location: String(input.location),
      expiresAt: input.expiresAt ? String(input.expiresAt) : null,
      privacy: 'local-only',
      createdAt: '2026-05-25T10:00:00.000Z',
      updatedAt: '2026-05-25T10:00:00.000Z',
    };
    items.push(item);
    return item;
  });
  return {
    pantryRepository: {
      addItem,
      async updateItem() {
        throw new Error('not used');
      },
      async deleteItem() {
        throw new Error('not used');
      },
      async listItems() {
        return [...items];
      },
    },
    calls: { addItem: addItem as unknown as jest.Mock },
    getItems: () => [...items],
  };
}

function createTestGroceryRepository(): {
  groceryRepository: GroceryRepository;
  calls: GroceryRepoCalls;
  getItems: () => GroceryItem[];
} {
  const items: GroceryItem[] = [];
  const addMultipleToList = jest.fn(async (drafts: readonly { name: string; quantity: string; unit: string }[]) => {
    const added: GroceryItem[] = drafts.map((draft, index) => {
      const item: GroceryItem = {
        localId: `local-grocery-${items.length + index + 1}`,
        name: draft.name,
        normalizedName: draft.name.trim().toLocaleLowerCase(),
        quantity: draft.quantity,
        unit: draft.unit,
        recipeId: null,
        recipeTitle: null,
        isChecked: false,
        section: null,
        assignedTo: null,
        privacy: 'local-only',
        createdAt: '2026-05-25T10:00:00.000Z',
        updatedAt: '2026-05-25T10:00:00.000Z',
      };
      items.push(item);
      return item;
    });
    return added;
  });
  return {
    groceryRepository: {
      async listItems() {
        return [...items];
      },
      async addRecipeToList() {
        throw new Error('not used');
      },
      addMultipleToList,
      async setChecked() {
        throw new Error('not used');
      },
      async removeItem() {
        throw new Error('not used');
      },
      async clearChecked() {
        throw new Error('not used');
      },
    },
    calls: { addMultipleToList: addMultipleToList as unknown as jest.Mock },
    getItems: () => [...items],
  };
}

function buildReceiptScanResponse(): ScanParseResponse {
  return {
    items: [
      { name: 'Bananas', confidence: 0.95, quantity: '6', unit: 'whole' },
      { name: 'Bread', confidence: 0.88, quantity: '1', unit: 'loaf' },
      { name: 'Milk', confidence: 0.91, quantity: '1', unit: 'litre' },
    ],
  };
}

async function walkToConfirmScreen(): Promise<void> {
  fireEvent.press(screen.getByText(/Take photo/i));
  await waitFor(() => {
    expect(screen.getByText('Detect items')).toBeTruthy();
  });
  fireEvent.press(screen.getByText('Detect items'));
  await waitFor(() => {
    expect(screen.getByText('Review detected items')).toBeTruthy();
  });
}

describe('ScanReviewScreenContent — receipt mode flow (T8.3)', () => {
  beforeEach(() => {
    mockBackCalls.length = 0;
  });

  it('defaults each detected item to grocery when scanMode="receipt"', async () => {
    const { pantryRepository } = createTestPantryRepository();
    const { groceryRepository } = createTestGroceryRepository();
    const scanParseSender: ScanParseSender = jest
      .fn(async () => buildReceiptScanResponse()) as unknown as ScanParseSender;

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanParseSender={scanParseSender}
        scanMode="receipt"
      />,
    );

    await walkToConfirmScreen();

    // Each row should expose a destination toggle (radiogroup) — one per item.
    const toggles = screen.getAllByRole('radiogroup');
    expect(toggles).toHaveLength(3);

    // The grocery segment of every row should be selected by default.
    const grocerySegments = screen.getAllByRole('radio', { name: /grocery/i });
    expect(grocerySegments).toHaveLength(3);
    for (const segment of grocerySegments) {
      expect(segment.props.accessibilityState?.selected).toBe(true);
    }

    // None of the pantry segments should be selected when defaulting to grocery.
    const pantrySegments = screen.getAllByRole('radio', { name: /pantry/i });
    expect(pantrySegments).toHaveLength(3);
    for (const segment of pantrySegments) {
      expect(segment.props.accessibilityState?.selected).toBe(false);
    }
  });

  it('forwards groceryRepository so an all-grocery confirm only writes to grocery', async () => {
    const { pantryRepository, calls: pantryCalls } = createTestPantryRepository();
    const { groceryRepository, calls: groceryCalls, getItems: getGroceryItems } =
      createTestGroceryRepository();
    const scanParseSender: ScanParseSender = jest
      .fn(async () => buildReceiptScanResponse()) as unknown as ScanParseSender;

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanParseSender={scanParseSender}
        scanMode="receipt"
      />,
    );

    await walkToConfirmScreen();

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(groceryCalls.addMultipleToList).toHaveBeenCalledTimes(1);
    });

    // No pantry writes when every item is routed to grocery.
    expect(pantryCalls.addItem).not.toHaveBeenCalled();

    const groceryItems = getGroceryItems();
    expect(groceryItems.map((i) => i.name).sort()).toEqual(
      ['Bananas', 'Bread', 'Milk'].sort(),
    );

    // Should navigate back after the save completes.
    expect(mockBackCalls.length).toBeGreaterThan(0);
  });

  it('partitions saves between pantry and grocery when one item is toggled to pantry', async () => {
    const { pantryRepository, calls: pantryCalls, getItems: getPantryItems } =
      createTestPantryRepository();
    const { groceryRepository, calls: groceryCalls, getItems: getGroceryItems } =
      createTestGroceryRepository();
    const scanParseSender: ScanParseSender = jest
      .fn(async () => buildReceiptScanResponse()) as unknown as ScanParseSender;

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanParseSender={scanParseSender}
        scanMode="receipt"
      />,
    );

    await walkToConfirmScreen();

    // Toggle the "Bread" row to pantry.
    fireEvent.press(screen.getByLabelText(/Send Bread to pantry/i));

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(pantryCalls.addItem).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(groceryCalls.addMultipleToList).toHaveBeenCalledTimes(1);
    });

    const pantryItems = getPantryItems();
    expect(pantryItems.map((i) => i.name)).toEqual(['Bread']);

    const groceryItems = getGroceryItems();
    expect(groceryItems.map((i) => i.name).sort()).toEqual(['Bananas', 'Milk'].sort());
  });

  it('does not render the destination toggle when scanMode is omitted (pantry-photo regression)', async () => {
    const { pantryRepository } = createTestPantryRepository();
    const scanParseSender: ScanParseSender = jest.fn(async () => ({
      items: [
        { name: 'Spinach', confidence: 0.92, quantity: '1', unit: 'bag', location: 'Fridge' },
      ],
    })) as unknown as ScanParseSender;

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        scanParseSender={scanParseSender}
      />,
    );

    await walkToConfirmScreen();

    // No destination toggles at all in pantry-photo mode.
    expect(screen.queryAllByRole('radiogroup')).toHaveLength(0);
    expect(screen.queryByLabelText(/Send Spinach to grocery list/i)).toBeNull();
    expect(screen.queryByLabelText(/Send Spinach to pantry/i)).toBeNull();
  });

  it('does not render the destination toggle when scanMode="pantry-photo" (regression)', async () => {
    const { pantryRepository } = createTestPantryRepository();
    const scanParseSender: ScanParseSender = jest.fn(async () => ({
      items: [{ name: 'Yogurt', confidence: 0.85 }],
    })) as unknown as ScanParseSender;

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        scanParseSender={scanParseSender}
        scanMode="pantry-photo"
      />,
    );

    await walkToConfirmScreen();

    expect(screen.queryAllByRole('radiogroup')).toHaveLength(0);
  });

  it('falls back to T8.1 dismiss when scanParseSender is null in receipt mode', async () => {
    // Regression gate for Requirement 1.3: gateway-unconfigured (guest user, no
    // Supabase env) should still allow capture-and-review and gracefully dismiss
    // without saving — even when the user opted into receipt mode.
    const { pantryRepository, calls: pantryCalls } = createTestPantryRepository();
    const { groceryRepository, calls: groceryCalls } = createTestGroceryRepository();

    render(
      <ScanReviewScreenContent
        controller={makeController()}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanParseSender={null}
        scanMode="receipt"
      />,
    );

    // Capture → review.
    fireEvent.press(screen.getByText(/Take photo/i));
    await waitFor(() => {
      expect(screen.getByText('Detect items')).toBeTruthy();
    });

    // Tap "Detect items" — without a gateway sender this should dismiss
    // without ever opening the confirm screen.
    fireEvent.press(screen.getByText('Detect items'));

    await waitFor(() => {
      expect(mockBackCalls).toEqual([1]);
    });

    // Confirm screen should never have rendered.
    expect(screen.queryByText('Review detected items')).toBeNull();

    // Neither repository should have received writes.
    expect(pantryCalls.addItem).not.toHaveBeenCalled();
    expect(groceryCalls.addMultipleToList).not.toHaveBeenCalled();
  });
});
