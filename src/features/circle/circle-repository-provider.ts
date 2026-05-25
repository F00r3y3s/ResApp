import { supabase } from '@/lib/supabase';

import { createCircleRepository, type CircleRepository } from './circle-repository';

let repository: CircleRepository | null = null;

/**
 * Singleton accessor for the circle repository. The repository is bound to the
 * current Supabase client, which may be `null` when env vars are missing or
 * the user is in guest mode — the repository handles that case explicitly.
 */
export function getCircleRepository(): CircleRepository {
  if (repository) return repository;
  repository = createCircleRepository({ client: supabase });
  return repository;
}
