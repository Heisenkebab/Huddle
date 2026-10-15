"use client";

import { useTrip } from "@/lib/trip-context";
import { Badge } from "@/components/ui/badge";
import PersonAvatar from "./PersonAvatar";
import { ThemeToggleButton } from "./ThemeToggle";

export default function PageHeader({ title }: { title: string }) {
  const { trip, people, onlineCount } = useTrip();
  const online = people.filter((p) => p.online).slice(0, 4);

  return (
    <header className="mb-[18px] lg:mb-7">
      <p className="mb-1 min-h-[1lh] text-[13px] text-foreground/70">
        {trip?.name}
      </p>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight lg:text-[34px]">
          {title}
        </h1>
        <div className="flex items-center gap-2.5">
          <div className="hidden -space-x-1.5 lg:flex">
            {online.map((p) => (
              <PersonAvatar
                key={p.key}
                name={p.name}
                color={p.color}
                size={26}
                title={p.isMe ? `${p.name} (du)` : p.name}
                className="ring-2 ring-background"
              />
            ))}
          </div>
          <Badge
            variant="secondary"
            className="gap-1.5 rounded-full px-2.5 py-1 font-semibold text-primary"
          >
            <span className="size-1.5 rounded-full bg-primary" />
            {onlineCount} online
          </Badge>
          <ThemeToggleButton className="lg:hidden" />
        </div>
      </div>
    </header>
  );
}
