import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/database.types";

let client: SupabaseClient<Database> | null = null;

/** Lazy, so the build doesn't fail when the environment variables aren't set. */
export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen in .env.local",
    );
  }
  client = createClient<Database>(url, key);
  return client;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Trip IDs are UUIDs (hard to guess, since the link works without a password). */
export function isTripId(id: string | undefined): id is string {
  return !!id && UUID_RE.test(id);
}

/** Path to a section of a trip, e.g. tripPath(id, "shopping-list"). */
export function tripPath(tripId: string, section: string) {
  return `/trip/${tripId}/${section}`;
}
