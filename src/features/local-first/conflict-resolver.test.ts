import { describe, expect, it } from '@jest/globals';

import {
    resolveConflict,
    type ConflictRecord,
    type ConflictResolution,
} from './conflict-resolver';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConflictResolver', () => {
  describe('resolveConflict (last-write-wins)', () => {
    it('returns "local-wins" when local updated_at is newer', () => {
      const local: ConflictRecord = {
        id: 'item-1',
        updatedAt: '2026-06-01T15:00:00.000Z',
        data: { name: 'Local Tomatoes', quantity: '5' },
      };
      const remote: ConflictRecord = {
        id: 'item-1',
        updatedAt: '2026-06-01T14:00:00.000Z',
        data: { name: 'Remote Tomatoes', quantity: '3' },
      };

      const result = resolveConflict(local, remote);

      expect(result.winner).toBe('local-wins');
      expect(result.resolvedData).toEqual(local.data);
    });

    it('returns "remote-wins" when remote updated_at is newer', () => {
      const local: ConflictRecord = {
        id: 'item-2',
        updatedAt: '2026-06-01T12:00:00.000Z',
        data: { name: 'Local Rice', quantity: '1kg' },
      };
      const remote: ConflictRecord = {
        id: 'item-2',
        updatedAt: '2026-06-01T13:00:00.000Z',
        data: { name: 'Remote Rice', quantity: '2kg' },
      };

      const result = resolveConflict(local, remote);

      expect(result.winner).toBe('remote-wins');
      expect(result.resolvedData).toEqual(remote.data);
    });

    it('returns "remote-wins" when timestamps are identical (tie-break)', () => {
      const local: ConflictRecord = {
        id: 'item-3',
        updatedAt: '2026-06-01T10:00:00.000Z',
        data: { name: 'Local Garlic' },
      };
      const remote: ConflictRecord = {
        id: 'item-3',
        updatedAt: '2026-06-01T10:00:00.000Z',
        data: { name: 'Remote Garlic' },
      };

      const result = resolveConflict(local, remote);

      // Tie-break: remote wins (server is source of truth when equal)
      expect(result.winner).toBe('remote-wins');
      expect(result.resolvedData).toEqual(remote.data);
    });

    it('handles ISO timestamps with different timezone offsets correctly', () => {
      const local: ConflictRecord = {
        id: 'item-4',
        updatedAt: '2026-06-01T10:00:00.000Z', // UTC
        data: { name: 'Local Cumin' },
      };
      const remote: ConflictRecord = {
        id: 'item-4',
        updatedAt: '2026-06-01T11:00:00.000Z', // 1 hour later
        data: { name: 'Remote Cumin' },
      };

      const result = resolveConflict(local, remote);

      expect(result.winner).toBe('remote-wins');
    });

    it('returns the correct resolution type', () => {
      const local: ConflictRecord = {
        id: 'item-5',
        updatedAt: '2026-06-01T16:00:00.000Z',
        data: { name: 'Newer Local' },
      };
      const remote: ConflictRecord = {
        id: 'item-5',
        updatedAt: '2026-06-01T15:00:00.000Z',
        data: { name: 'Older Remote' },
      };

      const result: ConflictResolution = resolveConflict(local, remote);

      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('resolvedData');
      expect(result).toHaveProperty('strategy');
      expect(result.strategy).toBe('last-write-wins');
    });

    it('works with records containing nested data', () => {
      const local: ConflictRecord = {
        id: 'item-6',
        updatedAt: '2026-06-01T18:00:00.000Z',
        data: {
          name: 'Biryani',
          ingredients: ['rice', 'chicken', 'spices'],
          servings: 4,
        },
      };
      const remote: ConflictRecord = {
        id: 'item-6',
        updatedAt: '2026-06-01T17:00:00.000Z',
        data: {
          name: 'Biryani',
          ingredients: ['rice', 'mutton', 'spices'],
          servings: 6,
        },
      };

      const result = resolveConflict(local, remote);

      expect(result.winner).toBe('local-wins');
      expect(result.resolvedData).toEqual(local.data);
    });
  });
});
