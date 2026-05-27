import { describe, expect, it, jest } from '@jest/globals';

import type { CooksnapRow } from './cooksnap-repository';
import { createCooksnapRepository } from './cooksnap-repository';

// ---------------------------------------------------------------------------
// Supabase client double (same pattern as circle-repository.test.ts)
// ---------------------------------------------------------------------------

function createSupabaseDouble(options: {
  uploadImpl?: (
    bucket: string,
    path: string,
    file: unknown,
    opts: unknown,
  ) => { data: { path: string } | null; error: unknown };
  insertImpl?: (
    table: string,
    row: Record<string, unknown>,
  ) => { data: unknown; error: unknown };
  selectImpl?: (table: string) => { data: unknown; error: unknown };
} = {}) {
  const uploadCalls: { bucket: string; path: string }[] = [];
  const insertCalls: { table: string; row: Record<string, unknown> }[] = [];
  const fromCalls: { table: string }[] = [];

  const client = {
    storage: {
      from: jest.fn((bucket: string) => ({
        upload: jest.fn((path: string, file: unknown, opts: unknown) => {
          uploadCalls.push({ bucket, path });
          const impl =
            options.uploadImpl ??
            (() => ({ data: { path: `${bucket}/${path}` }, error: null }));
          return Promise.resolve(impl(bucket, path, file, opts));
        }),
        getPublicUrl: jest.fn((path: string) => ({
          data: { publicUrl: `https://storage.example.com/${bucket}/${path}` },
        })),
      })),
    },
    from: jest.fn((table: string) => {
      fromCalls.push({ table });

      const builder: any = {
        insert: jest.fn((row: Record<string, unknown>) => {
          insertCalls.push({ table, row });
          const selectBuilder: any = {
            select: jest.fn(() => selectBuilder),
            single: jest.fn(() => selectBuilder),
            then(resolve: (value: { data: unknown; error: unknown }) => void) {
              const impl =
                options.insertImpl ?? (() => ({ data: row, error: null }));
              resolve(impl(table, row));
            },
          };
          return selectBuilder;
        }),
        select: jest.fn(() => builder),
        eq: jest.fn(() => builder),
        order: jest.fn(() => builder),
        then(resolve: (value: { data: unknown; error: unknown }) => void) {
          const impl = options.selectImpl ?? (() => ({ data: [], error: null }));
          resolve(impl(table));
        },
      };

      return builder;
    }),
  };

  return { client, uploadCalls, insertCalls, fromCalls };
}

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleCooksnapRow: CooksnapRow = {
  id: 'snap-1',
  recipe_id: 'recipe-abc',
  circle_id: 'circle-1',
  image_path: 'cooksnap-images/user-a/1234.jpg',
  caption: 'Turned out great!',
  created_by: 'user-a',
  created_at: '2026-06-02T12:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cooksnap-repository', () => {
  describe('createCooksnap', () => {
    it('uploads the image to cooksnap-images bucket and inserts a row', async () => {
      const { client, uploadCalls, insertCalls } = createSupabaseDouble({
        uploadImpl: (_bucket, path) => ({
          data: { path },
          error: null,
        }),
        insertImpl: () => ({
          data: sampleCooksnapRow,
          error: null,
        }),
      });

      const repo = createCooksnapRepository({
        client: client as any,
        getCurrentUserId: async () => 'user-a',
      });

      const result = await repo.createCooksnap({
        recipeId: 'recipe-abc',
        circleId: 'circle-1',
        imageUri: 'file:///tmp/photo.jpg',
        caption: 'Turned out great!',
      });

      expect(uploadCalls).toHaveLength(1);
      expect(uploadCalls[0].bucket).toBe('cooksnap-images');
      expect(insertCalls).toHaveLength(1);
      expect(insertCalls[0].table).toBe('cooksnaps');
      expect(insertCalls[0].row).toMatchObject({
        recipe_id: 'recipe-abc',
        circle_id: 'circle-1',
        caption: 'Turned out great!',
        created_by: 'user-a',
      });
      expect(result.id).toBe('snap-1');
      expect(result.recipeId).toBe('recipe-abc');
      expect(result.caption).toBe('Turned out great!');
    });

    it('rejects captions longer than 200 characters', async () => {
      const { client } = createSupabaseDouble();
      const repo = createCooksnapRepository({
        client: client as any,
        getCurrentUserId: async () => 'user-a',
      });

      await expect(
        repo.createCooksnap({
          recipeId: 'recipe-abc',
          circleId: 'circle-1',
          imageUri: 'file:///tmp/photo.jpg',
          caption: 'x'.repeat(201),
        }),
      ).rejects.toThrow(/200 characters/i);
    });

    it('allows empty caption', async () => {
      const { client } = createSupabaseDouble({
        uploadImpl: (_bucket, path) => ({
          data: { path },
          error: null,
        }),
        insertImpl: () => ({
          data: { ...sampleCooksnapRow, caption: null },
          error: null,
        }),
      });

      const repo = createCooksnapRepository({
        client: client as any,
        getCurrentUserId: async () => 'user-a',
      });

      const result = await repo.createCooksnap({
        recipeId: 'recipe-abc',
        circleId: 'circle-1',
        imageUri: 'file:///tmp/photo.jpg',
      });

      expect(result.caption).toBeNull();
    });

    it('throws when the user is not signed in', async () => {
      const { client } = createSupabaseDouble();
      const repo = createCooksnapRepository({
        client: client as any,
        getCurrentUserId: async () => null,
      });

      await expect(
        repo.createCooksnap({
          recipeId: 'recipe-abc',
          circleId: 'circle-1',
          imageUri: 'file:///tmp/photo.jpg',
        }),
      ).rejects.toThrow(/sign in/i);
    });

    it('throws when the Supabase client is null', async () => {
      const repo = createCooksnapRepository({ client: null });

      await expect(
        repo.createCooksnap({
          recipeId: 'recipe-abc',
          circleId: 'circle-1',
          imageUri: 'file:///tmp/photo.jpg',
        }),
      ).rejects.toThrow(/sign in|internet/i);
    });

    it('throws a repository error when image upload fails', async () => {
      const { client } = createSupabaseDouble({
        uploadImpl: () => ({
          data: null,
          error: { message: 'storage_quota_exceeded' },
        }),
      });

      const repo = createCooksnapRepository({
        client: client as any,
        getCurrentUserId: async () => 'user-a',
      });

      await expect(
        repo.createCooksnap({
          recipeId: 'recipe-abc',
          circleId: 'circle-1',
          imageUri: 'file:///tmp/photo.jpg',
        }),
      ).rejects.toThrow(/upload/i);
    });

    it('throws a repository error when database insert fails', async () => {
      const { client } = createSupabaseDouble({
        uploadImpl: (_bucket, path) => ({
          data: { path },
          error: null,
        }),
        insertImpl: () => ({
          data: null,
          error: { message: 'violates row-level security' },
        }),
      });

      const repo = createCooksnapRepository({
        client: client as any,
        getCurrentUserId: async () => 'user-a',
      });

      await expect(
        repo.createCooksnap({
          recipeId: 'recipe-abc',
          circleId: 'circle-1',
          imageUri: 'file:///tmp/photo.jpg',
        }),
      ).rejects.toThrow(/Could not save/i);
    });
  });

  describe('getCooksnapsByCircle', () => {
    it('selects cooksnaps for the given circle ordered by newest first', async () => {
      const { client, fromCalls } = createSupabaseDouble({
        selectImpl: (table) => {
          if (table === 'cooksnaps') {
            return { data: [sampleCooksnapRow], error: null };
          }
          return { data: [], error: null };
        },
      });

      const repo = createCooksnapRepository({
        client: client as any,
        getCurrentUserId: async () => 'user-a',
      });

      const snaps = await repo.getCooksnapsByCircle('circle-1');

      expect(fromCalls).toEqual([{ table: 'cooksnaps' }]);
      expect(snaps).toEqual([
        {
          id: 'snap-1',
          recipeId: 'recipe-abc',
          circleId: 'circle-1',
          imagePath: 'cooksnap-images/user-a/1234.jpg',
          caption: 'Turned out great!',
          createdBy: 'user-a',
          createdAt: '2026-06-02T12:00:00.000Z',
        },
      ]);
    });

    it('returns an empty list when the client is null', async () => {
      const repo = createCooksnapRepository({ client: null });
      const snaps = await repo.getCooksnapsByCircle('circle-1');
      expect(snaps).toEqual([]);
    });

    it('throws a repository error when the query fails', async () => {
      const { client } = createSupabaseDouble({
        selectImpl: () => ({
          data: null,
          error: { message: 'permission denied' },
        }),
      });

      const repo = createCooksnapRepository({
        client: client as any,
        getCurrentUserId: async () => 'user-a',
      });

      await expect(repo.getCooksnapsByCircle('circle-1')).rejects.toThrow(
        /Could not load/i,
      );
    });
  });

  describe('getImageUrl', () => {
    it('returns the public URL for a given image path', () => {
      const { client } = createSupabaseDouble();
      const repo = createCooksnapRepository({
        client: client as any,
        getCurrentUserId: async () => 'user-a',
      });

      const url = repo.getImageUrl('user-a/1234.jpg');
      expect(url).toContain('cooksnap-images');
      expect(url).toContain('user-a/1234.jpg');
    });

    it('returns empty string when client is null', () => {
      const repo = createCooksnapRepository({ client: null });
      expect(repo.getImageUrl('user-a/1234.jpg')).toBe('');
    });
  });
});
