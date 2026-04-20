"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  History,
  LayoutDashboard,
  RefreshCw,
  Settings,
  UserPlus,
  Users,
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="panel-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyber text-white shadow-soft-signal">
            <RefreshCw size={20} className="animate-spin" />
          </div>
          <p className="font-medium text-slate-600 dark:text-slate-300">Memuat panel administrator...</p>
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
      statBadge="System Monitor"
      navSections={[
        {
          title: "Overview",
          items: [{ href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard }],
        },
        {
          title: "Manajemen Pengguna",
          items: [
            { href: "/dashboard/admin/guru", label: "Data Guru", icon: Users },
            { href: "/dashboard/admin/siswa", label: "Data Siswa", icon: UserPlus },
            { href: "/dashboard/admin/kelas", label: "Data Kelas", icon: GraduationCap },
          ],
        },
        {
          title: "Konten",
          items: [
            { href: "/dashboard/admin/files", label: "File Manager", icon: FolderOpen },
            { href: "/dashboard/admin/galeri", label: "Galeri Karya", icon: Briefcase },
            { href: "/dashboard/admin/ujian", label: "Data Ujian", icon: ClipboardList },
            { href: "/dashboard/admin/nilai", label: "Nilai Siswa", icon: BarChart3 },
          ],
        },
        {
          title: "Sistem",
          items: [
            { href: "/dashboard/admin/settings", label: "Pengaturan", icon: Settings },
            { href: "/dashboard/admin/settings?tab=changelog", label: "Changelog Web", icon: RefreshCw },
            { href: "/dashboard/admin/logs", label: "Activity Log", icon: History },
          ],
        },
      ]}
      headerTitle="Panel Administrator"
      headerSubtitle="Pantau data sekolah, aktivitas, dan pengaturan dari satu command center."
      onLogout={handleLogout}
    >
      {children}
    </DashboardFrame>
  );
}
