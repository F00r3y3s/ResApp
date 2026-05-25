import { describe, expect, it, jest } from '@jest/globals';
import { ZodError } from 'zod';

import type { CircleMemberRow, CircleRow } from './circle-repository';
import { createCircleRepository } from './circle-repository';

type RpcArgs = { fn: string; args: Record<string, unknown> };
type FromArgs = { table: string };

/**
 * Hand-rolled Supabase client double. We use the same fluent shape the real
 * client exposes (.from().select() / .rpc()), so the repository can be wired
 * to a real client at runtime without changes.
 */
function createSupabaseDouble(options: {
  rpcImpl?: (fn: string, args: Record<string, unknown>) => { data: unknown; error: unknown };
  selectImpl?: (table: string) => { data: unknown; error: unknown };
  deleteImpl?: (table: string, where: Record<string, unknown>) => { data: unknown; error: unknown };
} = {}) {
  const rpcCalls: RpcArgs[] = [];
  const fromCalls: FromArgs[] = [];

  const client = {
    rpc: jest.fn((fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      const impl = options.rpcImpl ?? (() => ({ data: null, error: null }));
      const result = impl(fn, args);
      return Promise.resolve(result);
    }),
    from: jest.fn((table: string) => {
      fromCalls.push({ table });
      const where: Record<string, unknown> = {};

      const builder: any = {
        select: jest.fn(() => builder),
        eq: jest.fn((col: string, val: unknown) => {
          where[col] = val;
          return builder;
        }),
        order: jest.fn(() => builder),
        delete: jest.fn(() => deleteBuilder),
        // Awaiting the builder runs the select.
        then(resolve: (value: { data: unknown; error: unknown }) => void) {
          const impl = options.selectImpl ?? (() => ({ data: [], error: null }));
          resolve(impl(table));
        },
      };

      const deleteBuilder: any = {
        eq: jest.fn((col: string, val: unknown) => {
          where[col] = val;
          return deleteBuilder;
        }),
        then(resolve: (value: { data: unknown; error: unknown }) => void) {
          const impl =
            options.deleteImpl ?? (() => ({ data: null, error: null }));
          resolve(impl(table, where));
        },
      };

      return builder;
    }),
  };

  return { client, rpcCalls, fromCalls };
}

const sampleCircleRow: CircleRow = {
  id: 'circle-1',
  name: 'Khan Family',
  privacy: 'private',
  invite_code: 'ABCD1234',
  created_by: 'user-a',
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
};

