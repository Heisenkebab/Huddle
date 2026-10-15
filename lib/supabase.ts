import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Lazy, damit der Build ohne gesetzte Umgebungsvariablen nicht abbricht. */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen in .env.local",
    );
  }
  client = createClient(url, key);
  return client;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reise-IDs sind UUIDs (schwer zu erraten, da der Link ohne Passwort funktioniert). */
export function isTripId(id: string | undefined): id is string {
  return !!id && UUID_RE.test(id);
}

/** Pfad zu einem Bereich einer Reise, z. B. tripPath(id, "shopping-list"). */
export function tripPath(tripId: string, section: string) {
  return `/trip/${tripId}/${section}`;
}
