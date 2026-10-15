import { defineConfig } from "vitest/config";

// Integration tests run against the local Supabase stack (`npx supabase start`)
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["**/*.int.test.ts"],
    exclude: ["**/node_modules/**", "e2e/**"],
    globalSetup: ["./test/integration/global-setup.ts"],
    setupFiles: ["./test/integration/setup.ts"],
    // Test files share one database, so run them one after another
    fileParallelism: false,
  },
});
