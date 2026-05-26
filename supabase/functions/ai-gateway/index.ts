/**
 * T7.2 AI Gateway Edge Function
 *
 * Responsibilities:
 * 1. Validate JWT (auth.uid())
 * 2. Check entitlement (user_entitlements table)
 * 3. Enforce rate limits for free-tier users (ai_usage table)
 * 4. Proxy request to OpenAI with server-side key
 * 5. Log request metadata (no PII, no content) to analytics
 * 6. Return structured response or user-friendly error
 *
 * Security contract:
 * - OpenAI key never leaves this function.
 * - Request/response content is NOT logged (privacy contract).
 * - Fail-closed: if entitlement check errors, deny the request.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.106.1';
import { checkEntitlement } from './entitlement-check.ts';
import { proxyToOpenAI } from './openai-proxy.ts';
import { checkAndIncrementUsage } from './rate-limiter.ts';
import type { AIGatewayRequest } from './types.ts';
import { corsHeaders, errorResponse, jsonResponse } from './utils.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed', 'Only POST is supported');
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse(401, 'unauthorized', 'Missing or invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    // Create authenticated client to verify the user
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return errorResponse(401, 'unauthorized', 'Invalid or expired token');
    }

    const userId = user.id;

    // Parse request body
    let body: AIGatewayRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse(400, 'invalid_body', 'Request body must be valid JSON');
    }

    if (!body.action || !body.payload) {
      return errorResponse(400, 'invalid_body', 'Request must include action and payload');
    }

    // 2. Check entitlement (service-role client for reading entitlements)
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const entitlementResult = await checkEntitlement(supabaseService, userId);

    // 3. Rate limit for free-tier users
    if (!entitlementResult.isPremium) {
      const rateLimitResult = await checkAndIncrementUsage(supabaseService, userId, body.action);
      if (!rateLimitResult.allowed) {
        return errorResponse(429, 'daily_limit_reached', rateLimitResult.message, {
          limit: rateLimitResult.limit,
          used: rateLimitResult.used,
          resetAt: rateLimitResult.resetAt,
        });
      }
    }

    // 4. Proxy to OpenAI
    const aiResponse = await proxyToOpenAI(body);

    // 5. Log metadata only (no content, no PII — privacy contract)
    await supabaseService.from('ai_usage').upsert(
      {
        user_id: userId,
        usage_date: new Date().toISOString().slice(0, 10),
        request_count: entitlementResult.isPremium ? 0 : 1, // Already incremented for free users
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,usage_date', ignoreDuplicates: true },
    ).select();

    // 6. Return response
    return jsonResponse(200, {
      success: true,
      action: body.action,
      data: aiResponse,
    });
  } catch (error) {
    // Never leak internal errors to client
    console.error('[ai-gateway] Unhandled error:', error);
    return errorResponse(500, 'internal_error', 'An unexpected error occurred. Please try again.');
  }
});
