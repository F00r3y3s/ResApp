/**
 * Follow repository — persists which creators the user follows.
 * Uses a simple JSON array in AsyncStorage/localStorage.
 */

const STORAGE_KEY = 'family-ai-kitchen:followed-creators';

export type KeyValueStorage = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
};

export type FollowRepository = {
  getFollowedCreatorIds(): Promise<string[]>;
  followCreator(creatorId: string): Promise<void>;
  unfollowCreator(creatorId: string): Promise<void>;
  isFollowing(creatorId: string): Promise<boolean>;
};

export function createFollowRepository(storage: KeyValueStorage): FollowRepository {
  async function readIds(): Promise<string[]> {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function writeIds(ids: string[]): Promise<void> {
    await storage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  return {
    async getFollowedCreatorIds() {
      return readIds();
    },

    async followCreator(creatorId: string) {
      const ids = await readIds();
      if (!ids.includes(creatorId)) {
        ids.push(creatorId);
        await writeIds(ids);
      }
    },

    async unfollowCreator(creatorId: string) {
      const ids = await readIds();
      const filtered = ids.filter((id) => id !== creatorId);
      await writeIds(filtered);
    },

    async isFollowing(creatorId: string) {
      const ids = await readIds();
      return ids.includes(creatorId);
    },
  };
}
