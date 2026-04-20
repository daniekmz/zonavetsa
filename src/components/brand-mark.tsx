"use client";

import { Cpu, Network, ShieldCheck } from "lucide-react";
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
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200 bg-primary text-white shadow-soft-signal dark:border-cyan-500/30">
        <img src="/gambar/favicon-32x32.png" alt="ZonaVetsa" className="relative z-10 h-8 w-8 object-contain" />
        <span className="network-node left-[-8px] top-[-8px] h-5 w-5 p-1 text-cyan-600">
          <Cpu size={10} />
        </span>
        <span
          className="network-node bottom-[-10px] right-[-8px] h-5 w-5 p-1 text-emerald-500"
          style={{ animationDelay: "1.4s" }}
        >
          <Network size={10} />
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="font-primary text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            ZONA<span className="text-gradient-signal">VETSA</span>
          </h1>
          {!compact && (
            <span className="chip-signal px-2 py-1 text-[10px]">
              <ShieldCheck size={12} />
              Network Mode
            </span>
          )}
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          {subtitle || "SMK Veteran 1 Sukoharjo"}
        </p>
      </div>
    </div>
  );
}
