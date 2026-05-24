import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';

import { PantryScreenContent } from './pantry-screen';
import type { PantryItem, PantryRepository } from './pantry-repository';

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
    async listItems() {
      return items;
    },
  };
}

describe('PantryScreenContent', () => {
  it('adds a pantry item and refreshes the local list', async () => {
    render(<PantryScreenContent repository={createTestRepository()} />);

    await screen.findByText('No pantry items yet');

    fireEvent.changeText(screen.getByPlaceholderText('Brown rice'), 'Brown rice');
    fireEvent.changeText(screen.getByPlaceholderText('2'), '2');
    fireEvent.changeText(screen.getByPlaceholderText('bags'), 'bags');
    fireEvent.changeText(screen.getByPlaceholderText('Pantry'), 'Pantry');
    fireEvent.changeText(screen.getByPlaceholderText('YYYY-MM-DD'), '2026-08-01');
    fireEvent.press(screen.getByText('Add item'));

    await waitFor(() => {
      expect(screen.getByText('Brown rice')).toBeTruthy();
      expect(screen.getByText('2 bags')).toBeTruthy();
      expect(screen.getByText('Pantry')).toBeTruthy();
      expect(screen.getByText('Expires 2026-08-01')).toBeTruthy();
    });
  });
});
