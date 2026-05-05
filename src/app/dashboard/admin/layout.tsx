/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Layout Dashboard Admin
   Icon mapping baru: LayoutDashboard, Users, UserPlus, GraduationCap,
   FolderOpen, Briefcase, PencilLine, BarChart2, ScrollText,
   Settings, UsersRound
   Menu baru: Manajemen User (UsersRound), Log Aktivitas (ScrollText)
   Bottom tab: Overview, Siswa, Guru, Pengaturan
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  Briefcase,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  PencilLine,
  RefreshCw,
  ScrollText,
  Settings,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import type { Profile } from "@/types";
import { logLogout } from "@/lib/activity-logger";
import { DashboardFrame } from "@/components/dashboard-frame";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionData = sessionStorage.getItem("adminSession");
    if (!sessionData) {
      router.push("/login/admin");
      return;
    }

    setAdmin(JSON.parse(sessionData));
    setIsLoading(false);
  }, [router]);

  const handleLogout = async () => {
    const sessionData = sessionStorage.getItem("adminSession");
    if (sessionData) {
      const admin = JSON.parse(sessionData);
      await logLogout(admin.username, "admin");
    }
    sessionStorage.removeItem("adminSession");
    router.push("/login/admin");
  };

  if (isLoading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface dark:bg-background">
        <div className="rounded-3xl border bg-white dark:bg-slate-900 p-8 text-center shadow-panel dark:bg-card dark:border-slate-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber/10 text-amber dark:bg-amber/20">
            <RefreshCw size={20} className="animate-spin" aria-hidden="true" />
          </div>
          <p className="font-semibold text-navy dark:text-white">Memuat panel administrator...</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardFrame
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      roleTitle="Portal Admin"
      roleSubtitle="Panel Admin"
      userName={admin.name}
      userMeta="Administrator"
      userCode={admin.username}
      userRole="admin"
      avatarFallback={(admin.name || "A").charAt(0)}
      statBadge="System Administrator"
      navSections={[
        {
          title: "Overview",
          items: [
            { href: "/dashboard/admin", label: "Overview & Statistik", icon: LayoutDashboard },
          ],
        },
        {
          title: "Manajemen Pengguna",
          items: [
            { href: "/dashboard/admin/guru", label: "Data Guru", icon: Users },
            { href: "/dashboard/admin/siswa", label: "Data Siswa", icon: UserPlus },
            { href: "/dashboard/admin/kelas", label: "Data Kelas", icon: GraduationCap },
            /* ━━ Menu baru: Manajemen User ━━ */
            { href: "/dashboard/admin/users", label: "Manajemen User", icon: UsersRound },
          ],
        },
        {
          title: "Konten",
          items: [
            { href: "/dashboard/admin/files", label: "File Manager", icon: FolderOpen },
            { href: "/dashboard/admin/galeri", label: "Galeri Karya", icon: Briefcase },
            { href: "/dashboard/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
            { href: "/dashboard/admin/ujian", label: "Data Ujian", icon: PencilLine },
            { href: "/dashboard/admin/nilai", label: "Nilai Siswa", icon: BarChart2 },
          ],
        },
        {
          title: "Sistem",
          items: [
            { href: "/dashboard/admin/settings", label: "Pengaturan", icon: Settings },
            /* ━━ Menu baru: Log Aktivitas (ScrollText ganti History) ━━ */
            { href: "/dashboard/admin/logs", label: "Log Aktivitas", icon: ScrollText },
            { href: "/dashboard/admin/settings?tab=changelog", label: "Changelog Web", icon: RefreshCw },
          ],
        },
      ]}
      /* ━━ Bottom Tab Bar mobile ━━ */
      bottomTabs={[
        { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/dashboard/admin/siswa", label: "Siswa", icon: UserPlus },
        { href: "/dashboard/admin/guru", label: "Guru", icon: Users },
        { href: "/dashboard/admin/settings", label: "Pengaturan", icon: Settings },
      ]}
      headerTitle="Panel Administrator"
      headerSubtitle="Pantau data sekolah, aktivitas, dan pengaturan dari satu command center."
      onLogout={handleLogout}
    >
      {children}
    </DashboardFrame>
  );
}
