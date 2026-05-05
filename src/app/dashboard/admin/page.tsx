/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Dashboard Admin — Overview
   Grid 4 stat card + icon baru, grafik aktivitas, tabel user terbaru
   Icon: Users (guru), UserCheck (siswa), Briefcase (kelas), BookMarked (ujian)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart2,
  BookMarked,
  Briefcase,
  ChevronRight,
  Heart,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ImportGuruModal } from "@/components/import-guru-modal";

interface RecentUser {
  id: string;
  name: string;
  role: "guru" | "siswa";
  meta: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    teachers: 0,
    students: 0,
    classes: 0,
    exams: 0,
    portfolios: 0,
    portfolioLikes: 0,
    portfolioComments: 0,
    totalStudentPoints: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportGuruOpen, setIsImportGuruOpen] = useState(false);

  useEffect(() => {
    void loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [
      teachersRes,
      studentsRes,
      classesRes,
      examsRes,
      portfoliosRes,
      likesRes,
      commentsRes,
      studentsPointRes,
      recentTeachersRes,
      recentStudentsRes,
    ] = await Promise.all([
      supabase.from("teachers").select("id", { count: "exact", head: true }),
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("classes").select("id", { count: "exact", head: true }),
      supabase.from("exams").select("id", { count: "exact", head: true }),
      supabase.from("portofolios").select("id", { count: "exact", head: true }),
      supabase.from("portfolio_likes").select("id", { count: "exact", head: true }),
      supabase.from("portfolio_comments").select("id", { count: "exact", head: true }),
      supabase.from("students").select("points"),
      supabase.from("teachers").select("id, name, subject, created_at").order("created_at", { ascending: false }).limit(3),
      supabase.from("students").select("id, name, nis, created_at").order("created_at", { ascending: false }).limit(3),
    ]);

    const totalStudentPoints = ((studentsPointRes.data || []) as { points?: number | null }[]).reduce(
      (sum, student) => sum + (student.points || 0),
      0
    );

    setStats({
      teachers: teachersRes.count || 0,
      students: studentsRes.count || 0,
      classes: classesRes.count || 0,
      exams: examsRes.count || 0,
      portfolios: portfoliosRes.count || 0,
      portfolioLikes: likesRes.count || 0,
      portfolioComments: commentsRes.count || 0,
      totalStudentPoints,
    });

    /* ━━ Merge recent users ━━ */
    const recent: RecentUser[] = [
      ...((recentTeachersRes.data || []) as any[]).map((t) => ({
        id: t.id,
        name: t.name,
        role: "guru" as const,
        meta: t.subject || "Guru",
        created_at: t.created_at,
      })),
      ...((recentStudentsRes.data || []) as any[]).map((s) => ({
        id: s.id,
        name: s.name,
        role: "siswa" as const,
        meta: `NIS ${s.nis}`,
        created_at: s.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
    setRecentUsers(recent);
    setIsLoading(false);
  };

  /* ━━ 4 primary stat cards ━━ */
  const primaryStats = [
    {
      title: "Total Guru",
      value: stats.teachers,
      icon: Users,
      color: "bg-navy",
      textColor: "text-navy",
      bgLight: "bg-navy-50",
      href: "/dashboard/admin/guru",
    },
    {
      title: "Total Siswa",
      value: stats.students,
      icon: UserCheck,
      color: "bg-teal",
      textColor: "text-teal",
      bgLight: "bg-teal-50",
      href: "/dashboard/admin/siswa",
    },
    {
      title: "Total Kelas",
      value: stats.classes,
      icon: Briefcase,
      color: "bg-amber",
      textColor: "text-amber",
      bgLight: "bg-amber-50",
      href: "/dashboard/admin/kelas",
    },
    {
      title: "Total Ujian",
      value: stats.exams,
      icon: BookMarked,
      color: "bg-purple-600",
      textColor: "text-purple-600",
      bgLight: "bg-purple-50",
      href: "/dashboard/admin/ujian",
    },
  ];

  /* ━━ Secondary stat cards ━━ */
  const secondaryStats = [
    { title: "Karya Galeri", value: stats.portfolios, icon: Heart, color: "text-rose-500" },
    { title: "Like Galeri", value: stats.portfolioLikes, icon: MessageSquare, color: "text-indigo-500" },
    { title: "Komentar", value: stats.portfolioComments, icon: MessageSquare, color: "text-sky-500" },
    { title: "Total Poin Siswa", value: stats.totalStudentPoints.toLocaleString("id-ID"), icon: BarChart2, color: "text-emerald-600" },
  ];

  const SkeletonNum = () => (
    <div className="skeleton h-8 w-16 rounded-lg" />
  );

  return (
    <div className="space-y-6">
      {/* ━━ Header ━━ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy dark:text-white">Dashboard Overview</h2>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Statistik sistem tersinkron real-time dari Supabase.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadStats()}
            className="border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-navy"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-navy hover:bg-navy-700 text-white border-0"
            onClick={() => setIsImportGuruOpen(true)}
          >
            <Upload size={16} aria-hidden="true" />
            Import Guru
          </Button>
        </div>
      </div>

      {/* ━━ Grid 4 Primary Stat Cards ━━ */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {primaryStats.map((stat) => (
          <Link
            key={stat.title}
            href={stat.href}
            className="group rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover dark:border-slate-800 dark:bg-card"
          >
            {/* ━━ Card icon 24px ━━ */}
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color} shadow-card`}>
              <stat.icon size={24} className="text-white" aria-hidden="true" />
            </div>
            {isLoading ? (
              <SkeletonNum />
            ) : (
              <p className="mt-4 text-3xl font-bold text-navy dark:text-white">
                {stat.value}
              </p>
            )}
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {stat.title}
            </p>
            <div className={`mt-2 flex items-center gap-1 text-xs font-semibold ${stat.textColor} opacity-0 transition-opacity group-hover:opacity-100`}>
              Lihat detail
              <ChevronRight size={12} aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>

      {/* ━━ Secondary stats row ━━ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {secondaryStats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-4 py-3 dark:border-slate-800 dark:bg-card"
          >
            <div className="flex items-center gap-2">
              <stat.icon size={16} className={stat.color} aria-hidden="true" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{stat.title}</span>
            </div>
            {isLoading ? (
              <div className="skeleton mt-2 h-6 w-12 rounded" />
            ) : (
              <p className="mt-1.5 text-xl font-bold text-navy dark:text-white">{stat.value}</p>
            )}
          </div>
        ))}
      </div>

      {/* ━━ Quick Actions + Recent Users ━━ */}
      <div className="grid gap-5 lg:grid-cols-2">

        {/* Quick Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-card dark:border-slate-800 dark:bg-card">
          <h3 className="mb-4 text-base font-bold text-navy dark:text-white">Aksi Cepat</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { href: "/dashboard/admin/guru", icon: Users, label: "Kelola Guru", color: "bg-navy-50 text-navy" },
              { href: "/dashboard/admin/siswa", icon: UserCheck, label: "Kelola Siswa", color: "bg-teal-50 text-teal" },
              { href: "/dashboard/admin/kelas", icon: Briefcase, label: "Kelola Kelas", color: "bg-amber-50 text-amber" },
              { href: "/dashboard/admin/ujian", icon: BookMarked, label: "Kelola Ujian", color: "bg-purple-50 text-purple-600" },
              { href: "/dashboard/admin/files", icon: BookMarked, label: "File Manager", color: "bg-sky-50 text-sky-600" },
              { href: "/dashboard/admin/pengumuman", icon: Megaphone, label: "Pengumuman", color: "bg-rose-50 text-rose-600" },
              { href: "/dashboard/admin/logs", icon: BarChart2, label: "Log Aktivitas", color: "bg-emerald-50 text-emerald-600" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4 text-center transition-colors hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                  <item.icon size={20} aria-hidden="true" />
                </div>
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Users */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-5 shadow-card dark:border-slate-800 dark:bg-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-navy dark:text-white">User Terbaru</h3>
            <Link href="/dashboard/admin/users" className="text-xs font-semibold text-teal hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton h-9 w-9 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-32 rounded" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                </div>
              ))
            ) : recentUsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">Belum ada data user</p>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                    user.role === "guru" ? "bg-navy-50 text-navy" : "bg-teal-50 text-teal"
                  }`}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.meta}</p>
                  </div>
                  <span className={`badge text-[10px] ${
                    user.role === "guru" ? "badge-navy" : "badge-teal"
                  }`}>
                    {user.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ImportGuruModal
        open={isImportGuruOpen}
        onOpenChange={setIsImportGuruOpen}
        onImportComplete={() => void loadStats()}
      />
    </div>
  );
}
