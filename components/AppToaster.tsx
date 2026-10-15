"use client";

import { Toaster } from "@/components/ui/sonner";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";

/** Mobil über der schwebenden Tab-Leiste, am Laptop unten mittig. */
export default function AppToaster() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const bottom = isDesktop ? 28 : 164; // mobil über „+ Artikel“ und Tab-Leiste
  return (
    <Toaster
      position="bottom-center"
      offset={{ bottom }}
      mobileOffset={{ bottom }}
      toastOptions={{ classNames: { toast: "!rounded-2xl" } }}
    />
  );
}
