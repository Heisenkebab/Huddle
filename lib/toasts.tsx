"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";

/** Custom-Toasts sind in Sonner nur so breit wie ihr Inhalt → volle Breite, damit die Pille mittig sitzt. */
const FULL_WIDTH =
  "!w-full max-[601px]:!w-[calc(100%-var(--mobile-offset-left)*2)]";

/** Ganz runde Pille unten mittig – hell im Light Mode, dunkle Karte im Dark Mode. */
function Pill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex w-full flex-1 justify-center">
      <div className="flex items-center gap-3 rounded-full border bg-card py-2.5 pr-5 pl-4 text-sm text-card-foreground shadow-[0_10px_30px_rgb(30_28_24/0.14)] dark:shadow-[0_10px_30px_rgb(0_0_0/0.5)]">
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
        {children}
      </div>
    </div>
  );
}

export function showUndoToast(message: string, onUndo: () => void) {
  toast.custom(
    (id) => (
      <Pill icon={<Trash2 />}>
        <span>{message}</span>
        <button
          type="button"
          className="font-semibold text-primary hover:underline"
          onClick={() => {
            toast.dismiss(id);
            onUndo();
          }}
        >
          Rückgängig
        </button>
      </Pill>
    ),
    { duration: 5000, className: FULL_WIDTH },
  );
}

export function showInfoToast(message: string, icon: ReactNode = <Check />) {
  toast.custom(
    () => (
      <Pill icon={icon}>
        <span>{message}</span>
      </Pill>
    ),
    { className: FULL_WIDTH },
  );
}
