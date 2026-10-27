import { vi } from "vitest";

// Expected failures log through console.error; silence only those tests.
// Restored by vi.restoreAllMocks() in each file's afterEach
export function silenceErrorLog() {
  vi.spyOn(console, "error").mockImplementation(() => {});
}
