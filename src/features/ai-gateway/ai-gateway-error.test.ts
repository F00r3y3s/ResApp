/**
 * T7.2 AI Gateway error class tests.
 */

import { AIGatewayError } from './ai-gateway-error';

describe('AIGatewayError', () => {
  it('creates an error with all properties', () => {
    const error = new AIGatewayError('daily_limit_reached', 'Limit hit', 429, {
      limit: 3,
      used: 3,
      resetAt: '2026-05-26T00:00:00.000Z',
    });

    expect(error.name).toBe('AIGatewayError');
    expect(error.code).toBe('daily_limit_reached');
    expect(error.message).toBe('Limit hit');
    expect(error.statusCode).toBe(429);
    expect(error.details?.limit).toBe(3);
    expect(error.details?.used).toBe(3);
    expect(error.details?.resetAt).toBe('2026-05-26T00:00:00.000Z');
  });

  it('extends Error', () => {
    const error = new AIGatewayError('test', 'msg', 400);
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AIGatewayError);
  });

  describe('isRateLimited', () => {
    it('returns true only for daily_limit_reached', () => {
      expect(new AIGatewayError('daily_limit_reached', '', 429).isRateLimited).toBe(true);
      expect(new AIGatewayError('unauthorized', '', 401).isRateLimited).toBe(false);
      expect(new AIGatewayError('internal_error', '', 500).isRateLimited).toBe(false);
    });
  });

  describe('isUnauthorized', () => {
    it('returns true only for unauthorized code', () => {
      expect(new AIGatewayError('unauthorized', '', 401).isUnauthorized).toBe(true);
      expect(new AIGatewayError('daily_limit_reached', '', 429).isUnauthorized).toBe(false);
    });
  });

  describe('isRetryable', () => {
    it('returns true for 5xx status codes', () => {
      expect(new AIGatewayError('internal_error', '', 500).isRetryable).toBe(true);
      expect(new AIGatewayError('service_unavailable', '', 503).isRetryable).toBe(true);
      expect(new AIGatewayError('unknown', '', 502).isRetryable).toBe(true);
    });

    it('returns true for rate_limited and service_unavailable codes', () => {
      expect(new AIGatewayError('rate_limited', '', 429).isRetryable).toBe(true);
      expect(new AIGatewayError('service_unavailable', '', 503).isRetryable).toBe(true);
    });

    it('returns false for client errors', () => {
      expect(new AIGatewayError('unauthorized', '', 401).isRetryable).toBe(false);
      expect(new AIGatewayError('invalid_body', '', 400).isRetryable).toBe(false);
      expect(new AIGatewayError('daily_limit_reached', '', 429).isRetryable).toBe(false);
    });
  });
});
