import { publicEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import { createAIGatewayClient, type AIGatewayClient } from './ai-gateway-client';

let client: AIGatewayClient | null = null;

/**
 * Returns the singleton AIGatewayClient instance.
 *
 * Returns null if Supabase is not configured (no env vars set).
 * The client uses the current Supabase session JWT as the auth token.
 */
export function getAIGatewayClient(): AIGatewayClient | null {
  if (client) return client;

  if (!publicEnv.supabaseUrl || !supabase) return null;

  const supabaseClient = supabase;

  client = createAIGatewayClient({
    supabaseUrl: publicEnv.supabaseUrl,
    getAccessToken: async () => {
      const { data } = await supabaseClient.auth.getSession();
      return data.session?.access_token ?? null;
    },
  });

  return client;
}
