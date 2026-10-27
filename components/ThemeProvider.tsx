"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Light / dark / system – the choice is stored in the browser ("huddle.theme"). */
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="huddle.theme"
      // next-themes sets the theme with an inline <script> before first paint.
      // React 19.2 logs an error for scripts rendered on the client, so mark it
      // as a data block there; the server-rendered copy has already run.
      scriptProps={
        typeof window === "undefined"
          ? undefined
          : { type: "application/json", suppressHydrationWarning: true }
      }
    >
      {children}
    </NextThemesProvider>
  );
}
