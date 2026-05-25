import { describe, expect, it } from '@jest/globals';

import { createFollowRepository } from './follow-repository';

function createMemoryStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: async (key: string) => store[key] ?? null,
    setItem: async (key: string, value: string) => {
      store[key] = value;
    },
  };
}

describe('follow-repository', () => {
  it('starts with no followed creators', async () => {
    const storage = createMemoryStorage();
    const repo = createFollowRepository(storage);

    const ids = await repo.getFollowedCreatorIds();
    expect(ids).toEqual([]);
  });

  it('follows a creator and persists the id', async () => {
    const storage = createMemoryStorage();
    const repo = createFollowRepository(storage);

    await repo.followCreator('creator-1');

    const ids = await repo.getFollowedCreatorIds();
    expect(ids).toEqual(['creator-1']);
  });

  it('follows multiple creators', async () => {
    const storage = createMemoryStorage();
    const repo = createFollowRepository(storage);

    await repo.followCreator('creator-1');
    await repo.followCreator('creator-2');

    const ids = await repo.getFollowedCreatorIds();
    expect(ids).toContain('creator-1');
    expect(ids).toContain('creator-2');
    expect(ids).toHaveLength(2);
  });

  it('does not duplicate a creator when followed twice', async () => {
    const storage = createMemoryStorage();
    const repo = createFollowRepository(storage);

    await repo.followCreator('creator-1');
    await repo.followCreator('creator-1');

    const ids = await repo.getFollowedCreatorIds();
    expect(ids).toEqual(['creator-1']);
  });

  it('unfollows a creator', async () => {
    const storage = createMemoryStorage();
    const repo = createFollowRepository(storage);

    await repo.followCreator('creator-1');
    await repo.followCreator('creator-2');
    await repo.unfollowCreator('creator-1');

    const ids = await repo.getFollowedCreatorIds();
    expect(ids).toEqual(['creator-2']);
  });

  it('unfollowing a non-followed creator is a no-op', async () => {
    const storage = createMemoryStorage();
    const repo = createFollowRepository(storage);

    await repo.followCreator('creator-1');
    await repo.unfollowCreator('creator-99');

    const ids = await repo.getFollowedCreatorIds();
    expect(ids).toEqual(['creator-1']);
  });

  it('isFollowing returns true for followed creators', async () => {
    const storage = createMemoryStorage();
    const repo = createFollowRepository(storage);

    await repo.followCreator('creator-1');

    expect(await repo.isFollowing('creator-1')).toBe(true);
    expect(await repo.isFollowing('creator-2')).toBe(false);
  });

  it('persists follow state across repository instances (survives restart)', async () => {
    const storage = createMemoryStorage();

    const first = createFollowRepository(storage);
    await first.followCreator('creator-1');
    await first.followCreator('creator-3');

    // Simulate app restart — new repository instance, same storage
    const second = createFollowRepository(storage);
    const ids = await second.getFollowedCreatorIds();
    expect(ids).toContain('creator-1');
    expect(ids).toContain('creator-3');
    expect(ids).toHaveLength(2);
  });

  it('handles corrupted storage gracefully', async () => {
    const storage = createMemoryStorage();
    await storage.setItem('family-ai-kitchen:followed-creators', 'not-json{{{');

    const repo = createFollowRepository(storage);
    const ids = await repo.getFollowedCreatorIds();
    expect(ids).toEqual([]);
  });
});
