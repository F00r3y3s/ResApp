import { createChatRepository, type ChatRepository, type ChatStorage } from './chat-repository';

const memoryStore = new Map<string, string>();
let repository: ChatRepository | null = null;

const memoryStorage: ChatStorage = {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => {
    memoryStore.set(key, value);
  },
};

/**
 * Returns the singleton ChatRepository instance.
 *
 * Currently uses in-memory storage. Production should swap this with
 * AsyncStorage or SecureStore for cross-session persistence.
 */
export function getChatRepository(): ChatRepository {
  if (repository) return repository;
  repository = createChatRepository(memoryStorage);
  return repository;
}
