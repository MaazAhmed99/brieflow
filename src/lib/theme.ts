// Light / dark / system theme, stored per visitor in localStorage. The root
// layout inlines `themeScript` in <head> so the right theme applies before the
// first paint (no flash); the useTheme hook reads and changes it afterwards.

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "brieflow-theme";
export const THEME_CHANGE_EVENT = "brieflow-theme-change";

export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system"; // storage can be blocked (private mode, strict settings)
  }
}

export function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
