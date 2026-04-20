"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useThemeStore, type Theme, initTheme, applyTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initTheme();
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={cn("glass-tech flex items-center gap-1 rounded-xl p-1", className)}>
        <div className="h-8 w-8 rounded-lg bg-slate-200/80 animate-pulse dark:bg-slate-700/80" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "glass-tech flex items-center gap-1 rounded-xl p-1",
        className
      )}
    >
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value;

        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={cn(
              "relative flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5",
              "text-sm font-medium transition-colors duration-200",
              isActive
                ? "bg-cyan-50 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-200"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
            title={option.label}
          >
            <span className="relative z-10">
              <Icon size={15} />
            </span>
            <span className="relative z-10 hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemeToggleDropdown({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    initTheme();
    setMounted(true);
  }, []);

  const activeOption = themeOptions.find((o) => o.value === theme);
  const ActiveIcon = activeOption?.icon || Sun;

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          "bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm",
          className
        )}
      >
        <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          "bg-white/50 dark:bg-gray-900/50",
          "backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50",
          "hover:bg-white/70 dark:hover:bg-gray-900/70",
          "transition-all duration-200"
        )}
      >
        <ActiveIcon size={18} />
        <span className="text-sm font-medium">{activeOption?.label}</span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 py-2 rounded-lg",
            "bg-white/90 dark:bg-gray-900/90 backdrop-blur-md",
            "border border-gray-200/50 dark:border-gray-700/50",
            "shadow-lg shadow-gray-200/20 dark:shadow-gray-900/40",
            "z-50 min-w-[140px]"
          )}
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;

            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-2",
                  "text-sm transition-colors",
                  isActive
                    ? "text-primary dark:text-primary-foreground bg-primary/5 dark:bg-primary/10"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Icon size={16} />
                <span>{option.label}</span>
                {isActive && <Check size={14} className="ml-auto" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
