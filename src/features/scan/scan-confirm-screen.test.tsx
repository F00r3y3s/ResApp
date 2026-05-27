import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { GroceryItemDraft } from '@/features/grocery/grocery-model';
import type { GroceryRepository } from '@/features/grocery/grocery-repository';
import type { PantryItem, PantryItemInput, PantryRepository } from '@/features/pantry/pantry-repository';

import type { DetectedItem } from './detected-item';
import { ScanConfirmScreen } from './scan-confirm-screen';

function createTestPantryRepository(failOn?: string): PantryRepository {
  const items: PantryItem[] = [];
  return {
    async addItem(input: PantryItemInput) {
      if (failOn && String(input.name).toLocaleLowerCase().includes(failOn)) {
        throw new Error(`Simulated failure for ${input.name}`);
      }
      const item: PantryItem = {
        localId: `local-${items.length + 1}`,
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
  };
}

function buildItem(overrides: Partial<DetectedItem> = {}): DetectedItem {
  return {
    id: 'detected-1',
    name: 'Spinach',
    confidence: 0.92,
    quantity: '1',
    unit: 'bag',
    location: 'Fridge',
    expiresAt: '2026-05-30',
    isIncluded: true,
    ...overrides,
  };
}

const onConfirmedMock = jest.fn();
const onCancelMock = jest.fn();

beforeEach(() => {
  onConfirmedMock.mockReset();
  onCancelMock.mockReset();
});

describe('ScanConfirmScreen', () => {
  it('renders detected items with editable fields and confidence badges', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Spinach', confidence: 0.92 }),
          buildItem({ id: 'b', name: 'Yogurt', confidence: 0.85 }),
        ]}
        pantryRepository={createTestPantryRepository()}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    expect(screen.getByText('2 items detected · 2 to add')).toBeTruthy();
    expect(screen.getByDisplayValue('Spinach')).toBeTruthy();
    expect(screen.getByDisplayValue('Yogurt')).toBeTruthy();
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();
  });

  it('shows low-confidence warning for items below threshold', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Clear Item', confidence: 0.95 }),
          buildItem({ id: 'b', name: 'Blurry Item', confidence: 0.4 }),
        ]}
        pantryRepository={createTestPantryRepository()}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    expect(screen.getByText(/1 item needs a closer look/)).toBeTruthy();
  });

  it('does not show warning when all items are high confidence', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', confidence: 0.92 }),
          buildItem({ id: 'b', confidence: 0.85 }),
        ]}
        pantryRepository={createTestPantryRepository()}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    expect(screen.queryByText(/closer look/)).toBeNull();
  });

  it('toggles item inclusion when checkbox is pressed', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[buildItem({ id: 'a', name: 'Spinach' })]}
        pantryRepository={createTestPantryRepository()}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    expect(screen.getByText('1 item detected · 1 to add')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Exclude Spinach'));

    expect(screen.getByText('1 item detected · 0 to add')).toBeTruthy();
  });

  it('saves all included items to pantry on confirm', async () => {
    const repo = createTestPantryRepository();

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Spinach' }),
          buildItem({ id: 'b', name: 'Yogurt' }),
        ]}
        pantryRepository={repo}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(onConfirmedMock).toHaveBeenCalledWith(2);
    });

    const saved = await repo.listItems();
    expect(saved).toHaveLength(2);
    expect(saved.some((i) => i.name === 'Spinach')).toBe(true);
    expect(saved.some((i) => i.name === 'Yogurt')).toBe(true);
  });

  it('only saves items marked as included', async () => {
    const repo = createTestPantryRepository();

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Spinach' }),
          buildItem({ id: 'b', name: 'Yogurt', isIncluded: false }),
        ]}
        pantryRepository={repo}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(onConfirmedMock).toHaveBeenCalledWith(1);
    });

    const saved = await repo.listItems();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('Spinach');
  });

  it('persists user edits to name, quantity, and expiry', async () => {
    const repo = createTestPantryRepository();

    render(
      <ScanConfirmScreen
        detectedItems={[buildItem({ id: 'a', name: 'Spinach', quantity: '1' })]}
        pantryRepository={repo}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Quantity for Spinach'), '2');
    fireEvent.changeText(screen.getByLabelText('Name for Spinach'), 'Baby spinach');
    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(onConfirmedMock).toHaveBeenCalledWith(1);
    });

    const saved = await repo.listItems();
    expect(saved[0].name).toBe('Baby spinach');
    expect(saved[0].quantity).toBe(2);
  });

  it('shows error when save fails for all items', async () => {
    const repo = createTestPantryRepository('spinach');

    render(
      <ScanConfirmScreen
        detectedItems={[buildItem({ id: 'a', name: 'Spinach' })]}
        pantryRepository={repo}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(screen.getByText(/Couldn't save: Spinach/)).toBeTruthy();
    });

    expect(onConfirmedMock).not.toHaveBeenCalled();
  });

  it('shows partial save message when some items fail', async () => {
    const repo = createTestPantryRepository('yogurt');

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Spinach' }),
          buildItem({ id: 'b', name: 'Yogurt' }),
        ]}
        pantryRepository={repo}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(screen.getByText(/Saved 1 of 2/)).toBeTruthy();
    });
  });

  it('shows empty state when no items detected', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[]}
        pantryRepository={createTestPantryRepository()}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    expect(screen.getByText('No items detected')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
  });

  it('disables confirm button when no items are included', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[buildItem({ id: 'a', isIncluded: false })]}
        pantryRepository={createTestPantryRepository()}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    const confirmButton = screen.getByLabelText('Confirm all and save');
    expect(confirmButton.props.accessibilityState.disabled).toBe(true);
  });

  it('calls onCancel when back button is pressed', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[buildItem()]}
        pantryRepository={createTestPantryRepository()}
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Back'));

    expect(onCancelMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Receipt mode (T8.3) — failing tests; toggle implementation lives in task 4.
// ---------------------------------------------------------------------------

function createTestGroceryRepository(): GroceryRepository {
  const stub = {
    listItems: jest.fn<GroceryRepository['listItems']>().mockResolvedValue([]),
    addRecipeToList: jest.fn<GroceryRepository['addRecipeToList']>(),
    addMultipleToList: jest.fn<GroceryRepository['addMultipleToList']>().mockResolvedValue([]),
    setChecked: jest.fn<GroceryRepository['setChecked']>(),
    removeItem: jest.fn<GroceryRepository['removeItem']>(),
    clearChecked: jest.fn<GroceryRepository['clearChecked']>(),
  } satisfies Partial<GroceryRepository>;
  return stub as unknown as GroceryRepository;
}

describe('ScanConfirmScreen receipt mode', () => {
  it('renders destination toggle per row when scanMode is receipt', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Spinach', destination: 'grocery' }),
          buildItem({ id: 'b', name: 'Yogurt', destination: 'grocery' }),
        ]}
        pantryRepository={createTestPantryRepository()}
        groceryRepository={createTestGroceryRepository()}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    // Per design: each row gets a two-segment radiogroup with these labels.
    const spinachToPantry = screen.getByLabelText('Send Spinach to pantry');
    const spinachToGrocery = screen.getByLabelText('Send Spinach to grocery list');
    const yogurtToPantry = screen.getByLabelText('Send Yogurt to pantry');
    const yogurtToGrocery = screen.getByLabelText('Send Yogurt to grocery list');

    expect(spinachToPantry.props.accessibilityRole).toBe('radio');
    expect(spinachToGrocery.props.accessibilityRole).toBe('radio');
    expect(yogurtToPantry.props.accessibilityRole).toBe('radio');
    expect(yogurtToGrocery.props.accessibilityRole).toBe('radio');

    // Default destination 'grocery' → grocery segment is selected.
    expect(spinachToGrocery.props.accessibilityState.selected).toBe(true);
    expect(spinachToPantry.props.accessibilityState.selected).toBe(false);
  });

  it('does not render destination toggle when scanMode is pantry-photo', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[buildItem({ id: 'a', name: 'Spinach', destination: 'pantry' })]}
        pantryRepository={createTestPantryRepository()}
        scanMode="pantry-photo"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    expect(screen.queryByLabelText('Send Spinach to pantry')).toBeNull();
    expect(screen.queryByLabelText('Send Spinach to grocery list')).toBeNull();
  });

  it('toggling destination updates item.destination without losing other edits', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({
            id: 'a',
            name: 'Spinach',
            quantity: '1',
            unit: 'bag',
            destination: 'grocery',
          }),
        ]}
        pantryRepository={createTestPantryRepository()}
        groceryRepository={createTestGroceryRepository()}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    // 1. Edit the name and quantity first (destination still 'grocery').
    fireEvent.changeText(screen.getByLabelText('Name for Spinach'), 'Baby spinach');
    fireEvent.changeText(screen.getByLabelText('Quantity for Baby spinach'), '2');

    // 2. Toggle destination to pantry.
    fireEvent.press(screen.getByLabelText('Send Baby spinach to pantry'));

    // 3. Name + quantity edits must remain.
    expect(screen.getByDisplayValue('Baby spinach')).toBeTruthy();
    expect(screen.getByDisplayValue('2')).toBeTruthy();

    // 4. Toggle reflects new selection.
    const pantrySegment = screen.getByLabelText('Send Baby spinach to pantry');
    const grocerySegment = screen.getByLabelText('Send Baby spinach to grocery list');
    expect(pantrySegment.props.accessibilityState.selected).toBe(true);
    expect(grocerySegment.props.accessibilityState.selected).toBe(false);
  });

  it('hides expiry and location fields when destination is grocery', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Spinach', destination: 'pantry' }),
        ]}
        pantryRepository={createTestPantryRepository()}
        groceryRepository={createTestGroceryRepository()}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    // Pantry-bound: expiry + location fields are visible.
    expect(screen.getByLabelText('Expiry for Spinach')).toBeTruthy();
    expect(screen.getByLabelText('Location for Spinach')).toBeTruthy();

    // Toggle to grocery.
    fireEvent.press(screen.getByLabelText('Send Spinach to grocery list'));

    // Now expiry + location fields must be hidden (or marked disabled).
    const expiry = screen.queryByLabelText('Expiry for Spinach');
    const location = screen.queryByLabelText('Location for Spinach');

    const expiryHiddenOrDisabled =
      expiry === null || expiry.props.accessibilityState?.disabled === true;
    const locationHiddenOrDisabled =
      location === null || location.props.accessibilityState?.disabled === true;

    expect(expiryHiddenOrDisabled).toBe(true);
    expect(locationHiddenOrDisabled).toBe(true);
  });

  it('shows expiry and location fields when destination is pantry in receipt mode', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Spinach', destination: 'grocery' }),
        ]}
        pantryRepository={createTestPantryRepository()}
        groceryRepository={createTestGroceryRepository()}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    // Default 'grocery' → fields hidden.
    expect(screen.queryByLabelText('Expiry for Spinach')).toBeNull();
    expect(screen.queryByLabelText('Location for Spinach')).toBeNull();

    // Toggle to pantry → fields appear.
    fireEvent.press(screen.getByLabelText('Send Spinach to pantry'));

    expect(screen.getByLabelText('Expiry for Spinach')).toBeTruthy();
    expect(screen.getByLabelText('Location for Spinach')).toBeTruthy();
  });
});


