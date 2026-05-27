import { describe, expect, it } from '@jest/globals';

import { convert, getCompatibleUnits, SUPPORTED_UNITS } from './conversions';

describe('conversions', () => {
  describe('cups ↔ ml', () => {
    it('converts cups to ml', () => {
      expect(convert(1, 'cups', 'ml')).toBeCloseTo(236.588);
    });

    it('converts ml to cups', () => {
      expect(convert(236.588, 'ml', 'cups')).toBeCloseTo(1);
    });

    it('converts 2 cups to ml', () => {
      expect(convert(2, 'cups', 'ml')).toBeCloseTo(473.176);
    });
  });

  describe('tsp ↔ ml', () => {
    it('converts tsp to ml', () => {
      expect(convert(1, 'tsp', 'ml')).toBeCloseTo(4.929);
    });

    it('converts ml to tsp', () => {
      expect(convert(4.929, 'ml', 'tsp')).toBeCloseTo(1);
    });
  });

  describe('tbsp ↔ ml', () => {
    it('converts tbsp to ml', () => {
      expect(convert(1, 'tbsp', 'ml')).toBeCloseTo(14.787);
    });

    it('converts ml to tbsp', () => {
      expect(convert(14.787, 'ml', 'tbsp')).toBeCloseTo(1);
    });
  });

  describe('oz ↔ g', () => {
    it('converts oz to g', () => {
      expect(convert(1, 'oz', 'g')).toBeCloseTo(28.3495);
    });

    it('converts g to oz', () => {
      expect(convert(28.3495, 'g', 'oz')).toBeCloseTo(1);
    });
  });

  describe('lb ↔ kg', () => {
    it('converts lb to kg', () => {
      expect(convert(1, 'lb', 'kg')).toBeCloseTo(0.4536);
    });

    it('converts kg to lb', () => {
      expect(convert(1, 'kg', 'lb')).toBeCloseTo(2.2046);
    });
  });

  describe('°F ↔ °C', () => {
    it('converts °F to °C', () => {
      expect(convert(212, '°F', '°C')).toBeCloseTo(100);
      expect(convert(32, '°F', '°C')).toBeCloseTo(0);
      expect(convert(350, '°F', '°C')).toBeCloseTo(176.667, 0);
    });

    it('converts °C to °F', () => {
      expect(convert(100, '°C', '°F')).toBeCloseTo(212);
      expect(convert(0, '°C', '°F')).toBeCloseTo(32);
      expect(convert(180, '°C', '°F')).toBeCloseTo(356);
    });
  });

  describe('edge cases', () => {
    it('returns null for incompatible units', () => {
      expect(convert(1, 'cups', 'g')).toBeNull();
      expect(convert(1, '°F', 'ml')).toBeNull();
      expect(convert(1, 'lb', 'ml')).toBeNull();
    });

    it('returns the same value when converting to the same unit', () => {
      expect(convert(5, 'cups', 'cups')).toBe(5);
      expect(convert(100, '°C', '°C')).toBe(100);
    });

    it('converts 0 correctly', () => {
      expect(convert(0, 'cups', 'ml')).toBe(0);
      expect(convert(0, '°C', '°F')).toBeCloseTo(32);
    });

    it('handles negative values (e.g., sub-zero temperatures)', () => {
      expect(convert(-40, '°F', '°C')).toBeCloseTo(-40);
      expect(convert(-40, '°C', '°F')).toBeCloseTo(-40);
    });
  });

  describe('SUPPORTED_UNITS', () => {
    it('exports a list of all supported unit identifiers', () => {
      expect(SUPPORTED_UNITS).toContain('cups');
      expect(SUPPORTED_UNITS).toContain('ml');
      expect(SUPPORTED_UNITS).toContain('tsp');
      expect(SUPPORTED_UNITS).toContain('tbsp');
      expect(SUPPORTED_UNITS).toContain('oz');
      expect(SUPPORTED_UNITS).toContain('g');
      expect(SUPPORTED_UNITS).toContain('lb');
      expect(SUPPORTED_UNITS).toContain('kg');
      expect(SUPPORTED_UNITS).toContain('°F');
      expect(SUPPORTED_UNITS).toContain('°C');
    });
  });

  describe('getCompatibleUnits', () => {
    it('returns volume units for a volume unit', () => {
      const compatible = getCompatibleUnits('cups');
      expect(compatible).toContain('ml');
      expect(compatible).toContain('tsp');
      expect(compatible).toContain('tbsp');
      expect(compatible).not.toContain('cups'); // excludes self
      expect(compatible).not.toContain('g');
    });

    it('returns weight units for a weight unit', () => {
      const compatible = getCompatibleUnits('oz');
      expect(compatible).toContain('g');
      expect(compatible).toContain('lb');
      expect(compatible).toContain('kg');
      expect(compatible).not.toContain('oz');
      expect(compatible).not.toContain('ml');
    });

    it('returns temperature units for a temperature unit', () => {
      const compatible = getCompatibleUnits('°F');
      expect(compatible).toContain('°C');
      expect(compatible).not.toContain('°F');
    });

    it('returns empty array for unknown unit', () => {
      expect(getCompatibleUnits('unknown' as any)).toEqual([]);
    });
  });
});
