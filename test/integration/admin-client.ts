import { createClient } from "@supabase/supabase-js";
import { inject } from "vitest";
import { Database } from "@/types/database.types";

// Secret-key client for seeding and cleaning up test data. Bypasses RLS,
// so only use it for test setup, never to call the code under test.
export function createAdminClient() {
  return createClient<Database>(
    inject("supabaseUrl"),
    inject("supabaseSecretKey"),
    {
      auth: { persistSession: false },
    },
  );
}
