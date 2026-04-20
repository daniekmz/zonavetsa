"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Trophy, Star, Award, TrendingUp, Users, Globe, Sparkles, BookOpen, ClipboardCheck, Activity, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { loadLeaderboardData, type LeaderboardEntry } from "@/lib/leaderboard";
import { useRouteCacheActive } from "@/components/route-cache";

export default function LeaderboardPage() {
  const isRouteActive = useRouteCacheActive();
  const [students, setStudents] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStudentNis, setCurrentStudentNis] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"global" | "class">("global");
  const [currentClassId, setCurrentClassId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const sessionData = sessionStorage.getItem("studentSession");
    if (sessionData) {
      const { student } = JSON.parse(sessionData);
      setCurrentStudentNis(student.nis);
      setCurrentClassId(student.last_class_id || student.class_id);
    }
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setIsLoading(true);
    const { leaderboard } = await loadLeaderboardData({
      classId: filterType === "class" ? currentClassId : undefined,
    });
    setStudents(leaderboard.slice(0, 50));
    setIsLoading(false);
  }, [currentClassId, filterType]);

  useEffect(() => {
    if (!isRouteActive) return;

    loadLeaderboard();

    const client = createClient();
    const channel = client
      .channel("leaderboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "students" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_scores" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance_records" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "portofolios" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "portfolio_likes" }, loadLeaderboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "portfolio_comments" }, loadLeaderboard)
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isRouteActive, loadLeaderboard]);

  const currentRank = useMemo(() => {
    if (!currentStudentNis) return null;
    const index = students.findIndex((student) => student.nis === currentStudentNis);
    return index >= 0 ? index + 1 : null;
  }, [currentStudentNis, students]);

  const currentStudent = useMemo(() => {
    if (!currentStudentNis) return null;
    return students.find((student) => student.nis === currentStudentNis) || null;
  }, [currentStudentNis, students]);

  const top3 = students.slice(0, 3);
  const others = students.slice(3);
  const podiumStudents = [
    { student: top3[1], rank: 2 },
    { student: top3[0], rank: 1 },
    { student: top3[2], rank: 3 },
  ];

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-3 py-4 sm:px-4 lg:px-6">
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-white dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-3 py-4 sm:px-4 lg:px-6">
      <div className="panel-surface relative overflow-hidden bg-gradient-to-br from-primary via-sky-700 to-cyan-600 p-5 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-6 -top-6 opacity-10">
          <Trophy size={140} />
        </div>

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="mb-3 rounded-full border-amber-300/40 bg-amber-400/20 px-3 py-1 text-amber-100">
              <Award size={13} className="mr-1.5" />
              Leaderboard Sinkron
            </Badge>
            <h2 className="text-2xl font-black sm:text-4xl">Papan Peringkat</h2>
            <p className="mt-2 text-sm text-sky-100/90 sm:text-base">
              Poin dihitung realtime dari ujian, tugas, absensi, aktivitas, dan Galeri Karya.
            </p>
          </div>

          <div className="w-full space-y-3 lg:w-auto">
            <div className="glass-tech inline-flex w-full items-center gap-2 rounded-xl p-1 lg:w-auto">
              <Button
                variant={filterType === "global" ? "secondary" : "ghost"}
                size="sm"
                className={`h-9 flex-1 rounded-lg px-4 lg:flex-none ${filterType === "global" ? "" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                onClick={() => setFilterType("global")}
              >
                <Globe size={15} />
                Global
              </Button>
              <Button
                variant={filterType === "class" ? "secondary" : "ghost"}
                size="sm"
                className={`h-9 flex-1 rounded-lg px-4 lg:flex-none ${filterType === "class" ? "" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
                onClick={() => setFilterType("class")}
              >
                <Users size={15} />
                Kelas
              </Button>
            </div>

            {currentRank && currentStudent ? (
              <div className="grid grid-cols-3 gap-3 rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sky-100/70">Peringkat</p>
                  <p className="mt-1 text-2xl font-black">#{currentRank}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sky-100/70">Poin</p>
                  <div className="mt-1 flex items-center gap-1">
                    <Star size={14} className="fill-amber-300 text-amber-300" />
                    <p className="text-2xl font-black">{currentStudent.totalPoints}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sky-100/70">Level</p>
                  <p className="mt-1 text-2xl font-black">{currentStudent.derivedLevel}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900/80">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <Users size={28} className="text-slate-500" />
          </div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-100">Data peringkat belum tersedia</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Belum ada data yang cukup untuk ditampilkan.</p>
        </div>
      ) : null}

      {currentStudent ? (
        <div className="grid gap-4 md:grid-cols-5">
          <BreakdownCard icon={BookOpen} label="Ujian" value={currentStudent.breakdown.examPoints} />
          <BreakdownCard icon={ClipboardCheck} label="Tugas" value={currentStudent.breakdown.assignmentPoints} />
          <BreakdownCard icon={TrendingUp} label="Absensi" value={currentStudent.breakdown.attendancePoints} />
          <BreakdownCard icon={Briefcase} label="Galeri" value={currentStudent.breakdown.portfolioPoints} />
          <BreakdownCard icon={Activity} label="Aktivitas" value={currentStudent.breakdown.activityPoints + currentStudent.breakdown.bonusPoints} />
        </div>
      ) : null}

      {top3.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {podiumStudents.map((item) =>
            item.student ? (
              <motion.div
                key={item.student.nis}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: item.rank * 0.2 }}
                className={`${
                  item.rank === 1
                    ? "md:order-2"
                    : item.rank === 2
                      ? "md:order-1"
                      : "md:order-3"
                }`}
              >
                <div
                  className={`relative flex h-full flex-col rounded-2xl border p-4 shadow-sm transition-colors ${
                    item.rank === 1
                      ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
                      : item.rank === 2
                        ? "border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800/70"
                        : "border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                        item.rank === 1
                          ? "bg-amber-500 text-white"
                          : item.rank === 2
                            ? "bg-slate-500 text-white"
                            : "bg-orange-500 text-white"
                      }`}
                    >
                      Rank {item.rank}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Lv {item.student.derivedLevel}</span>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                      {item.student.avatar_url ? (
                        <img src={item.student.avatar_url} alt={item.student.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary text-lg font-black text-white">
                          {item.student.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-black text-slate-900 dark:text-slate-100">{item.student.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        NIS {item.student.nis} | {item.student.className || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between rounded-xl bg-white/80 px-3 py-2 dark:bg-slate-900/70">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Total Poin</span>
                    <div className="flex items-center gap-1 text-lg font-black text-slate-800 dark:text-slate-100">
                      <Star size={14} className="fill-amber-400 text-amber-500" />
                      {item.student.totalPoints}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : null
          )}
        </div>
      ) : null}

      <div className="relative z-10 space-y-3 pt-2">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-primary dark:text-white sm:text-xl">
          <Sparkles className="text-yellow-500" />
          Semua Peringkat
        </h3>

        {others.length > 0 ? (
          others.map((student, idx) => {
            const actualRank = idx + 4;
            const isCurrentUser = currentStudentNis === student.nis;

            return (
              <motion.div
                key={student.nis}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`relative flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition-colors sm:flex-row sm:items-center sm:justify-between dark:bg-slate-900/80 ${
                  isCurrentUser
                    ? "border-primary/40 ring-1 ring-primary/20"
                    : "border-slate-200 dark:border-slate-800"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                      isCurrentUser
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    }`}
                  >
                    {actualRank}
                  </div>

                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                    {student.avatar_url ? (
                      <img src={student.avatar_url} className="h-full w-full object-cover" alt={student.name} />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-black text-slate-700 dark:text-slate-200">
                        {student.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className={`truncate text-base font-black ${isCurrentUser ? "text-primary" : "text-slate-800 dark:text-slate-100"}`}>
                      {student.name}
                      {isCurrentUser ? (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
                          Kamu
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                      Level {student.derivedLevel} | NIS: {student.nis} | {student.className || "-"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    U {student.breakdown.examPoints}
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    T {student.breakdown.assignmentPoints}
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    A {student.breakdown.attendancePoints}
                  </div>
                  <div className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    G {student.breakdown.portfolioPoints}
                  </div>
                  <div className="flex items-center gap-1 text-xl font-black text-slate-800 dark:text-slate-100">
                    <Star size={16} className="fill-amber-400 text-amber-500" />
                    {student.totalPoints}
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900/80">
            <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada data di luar podium.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</span>
        <Icon size={16} className="text-primary" />
      </div>
      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
