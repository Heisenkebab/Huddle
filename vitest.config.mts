import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

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
