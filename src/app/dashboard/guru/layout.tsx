"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  FileText,
  FolderOpen,
  QrCode,
  RefreshCw,
  Trophy,
  User,
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="panel-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyber text-white shadow-soft-signal">
            <RefreshCw size={20} className="animate-spin" />
          </div>
          <p className="font-medium text-slate-600 dark:text-slate-300">Memuat dashboard guru...</p>
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
            { href: "/dashboard/guru", label: "Overview & File Manager", icon: FolderOpen },
          ],
        },
        {
          title: "Pengajaran",
          items: [
            { href: "/dashboard/guru/kelas", label: "Kelola Kelas", icon: Users },
            { href: "/dashboard/guru/qr-absen", label: "Scan Absensi", icon: QrCode },
            { href: "/dashboard/guru/tugas", label: "Tugas", icon: FileText },
          ],
        },
        {
          title: "Penilaian & Konten",
          items: [
            { href: "/dashboard/guru/ujian", label: "Ujian", icon: ClipboardList },
            { href: "/dashboard/guru/portofolio", label: "Galeri Karya", icon: Briefcase },
            { href: "/dashboard/guru/analitik", label: "Analitik", icon: BarChart3 },
            { href: "/dashboard/guru/peringkat", label: "Peringkat", icon: Trophy },
          ],
        },
        {
          title: "Akun",
          items: [
            { href: "/dashboard/guru/profil", label: "Profil", icon: User },
          ],
        },
      ]}
      headerTitle="Dashboard Guru"
      headerSubtitle="Kelola kelas, materi, dan evaluasi siswa lewat panel yang lebih fokus."
      onLogout={handleLogout}
    >
      <RouteCache scope="dashboard-guru">{children}</RouteCache>
    </DashboardFrame>
  );
}
