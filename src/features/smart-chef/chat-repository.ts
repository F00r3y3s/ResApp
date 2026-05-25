import type { ChatMessage } from './chat-types';

const STORAGE_KEY = 'family-ai-kitchen:smart-chef-chat';

export type ChatStorage = {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
};

export type ChatRepository = {
  getMessages(): Promise<ChatMessage[]>;
  saveMessage(message: ChatMessage): Promise<void>;
  clearHistory(): Promise<void>;
};

export function createChatRepository(storage: ChatStorage): ChatRepository {
  let cachedMessages: ChatMessage[] | null = null;

  return {
    async getMessages() {
      if (cachedMessages) return cachedMessages;

      const stored = await storage.getItem(STORAGE_KEY);
      if (!stored) {
        cachedMessages = [];
        return [];
      }

      try {
        const parsed = JSON.parse(stored);
        cachedMessages = Array.isArray(parsed) ? parsed : [];
        return cachedMessages;
      } catch {
        cachedMessages = [];
        return [];
      }
    },

    async saveMessage(message) {
      const messages = await this.getMessages();
      const updated = [...messages, message];
      // Keep last 100 messages to avoid unbounded growth
      const trimmed = updated.slice(-100);
      cachedMessages = trimmed;
      await storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    },

    async clearHistory() {
      cachedMessages = [];
      await storage.setItem(STORAGE_KEY, JSON.stringify([]));
    },
  };
}
