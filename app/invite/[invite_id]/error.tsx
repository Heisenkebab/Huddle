"use client";

// Error boundaries must be Client Components
import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * The invite couldn't be loaded (e.g. DB unreachable). Unlike not-found.tsx
 * this doesn't claim the link is invalid; retry fetches the page again.
 */
export default function InviteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center px-4 py-10">
      <h1 className="mb-5 text-[30px] font-extrabold tracking-tight">Huddle</h1>
      <div
        role="alert"
        className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground"
      >
        <p>{t("trip.loadFailed")}</p>
        <Button
          variant="outline"
          onClick={retry}
          className="rounded-full bg-card"
        >
          <RotateCw />
          {t("invite.retry")}
        </Button>
      </div>
    </main>
  );
}
