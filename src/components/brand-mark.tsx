/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   BrandMark — Logo ZonaVetsa
   Design: Navy primary, Inter font, no network decorations
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
"use client";

import { cn } from "@/lib/utils";

export function BrandMark({
  subtitle,
  compact = false,
  className,
}: {
  subtitle?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Logo mark — navy bg + school favicon */}
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy shadow-navy sm:h-11 sm:w-11 sm:rounded-2xl">
        <img
          src="/gambar/favicon-32x32.png"
          alt="ZonaVetsa"
          className="h-6 w-6 object-contain sm:h-7 sm:w-7"
        />
      </div>

      {/* Wordmark */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[1.0625rem] font-bold tracking-tight text-navy dark:text-white sm:text-lg">
            ZONA<span className="text-teal-700 dark:text-teal-400">VETSA</span>
          </span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 sm:tracking-[0.22em]">
          {subtitle || "SMK Veteran 1 Sukoharjo"}
        </p>
      </div>
    </div>
  );
}
