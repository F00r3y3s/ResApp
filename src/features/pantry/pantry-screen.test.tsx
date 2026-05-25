import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { PantryItem, PantryRepository } from './pantry-repository';
import { PantryScreenContent } from './pantry-screen';

function createTestRepository(): PantryRepository {
  let items: PantryItem[] = [];

  return {
    async addItem(input) {
      const item: PantryItem = {
        localId: `local-${items.length + 1}`,
        name: String(input.name).trim(),
        normalizedName: String(input.name).trim().toLocaleLowerCase(),
        quantity: Number(input.quantity),
        unit: String(input.unit).trim(),
        location: String(input.location).trim(),
        expiresAt: input.expiresAt ? String(input.expiresAt) : null,
        privacy: 'local-only',
        createdAt: '2026-05-24T08:00:00.000Z',
        updatedAt: '2026-05-24T08:00:00.000Z',
      };

      items = [...items, item];
      return item;
    },
    async updateItem(localId, input) {
      items = items.map((item) =>
        item.localId === localId
          ? {
              ...item,
              name: String(input.name).trim(),
              normalizedName: String(input.name).trim().toLocaleLowerCase(),
              quantity: Number(input.quantity),
              unit: String(input.unit).trim(),
              location: String(input.location).trim(),
              expiresAt: input.expiresAt ? String(input.expiresAt) : null,
              updatedAt: '2026-05-24T09:00:00.000Z',
            }
          : item,
      );
      return items.find((item) => item.localId === localId)!;
    },
    async deleteItem(localId) {
      items = items.filter((item) => item.localId !== localId);
    },
    async listItems() {
      return items;
    },
  };
}

describe('PantryScreenContent', () => {
  it('adds a pantry item and refreshes the local list', async () => {
    render(<PantryScreenContent repository={createTestRepository()} />);

    await screen.findByText('No pantry items yet');

    fireEvent.press(screen.getByText('Add item'));
    fireEvent.changeText(screen.getByPlaceholderText('Brown rice'), 'Brown rice');
    fireEvent.changeText(screen.getByPlaceholderText('2'), '2');
    fireEvent.changeText(screen.getByPlaceholderText('bags'), 'bags');
    fireEvent.changeText(screen.getByPlaceholderText('Pantry'), 'Pantry');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-08-01');
    fireEvent.press(screen.getByText('Save item'));

    await waitFor(() => {
      expect(screen.getByText('Brown rice')).toBeTruthy();
      expect(screen.getByText('2 bags')).toBeTruthy();
      expect(screen.getAllByText('Pantry').length).toBeGreaterThan(0);
      expect(screen.getByText('Aug 1')).toBeTruthy();
    });
  });

  it('renders the screen 17 pantry controls and expiry groups', async () => {
    const repository = createTestRepository();
    await repository.addItem({
      name: 'Spinach',
      quantity: 1,
      unit: 'bag',
      location: 'Fridge',
      expiresAt: '2026-05-27',
    });
    await repository.addItem({
      name: 'Tomatoes',
      quantity: 6,
      unit: '',
      location: 'Pantry',
      expiresAt: '2026-05-30',
    });
    await repository.addItem({
      name: 'Frozen peas',
      quantity: 1,
      unit: 'pack',
      location: 'Freezer',
      expiresAt: '2026-06-18',
    });

    render(<PantryScreenContent repository={repository} />);

    await screen.findByText('Expiring soon');

    expect(screen.getAllByText('Pantry').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fridge').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Freezer').length).toBeGreaterThan(0);
    expect(screen.getByText('Search ingredients')).toBeTruthy();
    expect(screen.getByText('barcode scan')).toBeTruthy();
    expect(screen.getByText('Expiring soon')).toBeTruthy();
    expect(screen.getByText('This week')).toBeTruthy();
    expect(screen.getByText('Later')).toBeTruthy();
    expect(screen.getByText('May 27')).toBeTruthy();
    expect(screen.getByText('May 30')).toBeTruthy();
    expect(screen.getByText('Jun 18')).toBeTruthy();
  });

  it('deletes a pantry item when the delete button is pressed', async () => {
    const repository = createTestRepository();
    await repository.addItem({
      name: 'Spinach',
      quantity: 1,
      unit: 'bag',
      location: 'Fridge',
      expiresAt: '2026-05-27',
    });

    render(<PantryScreenContent repository={repository} />);

    await screen.findByText('Spinach');

    fireEvent.press(screen.getByLabelText('Delete Spinach'));

    await waitFor(() => {
      expect(screen.queryByText('Spinach')).toBeNull();
    });
  });

  it('opens edit form for a pantry item and saves changes', async () => {
    const repository = createTestRepository();
    await repository.addItem({
      name: 'Spinach',
      quantity: 1,
      unit: 'bag',
      location: 'Fridge',
      expiresAt: '2026-05-27',
    });

    render(<PantryScreenContent repository={repository} />);

    await screen.findByText('Spinach');

    fireEvent.press(screen.getByLabelText('Edit Spinach'));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Spinach')).toBeTruthy();
    });

    fireEvent.changeText(screen.getByDisplayValue('Spinach'), 'Baby spinach');
    fireEvent.changeText(screen.getByDisplayValue('1'), '2');
    fireEvent.press(screen.getByText('Save changes'));

    await waitFor(() => {
      expect(screen.getByText('Baby spinach')).toBeTruthy();
      expect(screen.getByText('2 bag')).toBeTruthy();
    });
  });
});
