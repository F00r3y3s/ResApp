/**
 * T7.2 AI Gateway error class for client-side error handling.
 */

export class AIGatewayError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: {
    limit?: number;
    used?: number;
    resetAt?: string;
  };

  constructor(
    code: string,
    message: string,
    statusCode: number,
    details?: { limit?: number; used?: number; resetAt?: string },
  ) {
    super(message);
    this.name = 'AIGatewayError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  /** Whether this error is a rate limit (daily free-tier cap reached) */
  get isRateLimited(): boolean {
    return this.code === 'daily_limit_reached';
  }

  /** Whether this error is an auth failure (token expired, not logged in) */
  get isUnauthorized(): boolean {
    return this.code === 'unauthorized';
  }

  /** Whether this error is a server-side issue (retry may help) */
  get isRetryable(): boolean {
    return this.statusCode >= 500 || this.code === 'rate_limited' || this.code === 'service_unavailable';
  }
}
