/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Landing Page — ZonaVetsa
   - Navbar: sticky, icon pill, hamburger mobile drawer
   - Hero: text-4xl mobile / text-6xl desktop, 2 CTA sejajar
   - Insight: banner tipis 1 baris di bawah hero
   - Stats: skeleton loader + icon per card
   - Jurusan: grid 2 kolom mobile / 3 desktop + warna unik
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { getDailyRotatingCopy } from "@/lib/daily-copy";
import {
  BookMarked,
  BookOpen,
  Briefcase,
  ChevronRight,
  Cpu,
  GraduationCap,
  House,
  Lightbulb,
  LogIn,
  Menu,
  MonitorPlay,
  Network,
  Tractor,
  UserCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";

// ━━ Icon map untuk jurusan ━━
const iconMap: Record<string, React.ElementType> = {
  MonitorPlay,
  Tractor,
  Wrench,
  Network,
  Cpu,
  BookOpen,
};

// ━━ Warna unik per jurusan (index-based fallback) ━━
const majorColors = [
  { bg: "bg-navy-50", icon: "bg-navy text-white", border: "border-navy-200" },
  { bg: "bg-teal-50", icon: "bg-teal text-white", border: "border-teal-200" },
  { bg: "bg-amber-50", icon: "bg-amber text-white", border: "border-amber-200" },
  { bg: "bg-purple-50", icon: "bg-purple-600 text-white", border: "border-purple-200" },
  { bg: "bg-rose-50", icon: "bg-rose-600 text-white", border: "border-rose-200" },
  { bg: "bg-sky-50", icon: "bg-sky-600 text-white", border: "border-sky-200" },
];

interface Major {
  id: string;
  name: string;
  description: string;
  icon: string;
  skills: string[];
}

interface SchoolStats {
  students?: number;
  guru?: number;
  karyawan?: number;
  jurusan?: number;
}

// ━━ Nav items landing dengan icon ━━
const navItems = [
  { href: "#beranda", label: "Beranda", icon: House },
  { href: "#insight", label: "Insight", icon: Lightbulb },
  { href: "#jurusan", label: "Jurusan", icon: GraduationCap },
  { href: "#login", label: "Login", icon: LogIn },
];

export default function HomePage() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [stats, setStats] = useState<SchoolStats>({});
  const [statsLoading, setStatsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Deteksi scroll untuk navbar shadow (rAF-throttled to avoid forced reflow)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 8);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Tutup mobile menu saat resize ke desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const [majorsRes, statsRes] = await Promise.all([
        supabase.from("majors").select("*").eq("is_active", true).order("name"),
        supabase.from("school_stats").select("*"),
      ]);

      if (majorsRes.data) {
        setMajors(
          majorsRes.data.map((item: any) => ({
            ...item,
            icon: item.icon || "BookOpen",
          }))
        );
      }

      if (statsRes.data) {
        const mapped = statsRes.data.reduce((acc: Record<string, number>, item: any) => {
          acc[item.key] = item.value;
          return acc;
        }, {});
        setStats(mapped);
      }
      setStatsLoading(false);
    };

    loadData();
  }, []);

  const statsCards = [
    { label: "Siswa Aktif", value: stats.students, icon: Users, color: "bg-navy text-white" },
    { label: "Guru", value: stats.guru, icon: UserCheck, color: "bg-teal text-white" },
    { label: "Karyawan", value: stats.karyawan, icon: Briefcase, color: "bg-amber text-white" },
    { label: "Jurusan", value: stats.jurusan ?? majors.length, icon: BookMarked, color: "bg-purple-600 text-white" },
  ];

  const dailyInsight = getDailyRotatingCopy("home");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: "SMK Veteran 1 Sukoharjo",
    url: "https://zonavetsanext.rnet.lt",
    description: "Portal digital pembelajaran, absensi, tugas, dan ujian untuk siswa SMK Veteran 1 Sukoharjo.",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sukoharjo",
      addressRegion: "Jawa Tengah",
      addressCountry: "ID",
    },
    sameAs: [
      "https://zonavetsanext.rnet.lt"
    ]
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface dark:bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          NAVBAR
          Sticky, glass, icon+label pill
          Mobile: hamburger drawer kiri
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <header
        className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur-md transition-shadow duration-200 dark:bg-slate-950/95 dark:border-slate-800 ${
          scrolled ? "shadow-card border-slate-200 dark:border-slate-800" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-3.5">
          <BrandMark />

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigasi utama">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="nav-underline flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-navy-50 hover:text-navy dark:text-slate-300 dark:hover:bg-navy/20 dark:hover:text-white"
                style={{ minHeight: 44 }}
              >
                <item.icon size={15} aria-hidden="true" />
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link href="/login/siswa" className="hidden sm:block">
              <Button
                variant="secondary"
                className="bg-teal-700 hover:bg-teal-800 text-white border-0"
                size="sm"
              >
                <LogIn size={15} />
                Login
              </Button>
            </Link>
            {/* Hamburger — mobile */}
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileMenuOpen}
              className="rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer overlay */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 top-[60px] z-30 bg-navy/40 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
            <nav
              className="absolute left-0 right-0 top-full z-40 border-b border-slate-200 bg-white dark:bg-slate-900 px-4 pb-4 pt-2 shadow-panel lg:hidden dark:bg-slate-950 dark:border-slate-800"
              aria-label="Navigasi mobile"
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-navy-50 hover:text-navy dark:text-slate-200 dark:hover:bg-navy/20"
                  style={{ minHeight: 44 }}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-50 text-navy dark:bg-navy/20 dark:text-navy-200">
                    <item.icon size={18} aria-hidden="true" />
                  </span>
                  {item.label}
                </a>
              ))}
              <Link href="/login/siswa" className="mt-2 block w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-teal-700 hover:bg-teal-800 text-white border-0">
                  <LogIn size={16} />
                  Login Siswa
                </Button>
              </Link>
            </nav>
          </>
        )}
      </header>

      <main className="overflow-x-hidden">
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            HERO SECTION
            headline 4xl mobile / 6xl desktop
            2 CTA button sejajar
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="beranda" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">

            {/* Kiri — Hero text */}
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 p-7 shadow-card sm:p-10 dark:bg-card dark:border-slate-800">
              <div className="section-badge w-fit">
                <GraduationCap size={13} />
                Portal Digital Sekolah
              </div>

              <h1 className="mt-5 text-balance text-4xl font-bold leading-tight text-navy dark:text-white sm:text-5xl lg:text-6xl">
                Ruang belajar digital untuk{" "}
                <span className="text-gradient">siswa dan guru</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                Materi, tugas, absensi, ujian, dan informasi kelas dalam satu portal sekolah yang rapi dan mudah diakses.
              </p>

              {/* ━━ 2 CTA sejajar ━━ */}
              <div className="mt-8 flex flex-row gap-3">
                <Link href="/login/siswa">
                  <Button
                    size="lg"
                    className="bg-navy hover:bg-navy-700 text-white border-0 px-6"
                  >
                    <LogIn size={18} aria-hidden="true" />
                    Login Siswa
                  </Button>
                </Link>
                <Link href="/login/guru">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-navy text-navy hover:bg-navy-50 px-6 dark:border-slate-600 dark:text-white dark:hover:bg-slate-800"
                  >
                    Login Guru
                  </Button>
                </Link>
              </div>

              {/* Features mini grid */}
              <div className="mt-9 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: BookOpen, title: "E-Learning", text: "Materi dan tugas digital dari guru langsung ke siswa." },
                  { icon: UserCheck, title: "QR Absensi", text: "Scan cepat absensi dengan kode QR real-time." },
                  { icon: BookMarked, title: "Ujian Online", text: "Ujian terjadwal dengan skor otomatis dan rekap nilai." },
                ].map((item) => (
                  <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal/10 text-teal dark:bg-teal/20">
                      <item.icon size={20} aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-navy dark:text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Kanan — Stats + Login card */}
            <div className="space-y-5">
              {/* Stat cards */}
              <div className="rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 p-5 shadow-card dark:bg-card dark:border-slate-800 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-400">
                      Data Sekolah
                    </p>
                    <h2 className="mt-1 text-xl font-bold text-navy dark:text-white">
                      Statistik Sekolah
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {statsCards.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                        <item.icon size={20} aria-hidden="true" />
                      </div>
                      {/* Skeleton bila data belum load */}
                      {statsLoading ? (
                        <div className="skeleton mt-3 h-8 w-3/4 rounded-lg" />
                      ) : (
                        <p className="mt-3 text-3xl font-bold text-navy dark:text-white">
                          {item.value ?? 0}
                        </p>
                      )}
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Login card */}
              <div id="login" className="rounded-3xl border border-slate-200/80 bg-white dark:bg-slate-900 p-5 shadow-card dark:bg-card dark:border-slate-800 sm:p-6">
                <div className="section-badge mb-4 w-fit">
                  <LogIn size={13} />
                  Portal Login
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { href: "/login/siswa", title: "Login Siswa", desc: "Belajar, tugas, ujian & absensi" },
                    { href: "/login/guru", title: "Login Guru", desc: "Kelola kelas, materi & QR scan" },
                  ].map((item) => (
                    <Link key={item.href} href={item.href} className="group">
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-teal hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-teal dark:hover:bg-teal/10">
                        <div>
                          <p className="font-bold text-navy dark:text-white">{item.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                        </div>
                        <ChevronRight
                          size={18}
                          className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-teal"
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            INSIGHT BANNER — tipis 1 baris
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="insight" className="border-y border-amber-200/60 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5">
          <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-hidden px-4 py-3 sm:px-6">
            <span className="flex shrink-0 h-7 w-7 items-center justify-center rounded-full bg-amber text-white">
              <Lightbulb size={14} aria-hidden="true" />
            </span>
            <p className="truncate text-sm font-medium text-amber-800 dark:text-amber-200">
              <strong>Insight:</strong> {dailyInsight}
            </p>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            JURUSAN — grid 2 kolom mobile / 3 desktop
            Warna unik per jurusan, icon besar
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section id="jurusan" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-8 text-center sm:text-left">
            <div className="section-badge mb-4 sm:w-fit">
              <GraduationCap size={13} />
              Program Keahlian
            </div>
            <h2 className="text-3xl font-bold text-navy dark:text-white sm:text-4xl lg:text-5xl">
              Jurusan Unggulan
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              SMK Veteran 1 Sukoharjo memiliki 6 program keahlian siap kerja dengan kurikulum berbasis teknologi dan industri terkini.
            </p>
          </div>

          {majors.length === 0 ? (
            /* Skeleton grid saat data belum tersedia */
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 dark:border-slate-800 dark:bg-card">
                  <div className="skeleton h-14 w-14 rounded-2xl" />
                  <div className="skeleton mt-4 h-5 w-3/4 rounded-lg" />
                  <div className="skeleton mt-2 h-4 w-full rounded-lg" />
                  <div className="skeleton mt-1.5 h-4 w-4/5 rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {majors.map((major, idx) => {
                const Icon = iconMap[major.icon] || BookOpen;
                const color = majorColors[idx % majorColors.length];
                return (
                  <article
                    key={major.id}
                    className={`group rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover ${color.bg} ${color.border} dark:bg-slate-900/60 dark:border-slate-800`}
                  >
                    {/* Icon besar */}
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${color.icon} shadow-card`}>
                      <Icon size={24} aria-hidden="true" />
                    </div>

                    <h3 className="mt-4 text-base font-bold leading-snug text-navy dark:text-white sm:text-lg">
                      {major.name}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">
                      {major.description}
                    </p>

                    {/* Skills badges */}
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {(major.skills || []).slice(0, 3).map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ━━ Footer minimal ━━ */}
      <footer className="border-t border-slate-200 bg-white dark:bg-slate-900 py-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <BrandMark />
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-xs text-slate-500 dark:text-slate-400">
            <p>© 2026 SMK Veteran 1 Sukoharjo. Portal Digital Resmi.</p>
            <span className="hidden sm:inline">•</span>
            <Link href="/changelog" className="hover:text-teal-700 dark:hover:text-teal-400 transition-colors">
              Catatan Rilis (Changelog)
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
