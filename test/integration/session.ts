import { createClient } from "@supabase/supabase-js";
import { inject } from "vitest";

import { Database } from "@/types/database.types";

let accessToken: string | null = null;
// Only set by the sign-in helpers; useAccessToken() leaves it empty
let refreshToken: string | null = null;

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
  refreshToken = data.session.refresh_token;
}

// Anonymous users can't sign in again later, so keep the returned token and
// switch back to them with useAccessToken(). The before-user-created hook
// only lets anonymous sign-ins through with a valid invite_id.
export async function signInAnonymously(inviteId?: string) {
  const client = createClient(
    inject("supabaseUrl"),
    inject("supabasePublishableKey"),
    { auth: { persistSession: false } },
  );
  const { data, error } = await client.auth.signInAnonymously(
    inviteId ? { options: { data: { invite_id: inviteId } } } : undefined,
  );
  if (error) throw error;
  accessToken = data.session!.access_token;
  refreshToken = data.session!.refresh_token;
  return { userId: data.user!.id, accessToken };
}

export function useAccessToken(token: string) {
  accessToken = token;
  refreshToken = null;
}

export function signOut() {
  accessToken = null;
  refreshToken = null;
}

// The publishable key plus the signed-in user's token, or an anonymous client
// after signOut()
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

// What lib/supabase/server.ts returns in tests. Server code also reads and
// starts sessions through supabase.auth (getClaims, signInAnonymously), so the
// signed-in user's session is set on the client instead of just a header
export async function createServerSessionClient() {
  if (!accessToken || !refreshToken) return createSessionClient();

  const client = createClient<Database>(
    inject("supabaseUrl"),
    inject("supabasePublishableKey"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await client.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  return client;
}
