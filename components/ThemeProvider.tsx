"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Hell / Dunkel / System – Auswahl wird im Browser gespeichert ("huddle.theme"). */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="huddle.theme"
    >
      {children}
    </NextThemesProvider>
  );
}
