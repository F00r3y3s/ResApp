import { z } from 'zod';

const publicEnvSchema = z.object({
  supabaseUrl: z.string().url().optional(),
  supabaseAnonKey: z.string().min(1).optional(),
  powerSyncUrl: z.string().url().optional(),
  posthogApiKey: z.string().min(1).optional(),
  sentryDsn: z.string().url().optional(),
});

export const publicEnv = publicEnvSchema.parse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  powerSyncUrl: process.env.EXPO_PUBLIC_POWERSYNC_URL,
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
});

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
export const isPowerSyncConfigured = Boolean(publicEnv.powerSyncUrl);
