import { House } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** A page that's missing or unavailable: the message, and a way back home. */
export default function ErrorNotice({
  text,
  className,
}: {
  text?: string;
  className?: string;
}) {
  const t = useTranslations("errors");
  return (
    <section
      className={cn(
        "flex flex-col items-start gap-6 rounded-3xl border bg-card px-6 py-8 sm:px-8",
        className,
      )}
    >
      <p
        role="status"
        className="text-xl leading-snug font-semibold text-balance sm:text-2xl"
      >
        {text ?? t("featureUnavailable")}
      </p>
      <Button
        asChild
        className="h-12 w-full rounded-2xl px-5 text-base font-semibold transition-[background-color,transform] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
      >
        <Link href="/">
          <House aria-hidden="true" />
          {t("backHome")}
        </Link>
      </Button>
    </section>
  );
}
