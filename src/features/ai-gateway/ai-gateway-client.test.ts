/**
 * T7.2 AI Gateway client tests.
 *
 * Tests cover:
 * - Successful request flow
 * - Unauthorized access (no token)
 * - Rate limit (429) handling
 * - Network errors
 * - Timeout handling
 * - Error response parsing
 */

import { createAIGatewayClient } from './ai-gateway-client';
import { AIGatewayError } from './ai-gateway-error';
import type { AIChatPayload, AISuggestionPayload } from './ai-gateway-types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch;

function createClient(overrides?: { getAccessToken?: () => Promise<string | null>; timeout?: number }) {
  return createAIGatewayClient({
    supabaseUrl: 'https://test.supabase.co',
    getAccessToken: overrides?.getAccessToken ?? (async () => 'valid-jwt-token'),
    timeout: overrides?.timeout ?? 5000,
  });
}

function mockSuccessResponse<T>(data: T) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ success: true, action: 'ai-suggestion', data }),
  });
}

function mockErrorResponse(status: number, code: string, message: string, details?: Record<string, unknown>) {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
    }),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockFetch.mockReset();
});

describe('AI Gateway Client', () => {
  describe('successful requests', () => {
    it('sends a properly formatted request to the Edge Function', async () => {
      const client = createClient();
      const payload: AISuggestionPayload = {
        type: 'ai-suggestion',
        pantryItems: ['rice', 'chicken', 'onion'],
        preferences: { allergies: ['peanuts'] },
      };

      mockSuccessResponse({ suggestions: [{ title: 'Chicken Rice' }] });

      await client.request('ai-suggestion', payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/ai-gateway',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer valid-jwt-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'ai-suggestion', payload }),
        }),
      );
    });

    it('returns parsed data from a successful response', async () => {
      const client = createClient();
      const expectedData = { suggestions: [{ title: 'Pasta Primavera' }] };
      mockSuccessResponse(expectedData);

      const result = await client.request('ai-suggestion', {
        type: 'ai-suggestion',
        pantryItems: ['pasta', 'tomatoes'],
      });

      expect(result).toEqual(expectedData);
    });

    it('handles chat action with conversation history', async () => {
      const client = createClient();
      const payload: AIChatPayload = {
        type: 'ai-chat',
        messages: [
          { role: 'user', content: 'What can I substitute for eggs in baking?' },
        ],
        context: { currentRecipe: 'Chocolate Cake' },
      };

      mockSuccessResponse({ text: 'You can use applesauce or flax eggs.' });

      const result = await client.request('ai-chat', payload);
      expect(result).toEqual({ text: 'You can use applesauce or flax eggs.' });
    });
  });

  describe('unauthorized access', () => {
    it('throws AIGatewayError when no token is available', async () => {
      const client = createClient({ getAccessToken: async () => null });

      await expect(
        client.request('ai-suggestion', { type: 'ai-suggestion', pantryItems: ['rice'] }),
      ).rejects.toThrow(AIGatewayError);

      await expect(
        client.request('ai-suggestion', { type: 'ai-suggestion', pantryItems: ['rice'] }),
      ).rejects.toMatchObject({
        code: 'unauthorized',
        statusCode: 401,
      });

      // Should not call fetch at all
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws AIGatewayError when server returns 401', async () => {
      const client = createClient();
      mockErrorResponse(401, 'unauthorized', 'Invalid or expired token');

      await expect(
        client.request('ai-suggestion', { type: 'ai-suggestion', pantryItems: ['rice'] }),
      ).rejects.toMatchObject({
        code: 'unauthorized',
        statusCode: 401,
        isUnauthorized: true,
      });
    });
  });

  describe('rate limiting', () => {
    it('throws AIGatewayError with rate limit details on 429', async () => {
      const client = createClient();
      mockErrorResponse(429, 'daily_limit_reached', 'Daily AI limit reached (3 requests).', {
        limit: 3,
        used: 3,
        resetAt: '2026-05-26T00:00:00.000Z',
      });

      try {
        await client.request('ai-suggestion', { type: 'ai-suggestion', pantryItems: ['rice'] });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AIGatewayError);
        const gatewayError = error as AIGatewayError;
        expect(gatewayError.isRateLimited).toBe(true);
        expect(gatewayError.details?.limit).toBe(3);
        expect(gatewayError.details?.used).toBe(3);
        expect(gatewayError.details?.resetAt).toBe('2026-05-26T00:00:00.000Z');
      }
    });
  });

  describe('error handling', () => {
    it('throws AIGatewayError on server error (500)', async () => {
      const client = createClient();
      mockErrorResponse(500, 'internal_error', 'An unexpected error occurred.');

      await expect(
        client.request('ai-suggestion', { type: 'ai-suggestion', pantryItems: ['rice'] }),
      ).rejects.toMatchObject({
        code: 'internal_error',
        statusCode: 500,
        isRetryable: true,
      });
    });

    it('throws network_error on fetch failure', async () => {
      const client = createClient();
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(
        client.request('ai-suggestion', { type: 'ai-suggestion', pantryItems: ['rice'] }),
      ).rejects.toMatchObject({
        code: 'network_error',
        statusCode: 0,
      });
    });

    it('throws timeout error when request exceeds timeout', async () => {
      const client = createClient({ timeout: 10 });

      // Simulate a slow response
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 100)),
      );

      await expect(
        client.request('ai-suggestion', { type: 'ai-suggestion', pantryItems: ['rice'] }),
      ).rejects.toMatchObject({
        code: 'timeout',
        statusCode: 408,
      });
    });
  });

  describe('AIGatewayError properties', () => {
    it('isRateLimited returns true for daily_limit_reached', () => {
      const error = new AIGatewayError('daily_limit_reached', 'Limit reached', 429);
      expect(error.isRateLimited).toBe(true);
      expect(error.isUnauthorized).toBe(false);
      expect(error.isRetryable).toBe(false);
    });

    it('isUnauthorized returns true for unauthorized code', () => {
      const error = new AIGatewayError('unauthorized', 'Not logged in', 401);
      expect(error.isUnauthorized).toBe(true);
      expect(error.isRateLimited).toBe(false);
    });

    it('isRetryable returns true for 5xx and service errors', () => {
      expect(new AIGatewayError('internal_error', 'err', 500).isRetryable).toBe(true);
      expect(new AIGatewayError('service_unavailable', 'err', 503).isRetryable).toBe(true);
      expect(new AIGatewayError('rate_limited', 'err', 429).isRetryable).toBe(true);
      expect(new AIGatewayError('unauthorized', 'err', 401).isRetryable).toBe(false);
    });
  });
});
