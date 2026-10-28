"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the page every 2 seconds (for up to 30 seconds) until the payment shows up. */
export function RefreshWhilePending() {
  const router = useRouter();
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      router.refresh();
      if (tries >= 15) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [router]);
  return null;
}
