"use client";

import { useEffect } from "react";
import { applyTheme, readTheme } from "@/lib/theme";

// The inline theme script sets the theme before first paint. If React ever
// rebuilds <html> on the client (for example when a 404 renders), it drops the
// "dark" class, so this re-applies the stored theme after mount.
export function ThemeSync() {
  useEffect(() => {
    applyTheme(readTheme());
  }, []);
  return null;
}
