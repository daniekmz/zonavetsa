"use client";

import { create } from "zustand";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

/**
 * Theme store — always initializes as "light" on BOTH server and client
 * to avoid hydration mismatch. The real stored theme is applied in
 * initTheme() which runs inside useEffect (client-only).
 */
export const useThemeStore = create<ThemeState>((set) => ({
  theme: "light",
  setTheme: (theme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
    }
    set({ theme });
    applyTheme(theme);
  },
}));

export function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;

  const effectiveTheme = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;

  if (effectiveTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

/**
 * Initialize theme from localStorage — MUST be called inside useEffect
 * to ensure it only runs on the client after hydration is complete.
 */
export function initTheme() {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem("theme") as Theme | null;
  const theme = stored || "light";

  // Sync store with localStorage value
  useThemeStore.setState({ theme });
  applyTheme(theme);

  // Listen for system theme changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const currentTheme = localStorage.getItem("theme") as Theme;
    if (currentTheme === "system") {
      applyTheme("system");
    }
  });
}

export function getEffectiveTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const theme = useThemeStore.getState().theme;
  return theme === "system" ? getSystemTheme() : theme;
}