"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  GraduationCap,
  ClipboardList,
  BarChart3,
  Briefcase,
  Heart,
  MessageSquare,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { ImportGuruModal } from "@/components/import-guru-modal";

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
    ] = await Promise.all([
      supabase.from("teachers").select("id", { count: "exact", head: true }),
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("classes").select("id", { count: "exact", head: true }),
      supabase.from("exams").select("id", { count: "exact", head: true }),
      supabase.from("portofolios").select("id", { count: "exact", head: true }),
      supabase.from("portfolio_likes").select("id", { count: "exact", head: true }),
      supabase.from("portfolio_comments").select("id", { count: "exact", head: true }),
      supabase.from("students").select("points"),
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

    setIsLoading(false);
  };

  const statCards = [
    { title: "Total Guru", value: stats.teachers, icon: Users, color: "bg-blue-500" },
    { title: "Total Siswa", value: stats.students, icon: UserPlus, color: "bg-green-500" },
    { title: "Total Kelas", value: stats.classes, icon: GraduationCap, color: "bg-orange-500" },
    { title: "Total Ujian", value: stats.exams, icon: ClipboardList, color: "bg-purple-500" },
    { title: "Karya Galeri", value: stats.portfolios, icon: Briefcase, color: "bg-cyan-600" },
    { title: "Like Galeri", value: stats.portfolioLikes, icon: Heart, color: "bg-rose-500" },
    { title: "Komentar Galeri", value: stats.portfolioComments, icon: MessageSquare, color: "bg-indigo-500" },
    { title: "Total Poin Siswa", value: stats.totalStudentPoints, icon: BarChart3, color: "bg-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Dashboard Overview</h2>
          <p className="text-gray-500">Statistik sistem yang tersinkron dengan fitur terbaru siswa dan guru.</p>
        </div>
        <Button onClick={() => setIsImportGuruOpen(true)}>
          <Upload size={18} />
          Import Guru
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <div key={index} className="rounded-xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="mt-1 text-3xl font-bold text-gray-800">{isLoading ? "..." : stat.value}</p>
              </div>
              <div className={`${stat.color} rounded-lg p-3`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-800">Aksi Cepat</h3>
        <div className="grid gap-4 md:grid-cols-5">
          <QuickAction href="/dashboard/admin/guru" icon={Users} label="Kelola Guru" color="bg-blue-500" />
          <QuickAction href="/dashboard/admin/siswa" icon={UserPlus} label="Kelola Siswa" color="bg-green-500" />
          <QuickAction href="/dashboard/admin/kelas" icon={GraduationCap} label="Kelola Kelas" color="bg-orange-500" />
          <QuickAction href="/dashboard/admin/ujian" icon={ClipboardList} label="Kelola Ujian" color="bg-purple-500" />
          <button
            type="button"
            onClick={() => setIsImportGuruOpen(true)}
            className="flex flex-col items-center justify-center rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100"
          >
            <div className="mb-2 rounded-lg bg-cyan-600 p-3">
              <Upload size={20} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Import Guru</span>
          </button>
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

function QuickAction({
  href,
  icon: Icon,
  label,
  color,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  color: string;
}) {
  return (
    <a
      href={href}
      className="flex flex-col items-center justify-center rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100"
    >
      <div className={`${color} mb-2 rounded-lg p-3`}>
        <Icon size={20} className="text-white" />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </a>
  );
}
