"use client";

import Link from "next/link";
import { ArrowLeft, LucideIcon, Network, Router, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  badge: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  accentClass?: string;
  children: React.ReactNode;
  bottomLink?: {
    href: string;
    label: string;
  };
  footerLinks?: Array<{ href: string; label: string }>;
}

export function AuthShell({
  badge,
  title,
  description,
  icon: Icon,
  accentClass,
  children,
  bottomLink,
  footerLinks,
}: AuthShellProps) {
  return (
    <div className="network-shell relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 py-8 sm:py-10">
      <div className="grid-overlay absolute inset-0 opacity-70" />
      <div className="network-node left-[8%] top-[14%] h-12 w-12 p-3 text-cyan-600">
        <Network />
      </div>
      <div className="network-node bottom-[12%] left-[12%] h-10 w-10 p-2.5 text-emerald-500" style={{ animationDelay: "1.3s" }}>
        <ShieldCheck />
      </div>
      <div className="network-node right-[9%] top-[22%] h-12 w-12 p-3 text-blue-500" style={{ animationDelay: "2s" }}>
        <Router />
      </div>

      <div className="safe-top absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="panel-surface network-shell p-6 sm:p-8">
          <BrandMark className="mb-8" compact />

          <div className="mb-8">
            <div className={cn("section-badge mb-4", accentClass)}>
              <Icon size={14} />
              {badge}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">{title}</h2>
            {description ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>
            ) : null}
          </div>

          {children}

          <div className="mt-8 space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
            {bottomLink ? (
              <Link href={bottomLink.href}>
                <Button variant="ghost" className="w-full justify-center">
                  <ArrowLeft size={16} />
                  {bottomLink.label}
                </Button>
              </Link>
            ) : null}

            {footerLinks?.length ? (
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {footerLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="hover:text-cyber">
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
