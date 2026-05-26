/**
 * T7.2 AI Gateway client — typed interface for calling the Edge Function.
 *
 * Security contract:
 * - No model keys are stored or transmitted by this client.
 * - Auth token is passed via Authorization header (Supabase JWT).
 * - The client never sends PII beyond what the user explicitly provides
 *   (pantry items, preferences, chat messages).
 */

import { AIGatewayError } from './ai-gateway-error';
import type {
    AIGatewayAction,
    AIGatewayPayload,
    AIGatewayResult,
} from './ai-gateway-types';

// ---------------------------------------------------------------------------
// Client interface
// ---------------------------------------------------------------------------

export type AIGatewayClient = {
  /** Send an AI request through the secure gateway */
  request<T = unknown>(action: AIGatewayAction, payload: AIGatewayPayload): Promise<T>;
};

export type AIGatewayClientOptions = {
  /** Supabase project URL (e.g., https://xxx.supabase.co) */
  supabaseUrl: string;
  /** Function to get the current auth token (JWT) */
  getAccessToken: () => Promise<string | null>;
  /** Optional timeout in ms (default: 30000) */
  timeout?: number;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createAIGatewayClient(options: AIGatewayClientOptions): AIGatewayClient {
  const { supabaseUrl, getAccessToken, timeout = 30_000 } = options;
  const functionUrl = `${supabaseUrl}/functions/v1/ai-gateway`;

  return {
    async request<T = unknown>(action: AIGatewayAction, payload: AIGatewayPayload): Promise<T> {
      const token = await getAccessToken();

      if (!token) {
        throw new AIGatewayError(
          'unauthorized',
          'You must be signed in to use AI features.',
          401,
        );
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action, payload }),
          signal: controller.signal,
        });

        const result: AIGatewayResult<T> = await response.json();

        if (!result.success) {
          throw new AIGatewayError(
            result.error.code,
            result.error.message,
            response.status,
            result.error.details,
          );
        }

        return result.data;
      } catch (error) {
        if (error instanceof AIGatewayError) {
          throw error;
        }

        // AbortController signals timeout (DOMException in browsers, AbortError in Node/RN)
        if (
          (error instanceof DOMException && error.name === 'AbortError') ||
          (error instanceof Error && error.name === 'AbortError') ||
          controller.signal.aborted
        ) {
          throw new AIGatewayError(
            'timeout',
            'AI request timed out. Please try again.',
            408,
          );
        }

        // Network error or unexpected failure
        throw new AIGatewayError(
          'network_error',
          'Unable to reach AI service. Check your connection and try again.',
          0,
        );
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}
