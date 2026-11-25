import type { BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";

import { env, TEST_PASSWORD, TestUser } from "./admin";

/**
 * Starts the browser signed in as `user`. There is no login page yet, so this
 * signs in with @supabase/ssr in Node and copies the session cookies it writes
 * (name, chunking and encoding exactly as the app expects) into the context.
 */
export async function signInAs(
  context: BrowserContext,
  user: TestUser,
  baseURL: string,
) {
  const cookies: { name: string; value: string }[] = [];

  const supabase = createServerClient(env.API_URL, env.PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookies,
      setAll: (toSet) => {
        for (const { name, value } of toSet) {
          const existing = cookies.findIndex((c) => c.name === name);
          if (existing >= 0) cookies.splice(existing, 1);
          if (value) cookies.push({ name, value });
        }
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: TEST_PASSWORD,
  });
  if (error) throw error;
  if (cookies.length === 0) throw new Error("Sign-in wrote no session cookie");

  await context.addCookies(
    cookies.map(({ name, value }) => ({ name, value, url: baseURL })),
  );
}
