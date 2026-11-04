import { execSync } from "node:child_process";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    supabaseUrl: string;
    supabasePublishableKey: string;
    supabaseSecretKey: string;
  }
}

// Reads the URL and keys of the running local Supabase stack, so the same
// tests work on every machine and in CI without any .env file
export default function setup(project: TestProject) {
  let output: string;
  try {
    output = execSync("npx supabase status -o env", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(
      "Local Supabase is not running. Start it with `npx supabase start`.",
    );
  }

  const env = Object.fromEntries(
    output
      .split("\n")
      .map((line) => line.match(/^(\w+)="(.*)"$/))
      .filter((match) => match !== null)
      .map(([, key, value]) => [key, value]),
  );

  project.provide("supabaseUrl", env.API_URL);
  project.provide("supabasePublishableKey", env.PUBLISHABLE_KEY);
  project.provide("supabaseSecretKey", env.SECRET_KEY);
}
