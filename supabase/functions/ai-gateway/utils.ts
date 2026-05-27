/**
 * T7.2 AI Gateway utilities — CORS headers and response helpers.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): Response {
  return jsonResponse(status, {
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}
