"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  QrCode,
  RefreshCw,
  Trophy,
  User,
} from "lucide-react";
import type { Student } from "@/types";
import { logLogout } from "@/lib/activity-logger";
import { loadLeaderboardData } from "@/lib/leaderboard";
import { createClient } from "@/lib/supabase";
import { RouteCache } from "@/components/route-cache";
import { DashboardFrame } from "@/components/dashboard-frame";

interface StudentSession {
  student: Student;
  selected: boolean;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [sidebarPoints, setSidebarPoints] = useState(0);
  const [sidebarLevel, setSidebarLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      router.push("/login/siswa");
      return;
    }

    const parsed: StudentSession = JSON.parse(sessionData);
    const isTeacherSelectionPage = pathname === "/dashboard/siswa/ganti-guru";

    if (!parsed.selected && !isTeacherSelectionPage) {
      router.push("/dashboard/siswa/ganti-guru");
      return;
    }

    const syncStudentProfile = async () => {
      const supabase = createClient();
      const { data: latestStudent } = await supabase
        .from("students")
        .select("*")
        .eq("nis", parsed.student.nis)
        .maybeSingle();

      const resolvedStudent = latestStudent || parsed.student;
      if (!isMounted) return;

      const syncSidebarStats = async (studentNis: string) => {
        const { leaderboard } = await loadLeaderboardData();
        const currentEntry = leaderboard.find((entry) => entry.nis === studentNis);
        if (!isMounted) return;

        if (currentEntry) {
          setSidebarPoints(currentEntry.totalPoints);
          setSidebarLevel(currentEntry.derivedLevel);
          return;
        }

        setSidebarPoints(resolvedStudent.points || 0);
        setSidebarLevel(resolvedStudent.level || 1);
      };

      setStudent(resolvedStudent);
      setSidebarPoints(resolvedStudent.points || 0);
      setSidebarLevel(resolvedStudent.level || 1);
      setIsLoading(false);
      await syncSidebarStats(resolvedStudent.nis);

      if (latestStudent) {
        sessionStorage.setItem(
          "studentSession",
          JSON.stringify({
            ...parsed,
            student: {
              ...parsed.student,
              ...latestStudent,
            },
          })
        );
      }

      const channel = supabase
        .channel(`student-profile-${resolvedStudent.nis}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "students",
            filter: `nis=eq.${resolvedStudent.nis}`,
          },
          (payload: any) => {
            const nextStudent = payload.new as Student;
            setStudent((prev) => (prev ? { ...prev, ...nextStudent } : nextStudent));
            setSidebarPoints(nextStudent.points || 0);
            setSidebarLevel(nextStudent.level || 1);

            const currentSessionData = sessionStorage.getItem("studentSession");
            if (!currentSessionData) return;

            const currentParsed: StudentSession = JSON.parse(currentSessionData);
            sessionStorage.setItem(
              "studentSession",
              JSON.stringify({
                ...currentParsed,
                student: {
                  ...currentParsed.student,
                  ...nextStudent,
                },
              })
            );

            void syncSidebarStats(nextStudent.nis);
          }
        )
        .subscribe();

      const leaderboardChannel = supabase
        .channel(`student-sidebar-stats-${resolvedStudent.nis}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "students" }, () => {
          void syncSidebarStats(resolvedStudent.nis);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "exam_scores" }, () => {
          void syncSidebarStats(resolvedStudent.nis);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions" }, () => {
          void syncSidebarStats(resolvedStudent.nis);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, () => {
          void syncSidebarStats(resolvedStudent.nis);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, () => {
          void syncSidebarStats(resolvedStudent.nis);
        })
        .subscribe();

      const presenceChannel = supabase.channel("online-users", {
        config: {
          presence: {
            key: resolvedStudent.nis,
          },
        },
      });

      presenceChannel
        .on("presence", { event: "sync" }, () => undefined)
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            await presenceChannel.track({
              nis: resolvedStudent.nis,
              name: resolvedStudent.name,
              class_id: resolvedStudent.last_class_id || resolvedStudent.class_id,
              role: "siswa",
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(leaderboardChannel);
        supabase.removeChannel(presenceChannel);
      };
    };

    let cleanupPromise: Promise<(() => void) | undefined> | undefined;
    cleanupPromise = syncStudentProfile();

    return () => {
      isMounted = false;
      void cleanupPromise?.then((cleanup) => cleanup?.());
    };
  }, [pathname, router]);

  const handleLogout = async () => {
    const sessionData = sessionStorage.getItem("studentSession");
    if (sessionData) {
      const { student } = JSON.parse(sessionData);
      await logLogout(student.nis, "siswa");
    }
    sessionStorage.removeItem("studentSession");
    router.push("/login/siswa");
  };

  if (isLoading || !student) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="panel-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-cyber text-white shadow-soft-signal">
            <RefreshCw size={20} className="animate-spin" />
          </div>
          <p className="font-medium text-slate-600 dark:text-slate-300">Memuat dashboard siswa...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardFrame
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
      roleTitle="Portal Siswa"
      roleSubtitle="Panel Siswa"
      userName={student.name}
      userMeta={`NIS ${student.nis}`}
      userCode={student.nis}
      userRole="siswa"
      avatarUrl={student.avatar_url}
      avatarFallback={(student.name || "S").charAt(0)}
      statBadge={`Lv ${sidebarLevel} • ${sidebarPoints} pts`}
      navSections={[
        {
          title: "Akses Cepat",
          items: [
            { href: "/dashboard/siswa/ganti-guru", label: "Ganti Guru", icon: RefreshCw },
            { href: "/dashboard/siswa/absensi", label: "QR Absensi", icon: QrCode },
          ],
        },
        {
          title: "Overview",
          items: [{ href: "/dashboard/siswa", label: "Overview & File Manager", icon: FolderOpen }],
        },
        {
          title: "Pembelajaran",
          items: [
            { href: "/dashboard/siswa/ujian", label: "Ujian", icon: ClipboardList },
            { href: "/dashboard/siswa/tugas", label: "Tugas", icon: GraduationCap },
            { href: "/dashboard/siswa/portofolio", label: "Galeri Karya", icon: Briefcase },
          ],
        },
        {
          title: "Akun",
          items: [
            { href: "/dashboard/siswa/peringkat", label: "Peringkat", icon: Trophy },
            { href: "/dashboard/siswa/profil", label: "Profil", icon: User },
          ],
        },
      ]}
      headerTitle="Dashboard Siswa"
      headerSubtitle="Belajar, kumpulkan tugas, dan ikuti update kelas dari satu tempat."
      onLogout={handleLogout}
    >
      <RouteCache scope="dashboard-siswa">{children}</RouteCache>
    </DashboardFrame>
  );
}
