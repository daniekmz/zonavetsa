"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy, Star, Search, Users, Globe, Sparkles, BookOpen, ClipboardCheck, Activity, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase";
import { loadLeaderboardData, type LeaderboardEntry } from "@/lib/leaderboard";
import { useRouteCacheActive } from "@/components/route-cache";
import type { Class } from "@/types";

export default function GuruLeaderboardPage() {
  const isRouteActive = useRouteCacheActive();
  const [students, setStudents] = useState<LeaderboardEntry[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    const { leaderboard, classes: loadedClasses } = await loadLeaderboardData({
      classId: filterClass === "all" ? undefined : filterClass,
    });
    setStudents(leaderboard);
    setClasses(loadedClasses);
    setIsLoading(false);
  }, [filterClass]);

  useEffect(() => {
    if (!isRouteActive) return;

    loadLeaderboard();

    const supabase = createClient();
    const channel = supabase
      .channel("guru_leaderboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_scores" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, loadLeaderboard)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isRouteActive, loadLeaderboard]);

  const filteredStudents = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return students;

    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(keyword) ||
        student.nis.includes(searchQuery) ||
        (student.className || "").toLowerCase().includes(keyword)
      );
    });
  }, [searchQuery, students]);

  const top3 = filteredStudents.slice(0, 3);
  const others = filteredStudents.slice(3);
  const summary = useMemo(() => {
    const totalPoints = filteredStudents.reduce((sum, student) => sum + student.totalPoints, 0);
    const average = filteredStudents.length ? Math.round(totalPoints / filteredStudents.length) : 0;
    const highestExam = filteredStudents.reduce((max, student) => Math.max(max, student.breakdown.examPoints), 0);
    return {
      totalStudents: filteredStudents.length,
      average,
      highestExam,
    };
  }, [filteredStudents]);

  const podiumStudents = [
    { student: top3[1], rank: 2, className: "podium-rank-2" },
    { student: top3[0], rank: 1, className: "podium-rank-1" },
    { student: top3[2], rank: 3, className: "podium-rank-3" },
  ];

  if (isLoading && students.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="h-20 bg-slate-200 animate-pulse rounded-2xl" />
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-20 bg-white rounded-2xl animate-pulse shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8">
      <section className="rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(0,43,91,0.12),_transparent_42%),linear-gradient(135deg,_#ffffff,_#edf4ff)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles size={14} />
              Leaderboard Sync
            </div>
            <div>
              <h1 className="text-3xl font-black text-primary flex items-center gap-3">
                <Trophy className="text-yellow-500" />
                Peringkat Siswa
              </h1>
              <p className="text-slate-500 mt-2">
                Ranking sekarang mengambil sumber poin yang sama dari ujian, tugas, absensi, dan aktivitas siswa lainnya.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryBox icon={Users} label="Siswa" value={`${summary.totalStudents}`} />
            <SummaryBox icon={BarChart3} label="Rata-rata" value={`${summary.average}`} />
            <SummaryBox icon={BookOpen} label="Ujian Tertinggi" value={`${summary.highestExam}`} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Cari nama, NIS, atau kelas..."
              className="pl-10 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-[200px] rounded-xl">
              <SelectValue placeholder="Pilih Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {classes.map((studentClass) => (
                <SelectItem key={studentClass.id} value={studentClass.id}>
                  {studentClass.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {top3.length > 0 && !searchQuery && (
        <div className="podium-container">
          {podiumStudents.map((item) =>
            item.student ? (
              <motion.div
                key={item.student.nis}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="podium-item"
              >
                <div className={`podium-card ${item.className}`}>
                  <div className="podium-avatar-container">
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-white shadow-xl bg-primary flex items-center justify-center text-white text-2xl font-black">
                      {item.student.avatar_url ? (
                        <img src={item.student.avatar_url} className="w-full h-full rounded-full object-cover" alt={item.student.name} />
                      ) : (
                        item.student.name.charAt(0)
                      )}
                    </div>
                  </div>
                  <div className="text-center mt-12">
                    <p className="font-black text-sm md:text-base line-clamp-1">{item.student.name}</p>
                    <p className="text-[10px] opacity-70 font-bold uppercase">{item.student.className || item.student.nis}</p>
                    <div className="points-text mt-1">
                      <Star size={10} className="fill-current inline mr-1" />
                      {item.student.totalPoints} pts
                    </div>
                  </div>
                  <div className="rank-text">0{item.rank}</div>
                </div>
              </motion.div>
            ) : null
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence>
          {(searchQuery ? filteredStudents : others).map((student, idx) => (
            <motion.div
              key={student.nis}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="leaderboard-item"
            >
              <div className="rank-indicator">
                {searchQuery ? idx + 1 : idx + 4}
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500">
                  {student.avatar_url ? (
                    <img src={student.avatar_url} className="w-full h-full rounded-xl object-cover" alt={student.name} />
                  ) : (
                    student.name.charAt(0)
                  )}
                </div>
                <div>
                  <p className="font-black text-slate-800">{student.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {student.className || "-"} • NIS: {student.nis} • Lv {student.derivedLevel}
                  </p>
                </div>
              </div>
              <div className="item-points text-right">
                <div className="flex items-center justify-end gap-1.5 font-black text-slate-700">
                  <Star size={14} className="fill-yellow-400 text-yellow-500" />
                  {student.totalPoints}
                </div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  U {student.breakdown.examPoints} • T {student.breakdown.assignmentPoints} • A {student.breakdown.attendancePoints} • X {student.breakdown.activityPoints + student.breakdown.bonusPoints}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-20">
          <Globe size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="font-bold text-slate-400">Tidak ada data siswa ditemukan.</p>
        </div>
      )}
    </div>
  );
}

function SummaryBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
        <Icon size={16} className="text-primary" />
      </div>
      <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
