import { useCallback, useSyncExternalStore } from "react";
import {
  applyTheme,
  readTheme,
  type Theme,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

function subscribe(onChange: () => void) {
  const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");
  // When the OS switches light/dark, re-apply if the visitor follows the system.
  const onSystemChange = () => {
    applyTheme(readTheme());
    onChange();
  };
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", onSystemChange); // other tabs
  systemQuery.addEventListener("change", onSystemChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onSystemChange);
    systemQuery.removeEventListener("change", onSystemChange);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage blocked: the theme still applies for this page view.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  return { theme, setTheme };
}
