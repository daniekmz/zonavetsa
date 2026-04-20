"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { getDailyRotatingCopy } from "@/lib/daily-copy";
import {
  Activity,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Cpu,
  GraduationCap,
  MonitorPlay,
  Network,
  ShieldCheck,
  Tractor,
  Users,
  Wifi,
  Wrench,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  MonitorPlay,
  Tractor,
  Wrench,
  Network,
  Cpu,
  BookOpen,
};

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

export default function HomePage() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [stats, setStats] = useState<SchoolStats>({});

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
    };

    loadData();
  }, []);

  const statsCards = [
    { label: "Siswa Aktif", value: stats.students || 0, icon: Users },
    { label: "Guru", value: stats.guru || 0, icon: GraduationCap },
    { label: "Karyawan", value: stats.karyawan || 0, icon: ShieldCheck },
    { label: "Jurusan", value: stats.jurusan || majors.length || 0, icon: Network },
  ];
  const dailyInsight = getDailyRotatingCopy("home");

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="network-node hidden left-[6%] top-[12%] h-14 w-14 p-4 text-cyber md:block">
        <Wifi />
      </div>
      <div
        className="network-node hidden bottom-[10%] left-[8%] h-16 w-16 p-4 text-secondary md:block"
        style={{ animationDelay: "1.3s" }}
      >
        <Cpu />
      </div>
      <div
        className="network-node hidden right-[7%] top-[17%] h-16 w-16 p-4 text-primary-light md:block"
        style={{ animationDelay: "2.1s" }}
      >
        <BrainCircuit />
      </div>

      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
        <div className="glass-tech mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-[24px] px-3 py-3 sm:rounded-[28px] sm:px-6 sm:py-4">
          <BrandMark />

          <nav className="hidden items-center gap-2 lg:flex">
            {[ 
              { href: "#beranda", label: "Beranda" },
              { href: "#insight", label: "Insight" },
              { href: "#jurusan", label: "Jurusan" },
              { href: "#login", label: "Login" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-2xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-primary dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link href="/login/siswa" className="hidden sm:block">
              <Button variant="secondary">
                Login Siswa
                <ArrowRight size={16} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="px-3 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6">
        <section id="beranda" className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          <div className="panel-surface network-shell p-5 sm:p-8 lg:p-10">
            <div className="section-badge">
              <Network size={14} />
              Portal Sekolah Terhubung
            </div>
            <h1 className="mt-4 max-w-4xl text-balance text-3xl font-bold leading-tight text-slate-900 sm:mt-5 sm:text-5xl sm:leading-[0.95] lg:text-6xl dark:text-white">
              Ruang belajar digital untuk{" "}
              <span className="text-gradient-network">siswa dan guru yang lebih terhubung</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8 dark:text-slate-300">
              ZonaVetsa membantu kegiatan pembelajaran menjadi lebih rapi dan mudah diakses melalui
              materi, tugas, absensi, ujian, dan informasi kelas dalam satu portal sekolah.
            </p>

            <div className="mt-6 grid gap-3 sm:mt-8 sm:flex sm:flex-wrap">
              <Link href="/login/siswa" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Login Siswa
                  <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/login/guru" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Login Guru
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-3">
              {[
                { icon: Wifi, title: "Realtime Signal", text: "Notifikasi dan sesi penting langsung sinkron tanpa terasa kaku." },
                { icon: ShieldCheck, title: "Friendly Control", text: "Hierarki visual lebih jelas untuk siswa, guru, dan admin." },
                { icon: Activity, title: "Modern Motion", text: "Animasi ringan yang terasa hidup tanpa mengganggu fokus." },
              ].map((item) => (
                <div key={item.title} className="card-tech p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 text-primary dark:from-sky-500/20 dark:to-cyan-500/20 dark:text-cyan-200">
                    <item.icon size={20} />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel-surface p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">
                    Education Grid
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">Statistik Sekolah</h2>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyber text-white shadow-soft-signal sm:h-14 sm:w-14 sm:rounded-3xl">
                  <BrainCircuit size={24} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                {statsCards.map((item) => (
                  <div key={item.label} className="card-tech p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-primary dark:bg-slate-900 dark:text-sky-300">
                        <item.icon size={18} />
                      </div>
                      <span className="chip-signal px-2.5 py-1">{item.label}</span>
                    </div>
                    <p className="mt-4 text-3xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="login" className="panel-surface p-5 sm:p-6">
              <p className="section-badge w-fit">
                <ShieldCheck size={14} />
                Portal Login
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {[
                  { href: "/login/siswa", title: "Login Siswa", desc: "Masuk ke dashboard belajar, tugas, absensi, dan ujian." },
                  { href: "/login/guru", title: "Login Guru", desc: "Kelola kelas, absensi QR, ujian, tugas, dan file." },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="group">
                    <div className="rounded-[24px] border border-slate-200/80 bg-white/80 px-5 py-5 transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/70 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-sky-700 dark:hover:bg-slate-900">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                        </div>
                        <ArrowRight className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary" size={18} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="insight" className="mx-auto mt-5 max-w-7xl sm:mt-8">
          <div className="panel-surface p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-badge">
                  <Activity size={14} />
                  Insight Hari Ini
                </div>
                <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
                  Kalimat harian tentang pembelajaran dan teknologi
                </h2>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-slate-200/80 bg-[linear-gradient(135deg,_rgba(255,255,255,0.95),_rgba(237,244,255,0.9))] p-5 shadow-sm sm:mt-8 sm:rounded-[30px] sm:p-8 dark:border-slate-800 dark:bg-[linear-gradient(135deg,_rgba(15,23,42,0.92),_rgba(30,41,59,0.88))]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyber text-white shadow-soft-signal sm:h-14 sm:w-14 sm:rounded-3xl">
                  <BrainCircuit size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600 dark:text-sky-300">
                    Pesan Harian
                  </p>
                  <blockquote className="mt-3 max-w-4xl text-xl font-semibold leading-relaxed text-slate-900 sm:text-2xl lg:text-3xl dark:text-white">
                    "{dailyInsight}"
                  </blockquote>
                  <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    Pesan ini berganti otomatis setiap hari untuk menghadirkan nuansa belajar yang segar
                    di halaman utama.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="jurusan" className="mx-auto mt-5 max-w-7xl sm:mt-8">
          <div className="panel-surface p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="section-badge">
                  <BookOpen size={14} />
                  Program Keahlian
                </div>
                <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl dark:text-white">
                  Jurusan tampil lebih jelas, lebih modern, dan lebih tech-forward
                </h2>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Kartu jurusan sekarang membawa identitas visual yang lebih kuat, cocok untuk sekolah vokasi
                dengan karakter teknologi, produksi, dan sistem jaringan.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {majors.map((major) => {
                const Icon = iconMap[major.icon] || BookOpen;
                return (
                  <article key={major.id} className="card-tech p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-cyber text-white shadow-soft-signal">
                        <Icon size={24} />
                      </div>
                      <span className="chip-signal">{major.skills?.length || 0} skill</span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold text-slate-900 dark:text-white">{major.name}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{major.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {(major.skills || []).slice(0, 3).map((skill) => (
                        <span key={skill} className="chip-signal">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
