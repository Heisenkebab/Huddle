import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    // Playwright specs live in e2e/ and DB tests run via vitest.integration.config.mts
    exclude: ["**/node_modules/**", "e2e/**", "**/*.int.test.ts"],
  },
});
