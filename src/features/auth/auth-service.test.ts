import { describe, expect, it, jest } from '@jest/globals';

import { createAuthService, type SupabaseAuthClient } from './auth-service';

function createMockClient(overrides?: Partial<SupabaseAuthClient['auth']>): SupabaseAuthClient {
  return {
    auth: {
      signInWithOtp: jest.fn().mockResolvedValue({ data: {}, error: null }) as any,
      verifyOtp: jest.fn().mockResolvedValue({
        data: {
          session: { access_token: 'token-123', user: { id: 'user-1' } },
          user: { id: 'user-1', email: 'test@example.com' },
        },
        error: null,
      }) as any,
      signInWithPassword: jest.fn().mockResolvedValue({
        data: {
          session: { access_token: 'token-123', user: { id: 'user-1' } },
          user: { id: 'user-1', email: 'test@example.com' },
        },
        error: null,
      }) as any,
      signUp: jest.fn().mockResolvedValue({
        data: {
          session: { access_token: 'token-123', user: { id: 'user-1' } },
          user: { id: 'user-1', email: 'test@example.com' },
        },
        error: null,
      }) as any,
      signOut: jest.fn().mockResolvedValue({ error: null }) as any,
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'token-123' } },
        error: null,
      }) as any,
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }) as any,
      ...overrides,
    },
  };
}

describe('auth service', () => {
  it('sends OTP to email for passwordless sign-in', async () => {
    const client = createMockClient();
    const service = createAuthService(client);

    const result = await service.signInWithOtp('user@example.com');

    expect(result.success).toBe(true);
    expect(client.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'user@example.com' });
  });

  it('returns error message when OTP send fails', async () => {
    const client = createMockClient({
      signInWithOtp: jest.fn().mockResolvedValue({
        data: {},
        error: { message: 'Rate limit exceeded' },
      }) as any,
    });
    const service = createAuthService(client);

    const result = await service.signInWithOtp('user@example.com');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Rate limit exceeded');
    }
  });

  it('verifies OTP and returns session', async () => {
    const client = createMockClient();
    const service = createAuthService(client);

    const result = await service.verifyOtp('user@example.com', '123456');

    expect(result.success).toBe(true);
    expect(client.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'user@example.com',
      token: '123456',
      type: 'email',
    });
  });

  it('signs in with email and password', async () => {
    const client = createMockClient();
    const service = createAuthService(client);

    const result = await service.signInWithPassword('user@example.com', 'password123');

    expect(result.success).toBe(true);
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
  });

  it('creates account with email and password', async () => {
    const client = createMockClient();
    const service = createAuthService(client);

    const result = await service.signUp('user@example.com', 'password123');

    expect(result.success).toBe(true);
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
  });

  it('returns error when sign-in with password fails', async () => {
    const client = createMockClient({
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid login credentials' },
      }) as any,
    });
    const service = createAuthService(client);

    const result = await service.signInWithPassword('user@example.com', 'wrong');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Invalid login credentials');
    }
  });

  it('gets current session', async () => {
    const client = createMockClient();
    const service = createAuthService(client);

    const session = await service.getSession();

    expect(session).toEqual({ access_token: 'token-123' });
  });

  it('returns null session when not authenticated', async () => {
    const client = createMockClient({
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }) as any,
    });
    const service = createAuthService(client);

    const session = await service.getSession();

    expect(session).toBeNull();
  });

  it('signs out and clears session', async () => {
    const client = createMockClient();
    const service = createAuthService(client);

    await service.signOut();

    expect(client.auth.signOut).toHaveBeenCalled();
  });

  it('subscribes to auth state changes', () => {
    const client = createMockClient();
    const service = createAuthService(client);

    const callback = jest.fn();
    const unsubscribe = service.onAuthStateChange(callback);

    expect(client.auth.onAuthStateChange).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });
});