describe('circle-repository', () => {
  describe('createCircle', () => {
    it('calls the create_circle RPC with a trimmed name and returns the new circle', async () => {
      const { client, rpcCalls } = createSupabaseDouble({
        rpcImpl: (fn) => {
          if (fn === 'create_circle') {
            return { data: sampleCircleRow, error: null };
          }
          return { data: null, error: { message: 'unexpected fn' } };
        },
      });

      const repo = createCircleRepository({ client: client as any });
      const result = await repo.createCircle('  Khan Family  ');

      expect(rpcCalls).toEqual([{ fn: 'create_circle', args: { p_name: 'Khan Family' } }]);
      expect(result.id).toBe('circle-1');
      expect(result.name).toBe('Khan Family');
      expect(result.inviteCode).toBe('ABCD1234');
      expect(result.privacy).toBe('private');
    });

    it('rejects a name longer than 60 chars before hitting the network', async () => {
      const { client, rpcCalls } = createSupabaseDouble();
      const repo = createCircleRepository({ client: client as any });

      await expect(repo.createCircle('a'.repeat(61))).rejects.toBeInstanceOf(ZodError);
      expect(rpcCalls).toHaveLength(0);
    });

    it('surfaces RPC errors as repository errors with a friendly message', async () => {
      const { client } = createSupabaseDouble({
        rpcImpl: () => ({ data: null, error: { message: 'circle bus broken' } }),
      });
      const repo = createCircleRepository({ client: client as any });

      await expect(repo.createCircle('Family')).rejects.toThrow(/circle bus broken/i);
    });

    it('rewrites known RPC error codes to product-friendly copy', async () => {
      const { client } = createSupabaseDouble({
        rpcImpl: () => ({ data: null, error: { message: 'name_too_long' } }),
      });
      const repo = createCircleRepository({ client: client as any });

      await expect(repo.createCircle('Family')).rejects.toThrow(/60 characters/i);
    });

    it('throws a clear error when the Supabase client is null (offline / unconfigured)', async () => {
      const repo = createCircleRepository({ client: null });
      await expect(repo.createCircle('Family')).rejects.toThrow(/sign in|internet|connection/i);
    });
  });

  describe('joinByCode', () => {
    it('uppercases and trims the invite code and calls join_circle_by_code', async () => {
      const { client, rpcCalls } = createSupabaseDouble({
        rpcImpl: () => ({ data: sampleCircleRow, error: null }),
      });
      const repo = createCircleRepository({ client: client as any });

      const result = await repo.joinByCode('  abcd1234  ');

      expect(rpcCalls).toEqual([
        { fn: 'join_circle_by_code', args: { p_invite_code: 'ABCD1234' } },
      ]);
      expect(result.id).toBe('circle-1');
    });

    it('rejects codes that are too short before hitting the network', async () => {
      const { client, rpcCalls } = createSupabaseDouble();
      const repo = createCircleRepository({ client: client as any });

      await expect(repo.joinByCode('AB')).rejects.toBeInstanceOf(ZodError);
      expect(rpcCalls).toHaveLength(0);
    });

    it('surfaces invite_code_not_found as a friendly error', async () => {
      const { client } = createSupabaseDouble({
        rpcImpl: () => ({ data: null, error: { message: 'invite_code_not_found' } }),
      });
      const repo = createCircleRepository({ client: client as any });

      await expect(repo.joinByCode('ZZZZZZZZ')).rejects.toThrow(/invite/i);
    });
  });

  describe('getMyCircles', () => {
    it('selects circles ordered by created_at and maps to the domain shape', async () => {
      const { client, fromCalls } = createSupabaseDouble({
        selectImpl: (table) => {
          expect(table).toBe('circles');
          return { data: [sampleCircleRow], error: null };
        },
      });
      const repo = createCircleRepository({ client: client as any });

      const circles = await repo.getMyCircles();

      expect(fromCalls).toEqual([{ table: 'circles' }]);
      expect(circles).toEqual([
        {
          id: 'circle-1',
          name: 'Khan Family',
          privacy: 'private',
          inviteCode: 'ABCD1234',
          createdBy: 'user-a',
          createdAt: '2026-06-01T00:00:00.000Z',
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ]);
    });

    it('returns an empty list when not signed in', async () => {
      const repo = createCircleRepository({ client: null });
      await expect(repo.getMyCircles()).resolves.toEqual([]);
    });
  });

  describe('getCircleMembers', () => {
    it('selects circle_members for the given circle id', async () => {
      const memberRows: CircleMemberRow[] = [
        {
          circle_id: 'circle-1',
          user_id: 'user-a',
          role: 'owner',
          joined_at: '2026-06-01T00:00:00.000Z',
        },
        {
          circle_id: 'circle-1',
          user_id: 'user-b',
          role: 'member',
          joined_at: '2026-06-02T00:00:00.000Z',
        },
      ];
      const { client, fromCalls } = createSupabaseDouble({
        selectImpl: (table) => {
          expect(table).toBe('circle_members');
          return { data: memberRows, error: null };
        },
      });

      const repo = createCircleRepository({ client: client as any });
      const members = await repo.getCircleMembers('circle-1');

      expect(fromCalls).toEqual([{ table: 'circle_members' }]);
      expect(members).toEqual([
        {
          circleId: 'circle-1',
          userId: 'user-a',
          role: 'owner',
          joinedAt: '2026-06-01T00:00:00.000Z',
        },
        {
          circleId: 'circle-1',
          userId: 'user-b',
          role: 'member',
          joinedAt: '2026-06-02T00:00:00.000Z',
        },
      ]);
    });
  });

  describe('leaveCircle', () => {
    it('issues a DELETE on circle_members scoped to the current user', async () => {
      const deletes: { table: string; where: Record<string, unknown> }[] = [];
      const { client } = createSupabaseDouble({
        deleteImpl: (table, where) => {
          deletes.push({ table, where });
          return { data: null, error: null };
        },
      });
      const repo = createCircleRepository({
        client: client as any,
        getCurrentUserId: async () => 'user-b',
      });

      await repo.leaveCircle('circle-1');

      expect(deletes).toEqual([
        {
          table: 'circle_members',
          where: { circle_id: 'circle-1', user_id: 'user-b' },
        },
      ]);
    });

    it('throws a friendly error if the user is not signed in', async () => {
      const { client } = createSupabaseDouble();
      const repo = createCircleRepository({
        client: client as any,
        getCurrentUserId: async () => null,
      });

      await expect(repo.leaveCircle('circle-1')).rejects.toThrow(/sign in/i);
    });
  });
});
