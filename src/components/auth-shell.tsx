/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AuthShell — Wrapper halaman login
   Layout: 2-kolom desktop (ilustrasi kiri + form kanan)
   Mobile: single column, clean minimal
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
"use client";

import Link from "next/link";
import { ArrowLeft, LucideIcon } from "lucide-react";
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
    <div className="relative flex min-h-[100dvh] overflow-hidden bg-surface dark:bg-background">
      {/* ━━ Theme toggle — pojok kanan atas ━━ */}
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      {/* ━━ Panel kiri — branding (desktop only) ━━ */}
      <div className="hidden flex-col justify-between bg-navy p-10 lg:flex lg:w-2/5 xl:w-[45%]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <img
                src="/gambar/favicon-32x32.png"
                alt="ZonaVetsa"
                className="h-6 w-6 object-contain"
              />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              ZONA<span className="text-teal-300">VETSA</span>
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-navy-200">
            SMK Veteran 1 Sukoharjo
          </p>
        </div>

        {/* Ilustrasi / Hero text tengah */}
        <div className="space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal/20 text-teal-300">
            <Icon size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white xl:text-4xl">
              Portal Digital
              <br />
              <span className="text-teal-300">SMK Veteran 1</span>
            </h2>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-200">
              Satu platform untuk materi, tugas, ujian, absensi QR, dan informasi kelas. Dirancang untuk siswa dan guru SMK Veteran 1 Sukoharjo.
            </p>
          </div>
        </div>

        {/* Footer quote */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm italic leading-relaxed text-navy-100">
            "Belajar adalah investasi terbaik yang bisa kamu lakukan untuk masa depanmu."
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-teal-400">
            — ZonaVetsa
          </p>
        </div>
      </div>

      {/* ━━ Panel kanan — form ━━ */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          {/* Mobile brand mark */}
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>

          {/* Card form */}
          <div className="rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-panel sm:p-8 dark:bg-card dark:border-slate-800">
            {/* Badge */}
            <div className={cn("section-badge mb-5 w-fit", accentClass)}>
              <Icon size={13} />
              {badge}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-navy dark:text-white sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
              </p>
            ) : null}

            {/* Form content */}
            <div className="mt-7">{children}</div>

            {/* Footer links */}
            <div className="mt-8 space-y-4 border-t border-slate-100 pt-6 dark:border-slate-800">
              {bottomLink ? (
                <Link href={bottomLink.href}>
                  <Button variant="ghost" className="w-full justify-center text-slate-500 dark:text-slate-400 hover:text-navy dark:hover:text-white">
                    <ArrowLeft size={15} />
                    {bottomLink.label}
                  </Button>
                </Link>
              ) : null}

              {footerLinks?.length ? (
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 dark:text-slate-400">
                  {footerLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="transition-colors hover:text-teal dark:hover:text-teal-300"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
