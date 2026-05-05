/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Layout Dashboard Guru
   Icon mapping baru: LayoutDashboard, Users, QrCode, FileText,
   PencilLine, FolderOpen, BarChart2, Trophy, CircleUserRound
   Menu baru: Laporan Kelas (BarChart2), QR Absensi sudah ada
   Bottom tab: Dashboard, Kelas, QR Scan, Profil
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  BookOpen,
  Briefcase,
  CircleUserRound,
  FolderOpen,
  House,
  LayoutDashboard,
  Megaphone,
  PencilLine,
  QrCode,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";
import type { Teacher } from "@/types";
import { logLogout } from "@/lib/activity-logger";
import { RouteCache } from "@/components/route-cache";
import { DashboardFrame } from "@/components/dashboard-frame";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) {
      router.push("/login/guru");
      return;
    }

    setTeacher(JSON.parse(sessionData));
    setIsLoading(false);
  }, [router]);

  const handleLogout = async () => {
    const sessionData = sessionStorage.getItem("guruSession");
    if (sessionData) {
      const guru = JSON.parse(sessionData);
      await logLogout(guru.kode_guru, "guru");
    }
    sessionStorage.removeItem("guruSession");
    router.push("/login/guru");
  };

  if (isLoading || !teacher) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface dark:bg-background">
        <div className="rounded-3xl border bg-white dark:bg-slate-900 p-8 text-center shadow-panel dark:bg-card dark:border-slate-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-navy/10 text-navy dark:bg-navy/20 dark:text-navy-200">
            <RefreshCw size={20} className="animate-spin" aria-hidden="true" />
          </div>
          <p className="font-semibold text-navy dark:text-white">Memuat dashboard guru...</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardFrame
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      roleTitle="Portal Guru"
      roleSubtitle="Panel Guru"
      userName={teacher.name}
      userMeta={teacher.subject || "Guru"}
      userCode={teacher.kode_guru}
      userRole="guru"
      avatarUrl={teacher.avatar_url}
      avatarFallback={(teacher.name || "G").charAt(0)}
      statBadge={teacher.subject || "Kelas Terhubung"}
      navSections={[
        {
          title: "Overview",
          items: [
            { href: "/dashboard/guru", label: "Dashboard & File", icon: LayoutDashboard },
          ],
        },
        {
          title: "Pengajaran",
          items: [
            { href: "/dashboard/guru/kelas", label: "Kelola Kelas", icon: Users },
            { href: "/dashboard/guru/qr-absen", label: "QR Absensi", icon: QrCode },
            { href: "/dashboard/guru/tugas", label: "Tugas", icon: BookOpen },
          ],
        },
        {
          title: "Penilaian & Konten",
          items: [
            { href: "/dashboard/guru/ujian", label: "Ujian", icon: PencilLine },
            { href: "/dashboard/guru/portofolio", label: "Galeri Karya", icon: FolderOpen },
            { href: "/dashboard/guru/analitik", label: "Analitik", icon: BarChart2 },
            { href: "/dashboard/guru/peringkat", label: "Peringkat", icon: Trophy },
          ],
        },
        {
          /* ━━ Menu baru: Laporan Kelas ━━ */
          title: "Laporan",
          items: [
            { href: "/dashboard/guru/laporan-kelas", label: "Laporan Kelas", icon: BarChart2 },
            { href: "/dashboard/guru/pengumuman", label: "Pengumuman", icon: Megaphone },
          ],
        },
        {
          title: "Akun",
          items: [
            { href: "/dashboard/guru/profil", label: "Profil", icon: CircleUserRound },
          ],
        },
      ]}
      /* ━━ Bottom Tab Bar mobile ━━ */
      bottomTabs={[
        { href: "/dashboard/guru", label: "Dashboard", icon: House },
        { href: "/dashboard/guru/kelas", label: "Kelas", icon: Users },
        { href: "/dashboard/guru/qr-absen", label: "QR Scan", icon: QrCode },
        { href: "/dashboard/guru/profil", label: "Profil", icon: CircleUserRound },
      ]}
      headerTitle="Dashboard Guru"
      headerSubtitle="Kelola kelas, materi, dan evaluasi siswa lewat panel yang lebih fokus."
      onLogout={handleLogout}
    >
      <RouteCache scope="dashboard-guru">{children}</RouteCache>
    </DashboardFrame>
  );
}
