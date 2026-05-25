import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

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
