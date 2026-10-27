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

/** Compact toggle (phone header): one button that cycles System → Light → Dark. */
export function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const mounted = useMounted();
  // Before mounting, the stored theme is unknown → server and browser render the same ("System")
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

/** Segmented toggle (laptop sidebar): System · Light · Dark, with a sliding thumb. */
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
      {/* Sliding thumb behind the active option */}
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

/** The theme is only known in the browser → render neutral until then (no hydration mismatch). */
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
