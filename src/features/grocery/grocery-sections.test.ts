import { describe, expect, it } from '@jest/globals';

import type { GroceryItem } from './grocery-repository';
import { GROCERY_SECTIONS, groupItemsBySection, inferSection } from './grocery-sections';

// ---------------------------------------------------------------------------
// inferSection
// ---------------------------------------------------------------------------

describe('inferSection', () => {
  it('classifies dairy items', () => {
    expect(inferSection('milk')).toBe('Dairy');
    expect(inferSection('Cheddar cheese')).toBe('Dairy');
    expect(inferSection('Greek yogurt')).toBe('Dairy');
    expect(inferSection('butter')).toBe('Dairy');
    expect(inferSection('heavy cream')).toBe('Dairy');
  });

  it('classifies produce items', () => {
    expect(inferSection('tomatoes')).toBe('Produce');
    expect(inferSection('Fresh spinach')).toBe('Produce');
    expect(inferSection('garlic')).toBe('Produce');
    expect(inferSection('onion')).toBe('Produce');
    expect(inferSection('lemon')).toBe('Produce');
    expect(inferSection('avocado')).toBe('Produce');
    expect(inferSection('bell pepper')).toBe('Produce');
  });

  it('classifies meat & seafood items', () => {
    expect(inferSection('chicken breast')).toBe('Meat & Seafood');
    expect(inferSection('ground beef')).toBe('Meat & Seafood');
    expect(inferSection('salmon fillet')).toBe('Meat & Seafood');
    expect(inferSection('shrimp')).toBe('Meat & Seafood');
    expect(inferSection('lamb chops')).toBe('Meat & Seafood');
  });

  it('classifies spices', () => {
    expect(inferSection('cumin')).toBe('Spices');
    expect(inferSection('ground cinnamon')).toBe('Spices');
    expect(inferSection('turmeric')).toBe('Spices');
    expect(inferSection('paprika')).toBe('Spices');
    expect(inferSection('black pepper')).toBe('Spices');
    expect(inferSection('dried oregano')).toBe('Spices');
  });

  it('classifies pantry staples', () => {
    expect(inferSection('olive oil')).toBe('Pantry');
    expect(inferSection('all-purpose flour')).toBe('Pantry');
    expect(inferSection('white rice')).toBe('Pantry');
    expect(inferSection('red lentils')).toBe('Pantry');
    expect(inferSection('canned tomatoes')).toBe('Pantry');
    expect(inferSection('pasta')).toBe('Pantry');
    expect(inferSection('sugar')).toBe('Pantry');
  });

  it('classifies bakery items', () => {
    expect(inferSection('sourdough bread')).toBe('Bakery');
    expect(inferSection('pita bread')).toBe('Bakery');
    expect(inferSection('tortillas')).toBe('Bakery');
    expect(inferSection('bagels')).toBe('Bakery');
  });

  it('classifies frozen items', () => {
    expect(inferSection('frozen peas')).toBe('Frozen');
    expect(inferSection('frozen berries')).toBe('Frozen');
    expect(inferSection('ice cream')).toBe('Frozen');
  });

  it('classifies beverages', () => {
    expect(inferSection('orange juice')).toBe('Beverages');
    expect(inferSection('coffee beans')).toBe('Beverages');
    expect(inferSection('green tea')).toBe('Beverages');
    expect(inferSection('soda')).toBe('Beverages');
  });

  it('defaults to Other for unrecognized items', () => {
    expect(inferSection('xyzzy')).toBe('Other');
    expect(inferSection('random gadget')).toBe('Other');
  });

  it('is case-insensitive', () => {
    expect(inferSection('MILK')).toBe('Dairy');
    expect(inferSection('Chicken Breast')).toBe('Meat & Seafood');
  });
});

// ---------------------------------------------------------------------------
// GROCERY_SECTIONS constant
// ---------------------------------------------------------------------------

describe('GROCERY_SECTIONS', () => {
  it('contains the expected sections in order', () => {
    expect(GROCERY_SECTIONS).toEqual([
      'Produce',
      'Dairy',
      'Meat & Seafood',
      'Bakery',
      'Spices',
      'Pantry',
      'Frozen',
      'Beverages',
      'Other',
    ]);
  });
});

// ---------------------------------------------------------------------------
// groupItemsBySection
// ---------------------------------------------------------------------------

function makeItem(overrides: Partial<GroceryItem> & { name: string }): GroceryItem {
  const { name, ...rest } = overrides;
  return {
    localId: `local-${name}`,
    name,
    normalizedName: name.toLocaleLowerCase(),
    quantity: '1',
    unit: 'whole',
    recipeId: null,
    recipeTitle: null,
    isChecked: false,
    privacy: 'local-only',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...rest,
  };
}

describe('groupItemsBySection', () => {
  it('groups items by their section field', () => {
    const items: GroceryItem[] = [
      makeItem({ name: 'Milk', section: 'Dairy' }),
      makeItem({ name: 'Chicken', section: 'Meat & Seafood' }),
      makeItem({ name: 'Tomatoes', section: 'Produce' }),
    ];

    const grouped = groupItemsBySection(items);

    expect(grouped.get('Dairy')?.map((i) => i.name)).toEqual(['Milk']);
    expect(grouped.get('Meat & Seafood')?.map((i) => i.name)).toEqual(['Chicken']);
    expect(grouped.get('Produce')?.map((i) => i.name)).toEqual(['Tomatoes']);
  });

  it('uses inferSection when section field is not set', () => {
    const items: GroceryItem[] = [
      makeItem({ name: 'milk' }),
      makeItem({ name: 'chicken breast' }),
    ];

    const grouped = groupItemsBySection(items);

    expect(grouped.get('Dairy')?.map((i) => i.name)).toEqual(['milk']);
    expect(grouped.get('Meat & Seafood')?.map((i) => i.name)).toEqual(['chicken breast']);
  });

  it('places checked items at the bottom of each section', () => {
    const items: GroceryItem[] = [
      makeItem({ name: 'Milk', section: 'Dairy', isChecked: true, createdAt: '2026-01-01T00:00:00.000Z' }),
      makeItem({ name: 'Yogurt', section: 'Dairy', isChecked: false, createdAt: '2026-01-02T00:00:00.000Z' }),
      makeItem({ name: 'Butter', section: 'Dairy', isChecked: false, createdAt: '2026-01-03T00:00:00.000Z' }),
    ];

    const grouped = groupItemsBySection(items);
    const dairy = grouped.get('Dairy')!;

    // Unchecked items first, then checked
    expect(dairy[0].name).toBe('Yogurt');
    expect(dairy[1].name).toBe('Butter');
    expect(dairy[2].name).toBe('Milk');
    expect(dairy[2].isChecked).toBe(true);
  });

  it('returns sections in GROCERY_SECTIONS order, omitting empty sections', () => {
    const items: GroceryItem[] = [
      makeItem({ name: 'Cumin', section: 'Spices' }),
      makeItem({ name: 'Milk', section: 'Dairy' }),
      makeItem({ name: 'Tomatoes', section: 'Produce' }),
    ];

    const grouped = groupItemsBySection(items);
    const keys = [...grouped.keys()];

    // Should follow GROCERY_SECTIONS order: Produce, Dairy, ..., Spices
    expect(keys).toEqual(['Produce', 'Dairy', 'Spices']);
  });

  it('returns an empty map for an empty list', () => {
    const grouped = groupItemsBySection([]);
    expect(grouped.size).toBe(0);
  });
});
