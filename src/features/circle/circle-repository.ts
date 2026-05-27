import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Database row shapes (snake_case, mirror Postgres exactly)
// ---------------------------------------------------------------------------

export type CirclePrivacy = 'private';
export type CircleRole = 'owner' | 'member';

export type CircleRow = {
  id: string;
  name: string;
  privacy: CirclePrivacy;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CircleMemberRow = {
  circle_id: string;
  user_id: string;
  role: CircleRole;
  joined_at: string;
};

// ---------------------------------------------------------------------------
// Domain shapes (camelCase)
// ---------------------------------------------------------------------------

export type Circle = {
  id: string;
  name: string;
  privacy: CirclePrivacy;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type CircleMember = {
  circleId: string;
  userId: string;
  role: CircleRole;
  joinedAt: string;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const circleNameSchema = z
  .string()
  .trim()
  .min(1, 'Circle name is required')
  .max(60, 'Circle name must be 60 characters or fewer');

export const inviteCodeSchema = z
  .string()
  .trim()
  .min(6, 'Invite code is too short')
  .max(16, 'Invite code is too long')
  .transform((value) => value.toUpperCase());

// ---------------------------------------------------------------------------
// Repository contract
// ---------------------------------------------------------------------------

export type CircleRepository = {
  createCircle(name: string): Promise<Circle>;
  joinByCode(code: string): Promise<Circle>;
  getMyCircles(): Promise<Circle[]>;
  getCircleMembers(circleId: string): Promise<CircleMember[]>;
  leaveCircle(circleId: string): Promise<void>;
};

export type CircleRepositoryOptions = {
  /**
   * Supabase client. May be `null` when env is unconfigured or the user is in
   * guest mode — in that case mutating calls reject with a clear "sign in"
   * error and read calls resolve with empty data.
   */
  client: SupabaseClient | null;
  /**
   * Lookup for the currently authenticated user id. Defaults to a call to
   * `client.auth.getUser()`. Override in tests.
   */
  getCurrentUserId?: () => Promise<string | null>;
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

const NOT_SIGNED_IN_MESSAGE =
  'You need to sign in with an internet connection to use circles.';

export class CircleRepositoryError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'CircleRepositoryError';
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCircleRepository(options: CircleRepositoryOptions): CircleRepository {
  const client = options.client;
  const getCurrentUserId =
    options.getCurrentUserId ??
    (async () => {
      if (!client) return null;
      const { data, error } = await client.auth.getUser();
      if (error) {
        return null;
      }
      return data.user?.id ?? null;
    });

  function requireClient(): SupabaseClient {
    if (!client) {
      throw new CircleRepositoryError(NOT_SIGNED_IN_MESSAGE, 'no_client');
    }
    return client;
  }

  return {
    async createCircle(name) {
      const trimmed = circleNameSchema.parse(name);
      const c = requireClient();
      const { data, error } = await c.rpc('create_circle', { p_name: trimmed });
      if (error) {
        throw mapRpcError(error, 'Could not create circle.');
      }
      if (!data) {
        throw new CircleRepositoryError('Circle creation returned no data.');
      }
      return mapCircle(data as CircleRow);
    },

    async joinByCode(code) {
      const normalized = inviteCodeSchema.parse(code);
      const c = requireClient();
      const { data, error } = await c.rpc('join_circle_by_code', {
        p_invite_code: normalized,
      });
      if (error) {
        throw mapRpcError(error, 'Could not join circle.');
      }
      if (!data) {
        throw new CircleRepositoryError('Invite code did not match a circle.');
      }
      return mapCircle(data as CircleRow);
    },

    async getMyCircles() {
      if (!client) {
        // Guest mode: nothing to read; UI should show "sign in to use circles".
        return [];
      }
      const { data, error } = await client
        .from('circles')
        .select('id, name, privacy, invite_code, created_by, created_at, updated_at')
        .order('created_at', { ascending: false });
      if (error) {
        throw mapRpcError(error, 'Could not load circles.');
      }
      return ((data ?? []) as CircleRow[]).map(mapCircle);
    },

    async getCircleMembers(circleId) {
      if (!client) return [];
      const { data, error } = await client
        .from('circle_members')
        .select('circle_id, user_id, role, joined_at')
        .eq('circle_id', circleId)
        .order('joined_at', { ascending: true });
      if (error) {
        throw mapRpcError(error, 'Could not load circle members.');
      }
      return ((data ?? []) as CircleMemberRow[]).map(mapMember);
    },

    async leaveCircle(circleId) {
      const c = requireClient();
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new CircleRepositoryError(NOT_SIGNED_IN_MESSAGE, 'no_user');
      }
      const { error } = await c
        .from('circle_members')
        .delete()
        .eq('circle_id', circleId)
        .eq('user_id', userId);
      if (error) {
        throw mapRpcError(error, 'Could not leave circle.');
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapCircle(row: CircleRow): Circle {
  return {
    id: row.id,
    name: row.name,
    privacy: row.privacy,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: CircleMemberRow): CircleMember {
  return {
    circleId: row.circle_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

function mapRpcError(error: { message?: string; code?: string }, fallback: string): Error {
  const raw = (error?.message ?? '').toLowerCase();
  if (raw.includes('invite_code_not_found')) {
    return new CircleRepositoryError(
      'That invite code does not match any circle.',
      'invite_code_not_found',
    );
  }
  if (raw.includes('authentication_required')) {
    return new CircleRepositoryError(NOT_SIGNED_IN_MESSAGE, 'authentication_required');
  }
  if (raw.includes('name_required')) {
    return new CircleRepositoryError('Circle name is required.', 'name_required');
  }
  if (raw.includes('name_too_long')) {
    return new CircleRepositoryError(
      'Circle name must be 60 characters or fewer.',
      'name_too_long',
    );
  }
  return new CircleRepositoryError(error?.message ?? fallback, error?.code);
}
