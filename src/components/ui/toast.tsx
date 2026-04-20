"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

interface ToastState {
  toasts: ToastProps[];
}

let listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function notify() {
  listeners.forEach((listener) => listener({ ...memoryState }));
}

export function toast(
  message: string,
  type: "success" | "error" | "info" = "info",
  duration = 3000
) {
  const id = Math.random().toString(36).substr(2, 9);
  memoryState.toasts = [...memoryState.toasts, { id, message, type, duration }];
  notify();

  if (duration !== Infinity) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }
}

export function removeToast(id: string) {
  memoryState.toasts = memoryState.toasts.filter((t) => t.id !== id);
  notify();
}

export function Toaster() {
  const [state, setState] = useState<ToastState>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    notify(); // Sync initial state
    return () => {
      listeners = listeners.filter((l) => l !== setState);
    };
  }, []);

  if (state.toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-[100] flex max-w-[92vw] flex-col gap-2 pointer-events-none sm:max-w-sm">
      {state.toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-in slide-in-from-right duration-200",
            t.type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
            t.type === "error" && "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100",
            t.type === "info" && "border-cyan-200 bg-cyan-50 text-cyan-900 dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:text-cyan-100"
          )}
        >
          <span className="text-sm font-semibold">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="ml-2 rounded-full p-1 transition-colors hover:bg-slate-200/70 dark:hover:bg-slate-700/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
