"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Link2 } from "lucide-react";
import { useTrip } from "@/lib/trip-context";
import { tripPath } from "@/lib/supabase";
import { NAV_ITEMS } from "@/lib/nav";
import { formatTripDates } from "@/lib/format";
import { copyText } from "@/lib/clipboard";
import { showInfoToast } from "@/lib/toasts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import PersonAvatar from "./PersonAvatar";
import { ThemeSegmented } from "./ThemeToggle";

/** Laptop: Navigation links (Entwurf LE1). Mobil ausgeblendet. */
export default function Sidebar() {
  const pathname = usePathname();
  const { tripId, trip, people } = useTrip();

  const tripName = trip?.name || "Reise";
  const dates = trip ? formatTripDates(trip.start_date, trip.end_date) : "";
  const meta = [dates, `${people.length} ${people.length === 1 ? "Person" : "Personen"}`].filter(Boolean).join(" · ");

  const copyInvite = async () => {
    const ok = await copyText(`${window.location.origin}/trip/${tripId}`);
    showInfoToast(ok ? "Einladungslink kopiert" : "Kopieren nicht möglich");
  };

  return (
    <aside className="sticky top-0 hidden h-dvh w-(--sidebar-width) shrink-0 flex-col border-r bg-card/70 dark:bg-[#1f1f1f] px-4 py-6 lg:flex">
      <div className="mb-6 flex items-center gap-3 px-1">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
          {tripName.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-sm leading-tight font-semibold">{tripName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
        </div>
      </div>

      <nav aria-label="Hauptnavigation" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ section, label, Icon }) => {
          const href = tripPath(tripId, section);
          const active = pathname.startsWith(href);
          return (
            <Link
              key={section}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-foreground/80 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active ? "bg-secondary font-semibold text-secondary-foreground" : "hover:bg-muted",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <p className="mb-2 px-1 text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">
          Mitreisende · {people.length}
        </p>
        <ul className="mb-6 flex max-h-[40dvh] flex-col gap-1 overflow-y-auto">
          {people.map((p) => (
            <li key={p.key} className="flex items-center gap-2.5 rounded-xl px-1 py-1 text-sm">
              <PersonAvatar name={p.name} color={p.color} size={22} />
              <span className="flex-1 truncate">
                {p.name}
                {p.isMe && <span className="text-muted-foreground"> (du)</span>}
              </span>
              <span
                className={cn("size-1.5 rounded-full", p.online ? "bg-emerald-500" : "bg-border")}
                aria-label={p.online ? "online" : "offline"}
              />
            </li>
          ))}
        </ul>
        <p className="mb-2 px-1 text-[11px] font-bold tracking-[0.08em] text-muted-foreground uppercase">Darstellung</p>
        <ThemeSegmented className="mb-5" />
        <Button
          variant="outline"
          onClick={copyInvite}
          className="w-full rounded-full bg-card font-semibold text-primary hover:text-primary"
        >
          <Link2 />
          Einladungslink kopieren
        </Button>
      </div>
    </aside>
  );
}
