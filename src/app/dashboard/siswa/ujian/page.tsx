"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Clock,
  CheckCircle,
  PlayCircle,
  Search,
  Sparkles,
  FileText,
  TimerReset,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Exam, ExamScore, ExamSession } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDurationLabel, getExamAvailabilityTone, isExamVisibleToStudent } from "@/lib/exam-utils";
import { toast } from "@/components/ui/toast";
import { useRouteCacheActive } from "@/components/route-cache";

const ALL_CLASSES_VALUE = "all_classes";

type StudentExamState = {
  session?: ExamSession | null;
  score?: ExamScore | null;
};

export default function StudentExamPage() {
  const router = useRouter();
  const isRouteActive = useRouteCacheActive();
  const [exams, setExams] = useState<Exam[]>([]);
  const [examStateMap, setExamStateMap] = useState<Record<string, StudentExamState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!isRouteActive) return;

    loadExams();

    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) return;

    const { student } = JSON.parse(sessionData);
    const targetClassId = student.last_class_id || student.class_id;

    const channel = supabase
      .channel("student-exams-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exams",
        },
        () => {
          loadExams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isRouteActive]);

  const loadExams = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");

    if (!sessionData) {
      setIsLoading(false);
      return;
    }

    const { student } = JSON.parse(sessionData);
    const targetClassId = student.last_class_id || student.class_id;

    const [examsRes, sessionsRes, scoresRes] = await Promise.all([
      supabase
        .from("exams")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false }),
      supabase
        .from("exam_sessions")
        .select("*")
        .eq("student_nis", student.nis),
      supabase
        .from("exam_scores")
        .select("*")
        .eq("student_nis", student.nis),
    ]);

    if (examsRes.error || sessionsRes.error || scoresRes.error) {
      toast("Gagal memuat daftar ujian", "error");
      setExams([]);
      setExamStateMap({});
      setIsLoading(false);
      return;
    }

    const nextExams = (examsRes.data || []).filter((exam: Exam) =>
      isExamVisibleToStudent(exam.class_id, targetClassId)
    );
    const nextMap: Record<string, StudentExamState> = {};

    (sessionsRes.data || []).forEach((session: ExamSession) => {
      nextMap[session.exam_id] = { ...nextMap[session.exam_id], session };
    });

    (scoresRes.data || []).forEach((score: ExamScore) => {
      nextMap[score.exam_id] = { ...nextMap[score.exam_id], score };
    });

    setExams(nextExams);
    setExamStateMap(nextMap);
    setIsLoading(false);
  };

  const filteredExams = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return exams;

    return exams.filter((exam) => {
      return (
        exam.title.toLowerCase().includes(keyword) ||
        (exam.description || "").toLowerCase().includes(keyword)
      );
    });
  }, [exams, searchTerm]);

  const summary = useMemo(() => {
    let available = 0;
    let inProgress = 0;
    let completed = 0;

    exams.forEach((exam) => {
      const state = examStateMap[exam.id];
      if (state?.score || state?.session?.submitted_at) {
        completed += 1;
      } else if (state?.session) {
        inProgress += 1;
      } else {
        available += 1;
      }
    });

    return {
      total: exams.length,
      available,
      inProgress,
      completed,
    };
  }, [examStateMap, exams]);

  const openExam = (exam: Exam) => {
    const state = examStateMap[exam.id];
    const isSubmitted = Boolean(state?.score || state?.session?.submitted_at);
    router.push(isSubmitted ? `/dashboard/siswa/ujian/${exam.id}` : `/exam/siswa/${exam.id}`);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(0,43,91,0.12),_transparent_42%),linear-gradient(135deg,_#ffffff,_#edf4ff)] p-6 shadow-sm dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_38%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(15,23,42,0.82))]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary dark:bg-slate-900/70 dark:text-sky-200">
              <Sparkles size={14} />
              Ruang Ujian
            </div>
            <div>
              <h2 className="text-3xl font-bold text-primary">Siap mengerjakan ujian</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Semua ujian yang dipublikasikan guru tampil di sini lengkap dengan status progres,
                durasi, dan tombol lanjut jika sebelumnya belum selesai.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Total" value={summary.total} icon={ClipboardList} />
            <SummaryCard label="Siap" value={summary.available} icon={PlayCircle} />
            <SummaryCard label="Berjalan" value={summary.inProgress} icon={TimerReset} />
            <SummaryCard label="Selesai" value={summary.completed} icon={CheckCircle} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari judul atau deskripsi ujian..."
            className="pl-10"
          />
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-4 h-4 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-6 h-10 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <ClipboardList size={56} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {searchTerm ? "Ujian tidak ditemukan" : "Belum ada ujian aktif"}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {searchTerm
              ? `Tidak ada ujian yang cocok dengan kata kunci "${searchTerm}".`
              : "Saat guru mempublikasikan ujian, daftar dan progresnya akan muncul di sini."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredExams.map((exam) => {
            const state = examStateMap[exam.id];
            const isSubmitted = Boolean(state?.score || state?.session?.submitted_at);
            const isInProgress = Boolean(state?.session && !state?.session?.submitted_at && !state?.score);
            const tone = getExamAvailabilityTone(
              isSubmitted ? "submitted" : isInProgress ? "in_progress" : "available"
            );
            const currentScore = state?.score?.score;

            return (
              <article
                key={exam.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badgeClass}`}>
                      {tone.badge}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{exam.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {exam.description || "Tidak ada deskripsi tambahan untuk ujian ini."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <MetaTile icon={Clock} label="Durasi" value={formatDurationLabel(exam.duration_minutes || 90)} />
                  <MetaTile icon={FileText} label="Hasil" value={exam.show_results === false ? "Disembunyikan" : "Ditampilkan"} />
                  <MetaTile
                    icon={CheckCircle}
                    label="Nilai"
                    value={typeof currentScore === "number" ? `${currentScore}/100` : isSubmitted ? "Terkirim" : "Belum ada"}
                  />
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {isSubmitted
                      ? "Ujian sudah selesai. Anda bisa membuka ulang untuk melihat detail hasil."
                      : isInProgress
                      ? "Progres terakhir tersimpan. Anda bisa melanjutkan dari posisi sebelumnya."
                      : "Baca instruksi terlebih dahulu sebelum mulai mengerjakan."}
                  </div>
                  <Button onClick={() => openExam(exam)} className="bg-primary hover:bg-primary-light">
                    {isSubmitted ? (
                      <>
                        <CheckCircle size={18} />
                        Lihat Hasil
                      </>
                    ) : isInProgress ? (
                      <>
                        <PlayCircle size={18} />
                        Lanjutkan
                      </>
                    ) : (
                      <>
                        <PlayCircle size={18} />
                        Mulai
                      </>
                    )}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</span>
        <Icon size={16} className="text-primary" />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function MetaTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
