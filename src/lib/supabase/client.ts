import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Reads the new publishable key first, falling back to the legacy anon key so
// this keeps working during Supabase's key transition (legacy keys are being
// retired by end of 2026).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// A single shared client instance. We memoize it because Realtime
// subscriptions (added in Batch 2) should run over one connection, not a new
// client per call.
let cachedClient: SupabaseClient | null = null;

/**
 * Returns the shared Supabase browser client, or null if the environment
 * variables aren't set yet (e.g. before you've added them locally / in Vercel).
 * Callers should handle the null case so the app degrades gracefully instead
 * of crashing when unconfigured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  if (!supabaseUrl || !supabaseKey) return null;

  cachedClient = createBrowserClient(supabaseUrl, supabaseKey);
  return cachedClient;
}

/** True when the Supabase environment variables are present. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

// Backwards-compatible alias for the previous export name.
export const createBrowserSupabaseClient = getSupabaseClient;