import { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session before a page renders. Server Components
 * can't write cookies (see lib/supabase/server.ts); without the proxy the
 * token would eventually expire and getTripAccess would sign users out.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Refreshed cookies for rendering this request …
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          // … and for the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Responses that set session cookies must not be cached
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Refreshes an expired token; don't run anything in between
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) await devSignIn(supabase);

  return response;
}

/**
 * Development only: there is no way to sign in yet, so sign in as the user
 * from DEV_SIGN_IN_EMAIL / DEV_SIGN_IN_PASSWORD (e.g. a user from seed.sql).
 * Does nothing in production or when the variables aren't set.
 */
async function devSignIn(supabase: SupabaseClient<Database>) {
  const email = process.env.DEV_SIGN_IN_EMAIL;
  const password = process.env.DEV_SIGN_IN_PASSWORD;
  if (process.env.NODE_ENV !== "development" || !email || !password) return;

  // Writes the session cookies through setAll above
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) console.error("devSignIn failed:", error.message);
}

export const config = {
  // Skip static files and images
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