// ---------------------------------------------------------------------------
// Receipt mode (T8.3) — mixed pantry+grocery save (Task 5).
//
// These tests are intentionally failing until Task 6 implements the
// destination-aware save in `handleConfirmAll`. Today the screen routes every
// included item to `pantryRepository.addItem` regardless of `destination`, so
// the grocery-side assertions below cannot pass without the new code path.
// ---------------------------------------------------------------------------


describe('ScanConfirmScreen receipt mode — mixed save', () => {
  it('splits saves between pantry and grocery repositories', async () => {
    const pantryRepository = createTestPantryRepository();
    const groceryRepository = createTestGroceryRepository();
    const addItemSpy = jest.spyOn(pantryRepository, 'addItem');

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Apples', destination: 'pantry' }),
          buildItem({ id: 'b', name: 'Bread', destination: 'grocery' }),
          buildItem({ id: 'c', name: 'Cheese', destination: 'grocery' }),
        ]}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(onConfirmedMock).toHaveBeenCalledWith(3);
    });

    // Pantry repo received only the pantry-bound row.
    expect(addItemSpy).toHaveBeenCalledTimes(1);
    expect(addItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Apples' }),
    );

    // Grocery repo received both grocery-bound rows in a single batch call.
    const addMultipleMock = groceryRepository.addMultipleToList as jest.Mock;
    expect(addMultipleMock).toHaveBeenCalledTimes(1);
    const drafts = addMultipleMock.mock.calls[0][0] as GroceryItemDraft[];
    expect(drafts.map((d) => d.name).sort()).toEqual(['Bread', 'Cheese']);
  });

  it('Confirm button is disabled when no items are included', () => {
    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Apples', isIncluded: false, destination: 'pantry' }),
          buildItem({ id: 'b', name: 'Bread', isIncluded: false, destination: 'grocery' }),
        ]}
        pantryRepository={createTestPantryRepository()}
        groceryRepository={createTestGroceryRepository()}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    const confirmButton = screen.getByLabelText('Confirm all and save');
    expect(confirmButton.props.accessibilityState.disabled).toBe(true);
  });

  it('onConfirmed reports total of pantry and grocery saves', async () => {
    const pantryRepository = createTestPantryRepository();
    const groceryRepository = createTestGroceryRepository();

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Apples', destination: 'pantry' }),
          buildItem({ id: 'b', name: 'Bread', destination: 'grocery' }),
          buildItem({ id: 'c', name: 'Cheese', destination: 'grocery' }),
          buildItem({ id: 'd', name: 'Yams', destination: 'pantry' }),
        ]}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(onConfirmedMock).toHaveBeenCalledWith(4);
    });
  });

  it('partial pantry failure still shows partial-save banner naming failures', async () => {
    const pantryRepository = createTestPantryRepository('yogurt');
    const groceryRepository = createTestGroceryRepository();

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Yogurt', destination: 'pantry' }),
          buildItem({ id: 'b', name: 'Bread', destination: 'grocery' }),
          buildItem({ id: 'c', name: 'Milk', destination: 'pantry' }),
        ]}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    // Bread + Milk saved successfully (one via grocery, one via pantry); Yogurt failed.
    await waitFor(() => {
      expect(screen.getByText(/Saved 2 of 3/)).toBeTruthy();
    });

    // Grocery repo received only the grocery-bound row.
    const addMultipleMock = groceryRepository.addMultipleToList as jest.Mock;
    expect(addMultipleMock).toHaveBeenCalledTimes(1);
    const drafts = addMultipleMock.mock.calls[0][0] as GroceryItemDraft[];
    expect(drafts.map((d) => d.name)).toEqual(['Bread']);

    // Per the existing T8.2 pattern, onConfirmed is not called on partial failures.
    expect(onConfirmedMock).not.toHaveBeenCalled();
  });

  it('all-grocery confirm bypasses pantry repository entirely', async () => {
    const pantryRepository = createTestPantryRepository();
    const groceryRepository = createTestGroceryRepository();
    const addItemSpy = jest.spyOn(pantryRepository, 'addItem');

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Apples', destination: 'grocery' }),
          buildItem({ id: 'b', name: 'Bread', destination: 'grocery' }),
          buildItem({ id: 'c', name: 'Cheese', destination: 'grocery' }),
        ]}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(groceryRepository.addMultipleToList).toHaveBeenCalledTimes(1);
    });

    expect(addItemSpy).not.toHaveBeenCalled();

    const addMultipleMock = groceryRepository.addMultipleToList as jest.Mock;
    const drafts = addMultipleMock.mock.calls[0][0] as GroceryItemDraft[];
    expect(drafts.map((d) => d.name).sort()).toEqual(['Apples', 'Bread', 'Cheese']);
  });
});


