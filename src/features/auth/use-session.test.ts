import { describe, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';

import type { AuthService } from './auth-service';
import { useSession } from './use-session';

function createMockAuthService(session: unknown = null): AuthService {
  return {
    signInWithOtp: jest.fn() as any,
    verifyOtp: jest.fn() as any,
    signInWithPassword: jest.fn() as any,
    signUp: jest.fn() as any,
    signOut: jest.fn() as any,
    getSession: jest.fn().mockResolvedValue(session) as any,
    onAuthStateChange: jest.fn().mockReturnValue(jest.fn()) as any,
  };
}

describe('useSession', () => {
  it('reports isReady=true and isAuthenticated=false when no session exists', async () => {
    const service = createMockAuthService(null);

    const { result } = renderHook(() => useSession(service));

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('reports isAuthenticated=true when a session exists', async () => {
    const service = createMockAuthService({ access_token: 'token-123', user: { id: 'user-1' } });

    const { result } = renderHook(() => useSession(service));

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session).toEqual({ access_token: 'token-123', user: { id: 'user-1' } });
  });

  it('handles null auth service gracefully (Supabase not configured)', async () => {
    const { result } = renderHook(() => useSession(null));

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('subscribes to auth state changes', async () => {
    const service = createMockAuthService(null);

    renderHook(() => useSession(service));

    await waitFor(() => {
      expect(service.onAuthStateChange).toHaveBeenCalled();
    });
  });
});
