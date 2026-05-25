/**
 * Cooksnap repository — handles image upload and metadata persistence for
 * dish photos shared to private circles after cooking.
 *
 * Privacy contract (privacy-contract.md):
 * - Cooksnaps are `server-required`: they need the circle RLS boundary and
 *   Supabase storage. No local-only fallback.
 * - The image URI stays local until the user explicitly taps "Share"
 *   (consent-before-upload pattern).
 * - Caption is user-generated content within the private circle scope.
 *   It is NOT sent to analytics.
 *
 * Threat model (threat-model.md):
 * - Storage bucket `cooksnap-images` is scoped to circle membership via RLS.
 * - RLS on `cooksnaps` table restricts SELECT/INSERT to circle members.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Database row shape (snake_case, mirrors Postgres)
// ---------------------------------------------------------------------------

export type CooksnapRow = {
  id: string;
  recipe_id: string;
  circle_id: string;
  image_path: string;
  caption: string | null;
  created_by: string;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Domain shape (camelCase)
// ---------------------------------------------------------------------------

export type Cooksnap = {
  id: string;
  recipeId: string;
  circleId: string;
  imagePath: string;
  caption: string | null;
  createdBy: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type CreateCooksnapInput = {
  recipeId: string;
  circleId: string;
  imageUri: string;
  caption?: string;
};

// ---------------------------------------------------------------------------
// Repository contract
// ---------------------------------------------------------------------------

export type CooksnapRepository = {
  createCooksnap(input: CreateCooksnapInput): Promise<Cooksnap>;
  getCooksnapsByCircle(circleId: string): Promise<Cooksnap[]>;
  getImageUrl(imagePath: string): string;
};

export type CooksnapRepositoryOptions = {
  /**
   * Supabase client. May be `null` when env is unconfigured or the user is in
   * guest mode — in that case mutating calls reject with a clear "sign in"
   * error and read calls resolve with empty data.
   */
  client: SupabaseClient | null;
  /**
   * Lookup for the currently authenticated user id. Override in tests.
   */
  getCurrentUserId?: () => Promise<string | null>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUCKET = 'cooksnap-images';
const MAX_CAPTION_LENGTH = 200;
const NOT_SIGNED_IN_MESSAGE =
  'You need to sign in with an internet connection to share cooksnaps.';

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CooksnapRepositoryError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = 'CooksnapRepositoryError';
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createCooksnapRepository(
  options: CooksnapRepositoryOptions,
): CooksnapRepository {
  const client = options.client;
  const getCurrentUserId =
    options.getCurrentUserId ??
    (async () => {
      if (!client) return null;
      const { data, error } = await client.auth.getUser();
      if (error) return null;
      return data.user?.id ?? null;
    });

  function requireClient(): SupabaseClient {
    if (!client) {
      throw new CooksnapRepositoryError(NOT_SIGNED_IN_MESSAGE, 'no_client');
    }
    return client;
  }

  return {
    async createCooksnap(input) {
      const c = requireClient();
      const userId = await getCurrentUserId();
      if (!userId) {
        throw new CooksnapRepositoryError(NOT_SIGNED_IN_MESSAGE, 'no_user');
      }

      // Validate caption length
      if (input.caption && input.caption.length > MAX_CAPTION_LENGTH) {
        throw new CooksnapRepositoryError(
          `Caption must be 200 characters or fewer.`,
          'caption_too_long',
        );
      }

      // Upload image to storage
      const fileExt = input.imageUri.split('.').pop() ?? 'jpg';
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await c.storage
        .from(BUCKET)
        .upload(fileName, input.imageUri, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError || !uploadData) {
        throw new CooksnapRepositoryError(
          'Could not upload image. Please try again.',
          'upload_failed',
        );
      }

      // Insert metadata row
      const row = {
        recipe_id: input.recipeId,
        circle_id: input.circleId,
        image_path: uploadData.path,
        caption: input.caption ?? null,
        created_by: userId,
      };

      const { data, error } = await c
        .from('cooksnaps')
        .insert(row)
        .select()
        .single();

      if (error || !data) {
        throw new CooksnapRepositoryError(
          'Could not save cooksnap. Please try again.',
          'insert_failed',
        );
      }

      return mapCooksnap(data as CooksnapRow);
    },

    async getCooksnapsByCircle(circleId) {
      if (!client) return [];

      const { data, error } = await client
        .from('cooksnaps')
        .select('id, recipe_id, circle_id, image_path, caption, created_by, created_at')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new CooksnapRepositoryError(
          'Could not load cooksnaps for this circle.',
          'select_failed',
        );
      }

      return ((data ?? []) as CooksnapRow[]).map(mapCooksnap);
    },

    getImageUrl(imagePath) {
      if (!client) return '';
      const { data } = client.storage.from(BUCKET).getPublicUrl(imagePath);
      return data.publicUrl;
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapCooksnap(row: CooksnapRow): Cooksnap {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    circleId: row.circle_id,
    imagePath: row.image_path,
    caption: row.caption,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}
