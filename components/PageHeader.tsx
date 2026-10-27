"use client";

import { useTrip } from "@/lib/trip-context";
import { LanguageToggleButton } from "./LanguageSwitcher";
import { ThemeToggleButton } from "./ThemeToggle";

export default function PageHeader({ title }: { title: string }) {
  const { trip } = useTrip();

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
          <LanguageToggleButton className="lg:hidden" />
          <ThemeToggleButton className="lg:hidden" />
        </div>
      </div>
    </header>
  );
}
