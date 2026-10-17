"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocale } from "@/app/_actions/set-locale";
import { locales, type Locale } from "@/i18n/config";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function useSwitchLocale() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const switchTo = (locale: Locale) =>
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  return { pending, switchTo };
}

export function LanguageToggleButton({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const { pending, switchTo } = useSwitchLocale();
  const next = locales[(locales.indexOf(locale) + 1) % locales.length];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={cn(
            "rounded-full bg-card text-[11px] font-bold",
            className,
          )}
          aria-label={t("switchTo", { language: t(next) })}
          disabled={pending}
          onClick={() => switchTo(next)}
        >
          {locale.toUpperCase()}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{t(locale)}</TooltipContent>
    </Tooltip>
  );
}

export function LanguageSegmented({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("language");
  const { pending, switchTo } = useSwitchLocale();
  const index = locales.indexOf(locale);

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn(
        "relative grid grid-cols-2 rounded-full border bg-muted p-1",
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-full bg-card shadow-sm transition-transform duration-300 ease-out dark:bg-[#5a5a5a]"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {locales.map((value) => {
        const active = value === locale;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            lang={value}
            aria-checked={active}
            disabled={pending}
            onClick={() => !active && switchTo(value)}
            className={cn(
              "relative z-10 flex items-center justify-center rounded-full px-3 py-2.5 text-[11.5px] whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active && "font-semibold text-foreground",
            )}
          >
            {t(value)}
          </button>
        );
      })}
    </div>
  );
}
