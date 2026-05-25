import { describe, expect, it } from '@jest/globals';

import { createChatRepository, type ChatStorage } from './chat-repository';
import type { ChatMessage } from './chat-types';

function createMemoryStorage(): ChatStorage {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
  };
}

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    role: 'user',
    content: 'What can I cook tonight?',
    timestamp: '2026-05-25T18:00:00.000Z',
    source: 'local',
    ...overrides,
  };
}

describe('chat repository', () => {
  it('persists and retrieves chat messages', async () => {
    const repo = createChatRepository(createMemoryStorage());

    await repo.saveMessage(buildMessage({ id: 'msg-1', role: 'user', content: 'Hello' }));
    await repo.saveMessage(buildMessage({ id: 'msg-2', role: 'assistant', content: 'Hi there!' }));

    const messages = await repo.getMessages();

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toBe('Hello');
    expect(messages[1].content).toBe('Hi there!');
  });

  it('returns empty array when no messages exist', async () => {
    const repo = createChatRepository(createMemoryStorage());

    const messages = await repo.getMessages();

    expect(messages).toEqual([]);
  });

  it('clears chat history', async () => {
    const repo = createChatRepository(createMemoryStorage());

    await repo.saveMessage(buildMessage());
    await repo.clearHistory();

    const messages = await repo.getMessages();
    expect(messages).toEqual([]);
  });

  it('trims messages to last 100 to prevent unbounded growth', async () => {
    const repo = createChatRepository(createMemoryStorage());

    for (let i = 0; i < 105; i++) {
      await repo.saveMessage(buildMessage({ id: `msg-${i}`, content: `Message ${i}` }));
    }

    const messages = await repo.getMessages();
    expect(messages).toHaveLength(100);
    expect(messages[0].content).toBe('Message 5');
    expect(messages[99].content).toBe('Message 104');
  });
});
