export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
  /** Whether this was a local (Smart Chef Lite) or gateway (AI) response. */
  source: 'local' | 'gateway';
};

export type ChatHistory = {
  messages: ChatMessage[];
};
