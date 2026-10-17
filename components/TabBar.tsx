"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTrip } from "@/lib/trip-context";
import { tripPath } from "@/lib/supabase";
import { NAV_ITEMS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Mobil: schwebende Tab-Leiste mit ganz runden Ecken. Ab Laptop-Breite ausgeblendet. */
export default function TabBar() {
  const pathname = usePathname();
  const { tripId } = useTrip();
  const t = useTranslations("nav");

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-3 bottom-[calc(12px+env(safe-area-inset-bottom))] z-20 mx-auto grid max-w-[456px] grid-cols-5 rounded-full border bg-card/95 p-1.5 shadow-[0_10px_30px_rgb(30_28_24/0.12)] backdrop-blur lg:hidden"
    >
      {NAV_ITEMS.map(({ section, Icon }) => {
        const href = tripPath(tripId, section);
        const active = pathname.startsWith(href);
        return (
          <Link
            key={section}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-full py-1.5 text-[10.5px] text-foreground/70 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "bg-secondary font-semibold text-primary"
                : "hover:bg-muted",
            )}
          >
            <Icon className="size-5" strokeWidth={1.8} />
            {t(section)}
          </Link>
        );
      })}
    </nav>
  );
}
