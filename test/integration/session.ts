import { createClient } from "@supabase/supabase-js";
import { inject } from "vitest";
import { Database } from "@/types/database.types";

let accessToken: string | null = null;

// Signs in so server actions run as this user and RLS applies to them
export async function signInAs(email: string, password: string) {
  const client = createClient(
    inject("supabaseUrl"),
    inject("supabasePublishableKey"),
    { auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  accessToken = data.session.access_token;
}

// Anonymous users can't sign in again later, so keep the returned token and
// switch back to them with useAccessToken()
export async function signInAnonymously() {
  const client = createClient(
    inject("supabaseUrl"),
    inject("supabasePublishableKey"),
    { auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.signInAnonymously();
  if (error) throw error;
  accessToken = data.session!.access_token;
  return { userId: data.user!.id, accessToken };
}

export function useAccessToken(token: string) {
  accessToken = token;
}

export function signOut() {
  accessToken = null;
}

// What lib/supabase/server.ts returns in tests: the publishable key plus the
// signed-in user's token, or an anonymous client after signOut()
export function createSessionClient() {
  return createClient<Database>(
    inject("supabaseUrl"),
    inject("supabasePublishableKey"),
    {
      auth: { persistSession: false },
      global: accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined,
    },
  );
}
