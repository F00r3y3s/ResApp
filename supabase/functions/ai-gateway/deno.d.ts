/**
 * Minimal Deno type declarations for Supabase Edge Functions.
 * Full types come from the Deno runtime; this file enables IDE support
 * without requiring a full Deno installation locally.
 */

declare namespace Deno {
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
  const env: {
    get(key: string): string | undefined;
  };
}
