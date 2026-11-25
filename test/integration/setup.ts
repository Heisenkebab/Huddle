import { vi } from "vitest";

// Outside of Next there are no request cookies to read a session from, so
// server actions get a client for whoever signed in with signInAs()
vi.mock("@/lib/supabase/server", async () => {
  const { createServerSessionClient } = await import("./session");
  return { createClient: createServerSessionClient };
});
