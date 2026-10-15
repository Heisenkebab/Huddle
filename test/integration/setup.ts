import { inject, vi } from "vitest";

// lib/supabase/server.ts reads these when createClient() is called
process.env.NEXT_PUBLIC_SUPABASE_URL = inject("supabaseUrl");
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = inject(
  "supabasePublishableKey",
);

// There is no request outside of Next, so act like an anonymous visitor
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: () => {},
  }),
}));
