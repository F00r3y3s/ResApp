import { describe, expect, it } from '@jest/globals';

import {
    detectPantryDuplicates,
    LOW_CONFIDENCE_THRESHOLD,
    parseDetectedItems,
    type DetectedItem,
    type ScanParseResponse
} from './detected-item';

describe('parseDetectedItems', () => {
  it('parses a typical AI gateway response', () => {
    const response: ScanParseResponse = {
      items: [
        {
          name: 'Spinach',
          confidence: 0.92,
          quantity: '1',
          unit: 'bag',
          location: 'Fridge',
          expiresAt: '2026-05-30',
        },
        {
          name: 'Yogurt',
          confidence: 0.85,
          quantity: 1,
          unit: 'tub',
          location: 'fridge',
        },
      ],
    };

    const items = parseDetectedItems(response);

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe('Spinach');
    expect(items[0].confidence).toBe(0.92);
    expect(items[0].location).toBe('Fridge');
    expect(items[0].expiresAt).toBe('2026-05-30');
    expect(items[0].isIncluded).toBe(true);

    expect(items[1].name).toBe('Yogurt');
    expect(items[1].quantity).toBe('1');
    expect(items[1].location).toBe('Fridge'); // normalized lowercase
    expect(items[1].expiresAt).toBe('');
  });

  it('returns empty array for empty response', () => {
    expect(parseDetectedItems({ items: [] })).toEqual([]);
  });

  it('returns empty array for malformed response', () => {
    expect(parseDetectedItems({} as unknown as ScanParseResponse)).toEqual([]);
    expect(parseDetectedItems(null as unknown as ScanParseResponse)).toEqual([]);
  });

  it('clamps confidence to [0, 1]', () => {
    const response: ScanParseResponse = {
      items: [
        { name: 'Item A', confidence: 1.5 },
        { name: 'Item B', confidence: -0.2 },
        { name: 'Item C', confidence: 0.5 },
      ],
    };

    const items = parseDetectedItems(response);

    expect(items[0].confidence).toBe(1);
    expect(items[1].confidence).toBe(0);
    expect(items[2].confidence).toBe(0.5);
  });

  it('marks items below LOW_CONFIDENCE_THRESHOLD for review', () => {
    const response: ScanParseResponse = {
      items: [
        { name: 'High Confidence', confidence: 0.95 },
        { name: 'Low Confidence', confidence: 0.4 },
      ],
    };

    const items = parseDetectedItems(response);

    expect(items[0].confidence).toBeGreaterThanOrEqual(LOW_CONFIDENCE_THRESHOLD);
    expect(items[1].confidence).toBeLessThan(LOW_CONFIDENCE_THRESHOLD);
  });

  it('defaults missing fields to safe values', () => {
    const response: ScanParseResponse = {
      items: [
        { name: 'Bare Item', confidence: 0.8 },
      ],
    };

    const items = parseDetectedItems(response);

    expect(items[0].quantity).toBe('1');
    expect(items[0].unit).toBe('');
    expect(items[0].location).toBe('Pantry');
    expect(items[0].expiresAt).toBe('');
    expect(items[0].isIncluded).toBe(true);
    expect(items[0].destination).toBe('pantry');
  });

  it('uses provided default destination', () => {
    const response: ScanParseResponse = {
      items: [{ name: 'Milk', confidence: 0.9 }],
    };

    const items = parseDetectedItems(response, 'grocery');

    expect(items[0].destination).toBe('grocery');
  });

  it('normalizes location values', () => {
    const response: ScanParseResponse = {
      items: [
        { name: 'A', confidence: 1, location: 'fridge' },
        { name: 'B', confidence: 1, location: 'FREEZER' },
        { name: 'C', confidence: 1, location: 'refrigerator' },
        { name: 'D', confidence: 1, location: 'cabinet' },
      ],
    };

    const items = parseDetectedItems(response);

    expect(items[0].location).toBe('Fridge');
    expect(items[1].location).toBe('Freezer');
    expect(items[2].location).toBe('Fridge');
    expect(items[3].location).toBe('Cabinet');
  });

  it('generates unique ids for FlatList keys', () => {
    const response: ScanParseResponse = {
      items: [
        { name: 'A', confidence: 1 },
        { name: 'B', confidence: 1 },
      ],
    };

    const items = parseDetectedItems(response);

    expect(items[0].id).not.toBe(items[1].id);
  });

  it('handles non-numeric confidence values', () => {
    const response: ScanParseResponse = {
      items: [
        { name: 'A', confidence: NaN as any },
        { name: 'B', confidence: 'high' as any },
      ],
    };

    const items = parseDetectedItems(response);

    expect(items[0].confidence).toBe(0);
    expect(items[1].confidence).toBe(0);
  });
});


