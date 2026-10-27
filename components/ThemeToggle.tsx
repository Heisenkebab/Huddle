"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MODES = [
  { value: "system", Icon: Monitor },
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
] as const;

/** Kompakter Umschalter (Handy-Kopfzeile): ein Button, schaltet System → Hell → Dunkel durch. */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const mounted = useMounted();
  // Vor dem Mounten ist das gespeicherte Theme unbekannt → Server und Browser rendern identisch ("System")
  const index = mounted
    ? Math.max(
        0,
        MODES.findIndex((m) => m.value === theme),
      )
    : 0;
  const current = MODES[index];
  const next = MODES[(index + 1) % MODES.length];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={cn("rounded-full bg-card", className)}
          aria-label={t("toggle", {
            current: t(current.value),
            next: t(next.value),
          })}
          onClick={() => setTheme(next.value)}
        >
          <current.Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>
        {t("current", { current: t(current.value) })}
      </TooltipContent>
    </Tooltip>
  );
}

/** Segment-Umschalter (Laptop-Sidebar): System · Hell · Dunkel, mit gleitendem Schalter. */
export function ThemeSegmented({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const mounted = useMounted();
  const index = mounted
    ? Math.max(
        0,
        MODES.findIndex((m) => m.value === theme),
      )
    : -1;

  return (
    <div
      role="radiogroup"
      aria-label={t("label")}
      className={cn(
        "relative grid grid-cols-3 rounded-full border bg-muted p-1",
        className,
      )}
    >
      {/* Gleitender Schalter hinter dem aktiven Eintrag */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1 bottom-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-full bg-card shadow-sm transition-transform duration-300 ease-out dark:bg-[#5a5a5a]",
          index < 0 && "opacity-0",
        )}
        style={{ transform: `translateX(${Math.max(index, 0) * 100}%)` }}
      />
      {MODES.map(({ value, Icon }, i) => {
        const active = i === index;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[11.5px] whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active && "font-semibold text-foreground",
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {t(value)}
          </button>
        );
      })}
    </div>
  );
}

/** Theme ist erst im Browser bekannt → bis dahin neutral rendern (kein Hydration-Mismatch). */
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

function subscribeNoop() {
  return () => {};
}
