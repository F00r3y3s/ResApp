import type { AuthError, Session, User } from '@supabase/supabase-js';

export type AuthResult =
  | { success: true; session: Session; user: User }
  | { success: false; error: string };

export type AuthService = {
  /** Sign in with email + magic link (passwordless). */
  signInWithOtp(email: string): Promise<AuthResult>;
  /** Verify OTP code sent to email. */
  verifyOtp(email: string, token: string): Promise<AuthResult>;
  /** Sign in with email + password (fallback). */
  signInWithPassword(email: string, password: string): Promise<AuthResult>;
  /** Create account with email + password. */
  signUp(email: string, password: string): Promise<AuthResult>;
  /** Sign out and clear session. */
  signOut(): Promise<void>;
  /** Get current session (null if not authenticated). */
  getSession(): Promise<Session | null>;
  /** Listen for auth state changes. Returns unsubscribe function. */
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
};

export type SupabaseAuthClient = {
  auth: {
    signInWithOtp(params: { email: string }): Promise<{ data: unknown; error: AuthError | null }>;
    verifyOtp(params: {
      email: string;
      token: string;
      type: 'email';
    }): Promise<{ data: { session: Session | null; user: User | null }; error: AuthError | null }>;
    signInWithPassword(params: {
      email: string;
      password: string;
    }): Promise<{ data: { session: Session | null; user: User | null }; error: AuthError | null }>;
    signUp(params: {
      email: string;
      password: string;
    }): Promise<{ data: { session: Session | null; user: User | null }; error: AuthError | null }>;
    signOut(): Promise<{ error: AuthError | null }>;
    getSession(): Promise<{ data: { session: Session | null }; error: AuthError | null }>;
    onAuthStateChange(
      callback: (event: string, session: Session | null) => void,
    ): { data: { subscription: { unsubscribe: () => void } } };
  };
};

export function createAuthService(client: SupabaseAuthClient): AuthService {
  return {
    async signInWithOtp(email) {
      const { error } = await client.auth.signInWithOtp({ email });

      if (error) {
        return { success: false, error: error.message };
      }

      // OTP sent — no session yet until verified
      return {
        success: true,
        session: {} as Session,
        user: {} as User,
      };
    },

    async verifyOtp(email, token) {
      const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.session || !data.user) {
        return { success: false, error: 'Verification failed. Please try again.' };
      }

      return { success: true, session: data.session, user: data.user };
    },

    async signInWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.session || !data.user) {
        return { success: false, error: 'Sign in failed. Please try again.' };
      }

      return { success: true, session: data.session, user: data.user };
    },

    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.session || !data.user) {
        return { success: false, error: 'Account created. Check your email to confirm.' };
      }

      return { success: true, session: data.session, user: data.user };
    },

    async signOut() {
      await client.auth.signOut();
    },

    async getSession() {
      const { data } = await client.auth.getSession();
      return data.session;
    },

    onAuthStateChange(callback) {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        callback(session);
      });

      return data.subscription.unsubscribe;
    },
  };
}
