"use client"; // Error boundaries must be Client Components

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

/**
 * Unexpected errors while rendering the list (e.g. getTripAccess throws on a
 * DB error). The message is generic in production; digest matches the server log.
 */
export default function ShoppingListError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("shoppingList");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <PageHeader title={t("title")} />
      <div
        role="alert"
        className="flex flex-col items-center gap-3 py-6 text-center text-sm text-muted-foreground"
      >
        <p>{t("loadFailed")}</p>
        <Button
          variant="outline"
          onClick={retry}
          className="rounded-full bg-card"
        >
          <RotateCw />
          {t("retry")}
        </Button>
      </div>
    </>
  );
}