// ---------------------------------------------------------------------------
// Receipt mode (T8.3) — duplicate prompt and merge resolution (Task 7).
//
// These tests are intentionally failing until Task 8 implements the duplicate
// prompt UI and the `prompting-duplicates` save state. Today,
// `handleConfirmAll` saves immediately without consulting
// `pantryRepository.listItems()`, so:
//   - Tests (a)–(d) fail because no prompt is ever rendered (label/text
//     lookups time out).
//   - Test (e) is a regression contract that locks in the
//     "failed listItems → degrade to no duplicates" behavior. It happens to
//     pass today by coincidence (the screen never calls listItems anyway),
//     and must keep passing after Task 8 wires the rejection-tolerant path.
//
// Expected accessibility labels (Task 8 must match these):
//   Prompt title text:         "Already in your pantry"
//   Per-row merge button:      `Merge ${item.name}`
//   Per-row add-anyway button: `Add ${item.name} anyway`
//   Continue button:           accessibilityLabel="Continue with selections"
//   Back button:               accessibilityLabel="Back to review"
// ---------------------------------------------------------------------------

describe('ScanConfirmScreen receipt mode — duplicate prompt', () => {
  function existingPantryItem(overrides: Partial<PantryItem> & { name: string }): PantryItem {
    return {
      localId: `p-${overrides.name.toLowerCase()}`,
      normalizedName: overrides.name.trim().toLocaleLowerCase().replace(/\s+/g, ' '),
      quantity: 1,
      unit: 'unit',
      location: 'Fridge',
      expiresAt: null,
      privacy: 'local-only',
      createdAt: '2026-05-25T10:00:00.000Z',
      updatedAt: '2026-05-25T10:00:00.000Z',
      ...overrides,
    };
  }

  it('shows duplicate prompt when a pantry-bound item matches existing pantry', async () => {
    const pantryRepository = createTestPantryRepository();
    const groceryRepository = createTestGroceryRepository();
    jest
      .spyOn(pantryRepository, 'listItems')
      .mockResolvedValue([existingPantryItem({ name: 'Milk' })]);
    const addItemSpy = jest.spyOn(pantryRepository, 'addItem');

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Milk', destination: 'pantry' }),
          buildItem({ id: 'b', name: 'Bread', destination: 'grocery' }),
        ]}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    // Prompt becomes visible asynchronously after listItems() resolves.
    await screen.findByText('Already in your pantry');

    // Per-row resolution affordances are present for the duplicate.
    expect(screen.getByLabelText('Merge Milk')).toBeTruthy();
    expect(screen.getByLabelText('Add Milk anyway')).toBeTruthy();

    // No saves have happened yet — the prompt blocks until the user resolves.
    expect(addItemSpy).not.toHaveBeenCalled();
    expect(groceryRepository.addMultipleToList).not.toHaveBeenCalled();
    expect(onConfirmedMock).not.toHaveBeenCalled();
  });

  it('lists each duplicate with detected and existing names', async () => {
    const pantryRepository = createTestPantryRepository();
    const groceryRepository = createTestGroceryRepository();
    jest.spyOn(pantryRepository, 'listItems').mockResolvedValue([
      existingPantryItem({ name: 'Milk' }),
      existingPantryItem({ name: 'Yogurt' }),
    ]);

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Milk', destination: 'pantry' }),
          buildItem({ id: 'b', name: 'Yogurt', destination: 'pantry' }),
          buildItem({ id: 'c', name: 'Bread', destination: 'grocery' }),
        ]}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));
    await screen.findByText('Already in your pantry');

    // Both duplicate names are visible somewhere in the prompt. Exact
    // rendering (single row vs. two rows, name placement, etc.) is up to
    // Task 8 — these assertions stay loose on purpose.
    expect(screen.getByText('Milk')).toBeTruthy();
    expect(screen.getByText('Yogurt')).toBeTruthy();

    // Both per-row affordances exist, one per duplicate.
    expect(screen.getByLabelText('Merge Milk')).toBeTruthy();
    expect(screen.getByLabelText('Merge Yogurt')).toBeTruthy();
  });

  it('merging skips pantry adds; add-anyway includes them', async () => {
    const pantryRepository = createTestPantryRepository();
    const groceryRepository = createTestGroceryRepository();
    jest.spyOn(pantryRepository, 'listItems').mockResolvedValue([
      existingPantryItem({ name: 'Milk' }),
      existingPantryItem({ name: 'Yogurt' }),
    ]);
    const addItemSpy = jest.spyOn(pantryRepository, 'addItem');

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Milk', destination: 'pantry' }),
          buildItem({ id: 'b', name: 'Yogurt', destination: 'pantry' }),
          buildItem({ id: 'c', name: 'Bread', destination: 'pantry' }),
        ]}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));
    await screen.findByText('Already in your pantry');

    // Resolve: Milk → merge (skip), Yogurt → add anyway. Bread is new,
    // no resolution needed.
    fireEvent.press(screen.getByLabelText('Merge Milk'));
    fireEvent.press(screen.getByLabelText('Add Yogurt anyway'));
    fireEvent.press(screen.getByLabelText('Continue with selections'));

    await waitFor(() => {
      expect(addItemSpy).toHaveBeenCalledTimes(2);
    });

    const savedNames = addItemSpy.mock.calls.map((call) => String(call[0].name));
    expect(savedNames).toEqual(expect.arrayContaining(['Yogurt', 'Bread']));
    expect(savedNames).not.toContain('Milk');
  });

  it('back button on prompt returns to confirm screen without saving', async () => {
    const pantryRepository = createTestPantryRepository();
    const groceryRepository = createTestGroceryRepository();
    jest
      .spyOn(pantryRepository, 'listItems')
      .mockResolvedValue([existingPantryItem({ name: 'Milk' })]);
    const addItemSpy = jest.spyOn(pantryRepository, 'addItem');

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Milk', destination: 'pantry' }),
        ]}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));
    await screen.findByText('Already in your pantry');

    fireEvent.press(screen.getByLabelText('Back to review'));

    // Prompt is dismissed and the user is back on the confirm screen.
    await waitFor(() => {
      expect(screen.queryByText('Already in your pantry')).toBeNull();
    });
    expect(screen.getByLabelText('Confirm all and save')).toBeTruthy();

    // Nothing was saved.
    expect(addItemSpy).not.toHaveBeenCalled();
    expect(groceryRepository.addMultipleToList).not.toHaveBeenCalled();
    expect(onConfirmedMock).not.toHaveBeenCalled();
  });

  it('rejected pantry listItems does not block save', async () => {
    const pantryRepository = createTestPantryRepository();
    const groceryRepository = createTestGroceryRepository();
    jest
      .spyOn(pantryRepository, 'listItems')
      .mockRejectedValue(new Error('SQLite error'));
    const addItemSpy = jest.spyOn(pantryRepository, 'addItem');

    // Suppress the warn that the production code is expected to emit on
    // the degraded path so the test output stays clean.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <ScanConfirmScreen
        detectedItems={[
          buildItem({ id: 'a', name: 'Milk', destination: 'pantry' }),
          buildItem({ id: 'b', name: 'Bread', destination: 'grocery' }),
        ]}
        pantryRepository={pantryRepository}
        groceryRepository={groceryRepository}
        scanMode="receipt"
        onConfirmed={onConfirmedMock}
        onCancel={onCancelMock}
      />,
    );

    fireEvent.press(screen.getByLabelText('Confirm all and save'));

    await waitFor(() => {
      expect(onConfirmedMock).toHaveBeenCalledWith(2);
    });

    // No prompt was rendered — the rejected listItems is treated as
    // "no duplicates" and the save proceeds straight through.
    expect(screen.queryByText('Already in your pantry')).toBeNull();

    // Pantry-bound Milk went via addItem; grocery-bound Bread went via the
    // batch grocery call.
    expect(addItemSpy).toHaveBeenCalledTimes(1);
    expect(addItemSpy).toHaveBeenCalledWith(expect.objectContaining({ name: 'Milk' }));
    expect(groceryRepository.addMultipleToList).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
