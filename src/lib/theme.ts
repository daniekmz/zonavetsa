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

export const useThemeStore = create<ThemeState>((set) => {
  // Initialize from localStorage or default to light
  let initialTheme: Theme = "light";
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("theme") as Theme;
    initialTheme = stored || "light";
  }

  return {
    theme: initialTheme,
    setTheme: (theme: Theme) => {
      localStorage.setItem("theme", theme);
      set({ theme });
      applyTheme(theme);
    },
  };
});

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

export function initTheme() {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem("theme") as Theme | null;
  const theme = stored || "light";
  applyTheme(theme);

  // Listen for system theme changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
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