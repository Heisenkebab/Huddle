"use client";

import { Toaster } from "@/components/ui/sonner";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/use-media-query";

/** Mobile: above the floating tab bar. Laptop: bottom center. */
export default function AppToaster() {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const bottom = isDesktop ? 28 : 164; // mobile: above "+ Item" and the tab bar
  return (
    <Toaster
      position="bottom-center"
      offset={{ bottom }}
      mobileOffset={{ bottom }}
      toastOptions={{ classNames: { toast: "!rounded-2xl" } }}
    />
  );
}
