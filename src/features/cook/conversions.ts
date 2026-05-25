/**
 * Pure unit conversion utilities for cook mode.
 *
 * Supports volume (cups, ml, tsp, tbsp), weight (oz, g, lb, kg),
 * and temperature (°F, °C) conversions.
 */

export type Unit = 'cups' | 'ml' | 'tsp' | 'tbsp' | 'oz' | 'g' | 'lb' | 'kg' | '°F' | '°C';

export const SUPPORTED_UNITS: readonly Unit[] = [
  'cups',
  'ml',
  'tsp',
  'tbsp',
  'oz',
  'g',
  'lb',
  'kg',
  '°F',
  '°C',
] as const;

type UnitGroup = 'volume' | 'weight' | 'temperature';

const UNIT_GROUPS: Record<Unit, UnitGroup> = {
  cups: 'volume',
  ml: 'volume',
  tsp: 'volume',
  tbsp: 'volume',
  oz: 'weight',
  g: 'weight',
  lb: 'weight',
  kg: 'weight',
  '°F': 'temperature',
  '°C': 'temperature',
};

/**
 * Conversion factors to a canonical base unit within each group.
 * Volume base: ml
 * Weight base: g
 * Temperature is handled separately (non-linear).
 */
const TO_BASE: Record<Exclude<Unit, '°F' | '°C'>, number> = {
  // Volume → ml
  ml: 1,
  cups: 236.588,
  tsp: 4.929,
  tbsp: 14.787,
  // Weight → g
  g: 1,
  oz: 28.3495,
  lb: 453.592,
  kg: 1000,
};

/**
 * Convert a value from one unit to another.
 * Returns null if the units are incompatible (different groups).
 * Returns the same value if fromUnit === toUnit.
 */
export function convert(value: number, fromUnit: Unit, toUnit: Unit): number | null {
  if (fromUnit === toUnit) {
    return value;
  }

  const fromGroup = UNIT_GROUPS[fromUnit];
  const toGroup = UNIT_GROUPS[toUnit];

  if (!fromGroup || !toGroup) {
    return null;
  }

  if (fromGroup !== toGroup) {
    return null;
  }

  // Temperature conversions (non-linear)
  if (fromGroup === 'temperature') {
    return convertTemperature(value, fromUnit as '°F' | '°C', toUnit as '°F' | '°C');
  }

  // Linear conversions via base unit
  const fromFactor = TO_BASE[fromUnit as Exclude<Unit, '°F' | '°C'>];
  const toFactor = TO_BASE[toUnit as Exclude<Unit, '°F' | '°C'>];

  const baseValue = value * fromFactor;
  return baseValue / toFactor;
}

function convertTemperature(value: number, from: '°F' | '°C', to: '°F' | '°C'): number {
  if (from === '°F' && to === '°C') {
    return (value - 32) * (5 / 9);
  }
  // °C → °F
  return value * (9 / 5) + 32;
}

/**
 * Get the list of units compatible with the given unit (same group, excluding self).
 * Returns an empty array for unknown units.
 */
export function getCompatibleUnits(unit: Unit): Unit[] {
  const group = UNIT_GROUPS[unit];
  if (!group) {
    return [];
  }
  return SUPPORTED_UNITS.filter((u) => UNIT_GROUPS[u] === group && u !== unit);
}