describe('detectPantryDuplicates', () => {
  function buildItem(overrides: Partial<DetectedItem> = {}): DetectedItem {
    return {
      id: 'detected-1',
      name: 'Milk',
      confidence: 0.9,
      quantity: '1',
      unit: 'gallon',
      location: 'Fridge',
      expiresAt: '',
      isIncluded: true,
      destination: 'pantry',
      ...overrides,
    };
  }

  it('finds exact name matches in existing pantry', () => {
    const detected = [buildItem({ id: 'a', name: 'Milk', destination: 'pantry' })];
    const existing = [{ localId: 'pan-1', name: 'Milk', normalizedName: 'milk' }];

    const dupes = detectPantryDuplicates(detected, existing);

    expect(dupes).toHaveLength(1);
    expect(dupes[0].detectedItemId).toBe('a');
    expect(dupes[0].existingLocalId).toBe('pan-1');
  });

  it('matches case-insensitively and ignores whitespace', () => {
    const detected = [buildItem({ id: 'a', name: '  MILK  ', destination: 'pantry' })];
    const existing = [{ localId: 'pan-1', name: 'Milk', normalizedName: 'milk' }];

    const dupes = detectPantryDuplicates(detected, existing);

    expect(dupes).toHaveLength(1);
  });

  it('returns empty when no duplicates exist', () => {
    const detected = [buildItem({ id: 'a', name: 'Bread' })];
    const existing = [{ localId: 'pan-1', name: 'Milk', normalizedName: 'milk' }];

    const dupes = detectPantryDuplicates(detected, existing);

    expect(dupes).toEqual([]);
  });

  it('skips items not destined for pantry', () => {
    const detected = [buildItem({ id: 'a', name: 'Milk', destination: 'grocery' })];
    const existing = [{ localId: 'pan-1', name: 'Milk', normalizedName: 'milk' }];

    const dupes = detectPantryDuplicates(detected, existing);

    expect(dupes).toEqual([]);
  });

  it('skips items not marked as included', () => {
    const detected = [
      buildItem({ id: 'a', name: 'Milk', isIncluded: false }),
    ];
    const existing = [{ localId: 'pan-1', name: 'Milk', normalizedName: 'milk' }];

    const dupes = detectPantryDuplicates(detected, existing);

    expect(dupes).toEqual([]);
  });

  it('detects multiple duplicates', () => {
    const detected = [
      buildItem({ id: 'a', name: 'Milk' }),
      buildItem({ id: 'b', name: 'Eggs' }),
      buildItem({ id: 'c', name: 'New Item' }),
    ];
    const existing = [
      { localId: 'pan-1', name: 'Milk', normalizedName: 'milk' },
      { localId: 'pan-2', name: 'Eggs', normalizedName: 'eggs' },
    ];

    const dupes = detectPantryDuplicates(detected, existing);

    expect(dupes).toHaveLength(2);
    expect(dupes.map((d) => d.detectedItemId).sort()).toEqual(['a', 'b']);
  });

  it('skips items with empty names', () => {
    const detected = [buildItem({ id: 'a', name: '   ' })];
    const existing = [{ localId: 'pan-1', name: 'Milk', normalizedName: 'milk' }];

    const dupes = detectPantryDuplicates(detected, existing);

    expect(dupes).toEqual([]);
  });
});
