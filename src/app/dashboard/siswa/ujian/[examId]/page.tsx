"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logActivity } from "@/lib/activity-logger";
import { useNotificationStore } from "@/lib/notifications";
import { calculateExamSubmission, formatDurationLabel, isExamVisibleToStudent } from "@/lib/exam-utils";
import type { Exam, ExamQuestion, ExamScore, ExamSession } from "@/types";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  PlayCircle,
  Save,
  Send,
  Sparkles,
  Target,
} from "lucide-react";

interface ExamStatus {
  status: "not_started" | "in_progress" | "submitted" | "expired";
  currentSession?: ExamSession;
  score?: ExamScore;
}

const ALL_CLASSES_VALUE = "all_classes";

const QUESTION_VIEW_KEY = "exam_question_view";
const ANSWER_BACKUP_KEY = "exam_answers";
const META_KEY = "exam_meta";

export default function ExamTakingPage({ params }: { params: { examId: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const isStandaloneExamRoute = pathname.startsWith("/exam/siswa/");
  const examListPath = "/dashboard/siswa/ujian";
  const [exam, setExam] = useState<Exam | null>(null);
  const [baseQuestions, setBaseQuestions] = useState<ExamQuestion[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [examStatus, setExamStatus] = useState<ExamStatus>({ status: "not_started" });
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [canNavigateAway, setCanNavigateAway] = useState(false);
  const [autoReturnAfterFinish, setAutoReturnAfterFinish] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const answersBackupKey = `${ANSWER_BACKUP_KEY}_${params.examId}`;
  const metaKey = `${META_KEY}_${params.examId}`;

  const persistMeta = useCallback(
    (nextIndex: number) => {
      localStorage.setItem(metaKey, JSON.stringify({ currentQuestionIndex: nextIndex }));
    },
    [metaKey]
  );

  const buildQuestionView = useCallback(
    (sessionId: string, sourceQuestions: ExamQuestion[], currentExam: Exam) => {
      const viewKey = `${QUESTION_VIEW_KEY}_${params.examId}_${sessionId}`;
      const cached = localStorage.getItem(viewKey);

      if (cached) {
        try {
          return JSON.parse(cached) as ExamQuestion[];
        } catch {
          localStorage.removeItem(viewKey);
        }
      }

      let nextQuestions = [...sourceQuestions];
      if (currentExam.shuffle_questions) {
        nextQuestions = shuffleArray(nextQuestions);
      }

      nextQuestions = nextQuestions.map((question) => {
        if (question.is_essay || !currentExam.shuffle_options) {
          return question;
        }

        const optionEntries = (["A", "B", "C", "D", "E"] as const)
          .map((letter) => ({
            letter,
            text: question[`option_${letter.toLowerCase()}` as keyof ExamQuestion] as string | undefined,
          }))
          .filter((item) => item.text);

        const shuffledOptions = shuffleArray(optionEntries);
        const optionLetters = ["A", "B", "C", "D", "E"];
        const correctIndex = shuffledOptions.findIndex((item) => item.letter === question.correct_answer);

        const nextQuestion: ExamQuestion = { ...question };
        optionLetters.forEach((letter, index) => {
          const optionKey = `option_${letter.toLowerCase()}` as keyof ExamQuestion;
          (nextQuestion as any)[optionKey] = shuffledOptions[index]?.text || undefined;
        });
        nextQuestion.correct_answer = correctIndex >= 0 ? optionLetters[correctIndex] : question.correct_answer;
        return nextQuestion;
      });

      localStorage.setItem(viewKey, JSON.stringify(nextQuestions));
      return nextQuestions;
    },
    [params.examId]
  );

  const clearLocalExamState = useCallback(
    (sessionId?: string) => {
      localStorage.removeItem(answersBackupKey);
      localStorage.removeItem(metaKey);
      if (sessionId) {
        localStorage.removeItem(`${QUESTION_VIEW_KEY}_${params.examId}_${sessionId}`);
      }
    },
    [answersBackupKey, metaKey, params.examId]
  );

  const saveAnswers = useCallback(async () => {
    if (examStatus.status !== "in_progress" || !examStatus.currentSession?.id) return;

    localStorage.setItem(answersBackupKey, JSON.stringify(answers));

    const entries = Object.entries(answers).filter(([, value]) => value.trim() !== "");
    if (entries.length === 0) return;

    setIsSaving(true);
    const supabase = createClient();

    await Promise.all(
      entries.map(([questionId, answer]) =>
        supabase.from("exam_answers").upsert(
          {
            session_id: examStatus.currentSession!.id,
            question_id: questionId,
            answer,
          },
          { onConflict: "session_id,question_id" }
        )
      )
    );

    await supabase
      .from("exam_sessions")
      .update({ time_remaining: timeRemaining ?? null })
      .eq("id", examStatus.currentSession.id);

    setLastSavedAt(new Date().toISOString());
    setIsSaving(false);
  }, [answers, answersBackupKey, examStatus, timeRemaining]);

  const finalizeExam = useCallback(
    async (reason: "submitted" | "expired") => {
      if (!exam || !examStatus.currentSession?.id) return;

      await saveAnswers();

      const sessionData = sessionStorage.getItem("studentSession");
      if (!sessionData) return;

      const { student } = JSON.parse(sessionData);
      const supabase = createClient();
      const summary = calculateExamSubmission(questions, answers);
      const submittedAt = new Date().toISOString();

      await supabase
        .from("exam_sessions")
        .update({
          submitted_at: submittedAt,
          is_completed: true,
          time_remaining: 0,
        })
        .eq("id", examStatus.currentSession.id);

      await supabase.from("exam_scores").upsert(
        {
          exam_id: params.examId,
          student_nis: student.nis,
          score: summary.scorePercentage,
          total_points: summary.totalPoints,
          earned_points: summary.earnedPoints,
          answers: summary.answerResults,
          submitted_at: submittedAt,
        },
        { onConflict: "exam_id,student_nis" }
      );

      if (exam.show_results) {
        await supabase.from("notifications").insert({
          user_kode: student.nis,
          user_role: "siswa",
          type: "exam",
          priority: reason === "expired" ? "high" : "medium",
          title: reason === "expired" ? "Ujian Ditutup Otomatis" : "Ujian Berhasil Disubmit",
          message: summary.hasEssayQuestions
            ? `Ujian "${exam.title}" sudah dikirim. Nilai pilihan ganda sementara: ${summary.scorePercentage}/100.`
            : `Ujian "${exam.title}" sudah dikirim. Nilai Anda: ${summary.scorePercentage}/100.`,
          link: `/dashboard/siswa/ujian/${params.examId}`,
        });
      }

      if (summary.scorePercentage > 0) {
        await supabase.rpc("increment_points", { s_nis: student.nis, amount: summary.scorePercentage });
      }

      if (exam.teacher_kode) {
        const { createNotification } = useNotificationStore.getState();
        await createNotification({
          user_kode: exam.teacher_kode,
          user_role: "guru",
          sender_kode: student.nis,
          sender_role: "siswa",
          sender_name: student.name,
          type: "exam",
          priority: "medium",
          title: reason === "expired" ? "Ujian Selesai (Waktu Habis)" : "Ujian Selesai",
          message: summary.hasEssayQuestions
            ? `${student.name} mengirim ujian "${exam.title}". Skor objektif sementara: ${summary.scorePercentage}/100.`
            : `${student.name} mengirim ujian "${exam.title}" dengan nilai ${summary.scorePercentage}/100.`,
          link: "/dashboard/guru/ujian",
        });
      }

      clearLocalExamState(examStatus.currentSession.id);
      setCanNavigateAway(true);
      setTimeRemaining(0);
      setAutoReturnAfterFinish(isStandaloneExamRoute);
      setExamStatus({
        status: reason,
        currentSession: {
          ...examStatus.currentSession,
          submitted_at: submittedAt,
          is_completed: true,
          time_remaining: 0,
        },
        score: {
          id: `${student.nis}-${params.examId}`,
          exam_id: params.examId,
          student_nis: student.nis,
          score: summary.scorePercentage,
          total_points: summary.totalPoints,
          earned_points: summary.earnedPoints,
          answers: summary.answerResults,
          submitted_at: submittedAt,
          created_at: submittedAt,
        },
      });

      toast(
        reason === "expired"
          ? "Waktu habis. Jawaban berhasil dikirim otomatis."
          : summary.hasEssayQuestions
          ? `Jawaban berhasil dikirim. Skor objektif sementara ${summary.scorePercentage}/100.`
          : `Ujian berhasil disubmit dengan nilai ${summary.scorePercentage}/100.`,
        "success"
      );

      await logActivity(student.nis, "siswa", {
        action: reason === "expired" ? "time_up_exam" : "exam_submit",
        details: `${reason === "expired" ? "Auto submit" : "Submit"} ujian: ${exam.title}`,
        metadata: {
          exam_id: params.examId,
          score: summary.scorePercentage,
          answered_count: summary.answeredCount,
        },
      });
    },
    [answers, clearLocalExamState, exam, examStatus.currentSession, isStandaloneExamRoute, params.examId, questions, saveAnswers]
  );

  const loadExamData = useCallback(async () => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");

    if (!sessionData) {
      router.push("/login/siswa");
      return;
    }

    const { student } = JSON.parse(sessionData);
    const targetClassId = student.last_class_id || student.class_id;

    const [examRes, sessionRes, scoreRes, questionsRes] = await Promise.all([
      supabase.from("exams").select("*").eq("id", params.examId).single(),
      supabase
        .from("exam_sessions")
        .select("*")
        .eq("exam_id", params.examId)
        .eq("student_nis", student.nis)
        .maybeSingle(),
      supabase
        .from("exam_scores")
        .select("*")
        .eq("exam_id", params.examId)
        .eq("student_nis", student.nis)
        .maybeSingle(),
      supabase
        .from("exam_questions")
        .select("*")
        .eq("exam_id", params.examId)
        .order("order_index"),
    ]);

    if (examRes.error || sessionRes.error || scoreRes.error || questionsRes.error) {
      toast("Gagal memuat data ujian", "error");
      router.push(examListPath);
      return;
    }

    const currentExam = examRes.data as Exam | null;
    if (!currentExam || !isExamVisibleToStudent(currentExam.class_id, targetClassId)) {
      toast("Anda tidak memiliki akses ke ujian ini", "error");
      router.push(examListPath);
      return;
    }

    if (currentExam.status !== "published") {
      toast("Ujian belum tersedia", "error");
      router.push(examListPath);
      return;
    }

    const sourceQuestions = (questionsRes.data || []) as ExamQuestion[];
    const session = sessionRes.data as ExamSession | null;
    const score = scoreRes.data as ExamScore | null;

    setExam(currentExam);
    setBaseQuestions(sourceQuestions);

    if (session) {
      const renderedQuestions = buildQuestionView(session.id, sourceQuestions, currentExam);
      const storedAnswers = localStorage.getItem(answersBackupKey);
      const answerMap: Record<string, string> = score?.answers ? { ...(score.answers as Record<string, string>) } : {};

      const { data: existingAnswers } = await supabase
        .from("exam_answers")
        .select("*")
        .eq("session_id", session.id);

      (existingAnswers || []).forEach((item: any) => {
        answerMap[item.question_id] = item.answer || "";
      });

      if (storedAnswers) {
        try {
          Object.assign(answerMap, JSON.parse(storedAnswers));
        } catch {
          localStorage.removeItem(answersBackupKey);
        }
      }

      const storedMeta = localStorage.getItem(metaKey);
      if (storedMeta) {
        try {
          const parsedMeta = JSON.parse(storedMeta);
          setCurrentQuestionIndex(parsedMeta.currentQuestionIndex || 0);
        } catch {
          localStorage.removeItem(metaKey);
        }
      }

      setQuestions(renderedQuestions);
      setAnswers(answerMap);

      if (session.submitted_at || score) {
        setExamStatus({
          status: session.submitted_at ? "submitted" : "submitted",
          currentSession: session,
          score: score || undefined,
        });
        setCanNavigateAway(true);
        setTimeRemaining(0);
      } else {
        const now = Date.now();
        const startedAt = new Date(session.started_at).getTime();
        const durationMs = (currentExam.duration_minutes || 90) * 60 * 1000;
        const endTime = startedAt + durationMs;
        const persistedRemaining = session.time_remaining ?? Math.floor((endTime - now) / 1000);

        setExamStatus({ status: "in_progress", currentSession: session });
        setTimeRemaining(Math.max(0, persistedRemaining));
      }
    } else {
      setQuestions(sourceQuestions);
      setAnswers({});
      setExamStatus({ status: "not_started" });
      setTimeRemaining((currentExam.duration_minutes || 90) * 60);
    }

    setIsLoading(false);
  }, [answersBackupKey, buildQuestionView, examListPath, metaKey, params.examId, router]);

  useEffect(() => {
    loadExamData();
  }, [loadExamData]);

  useEffect(() => {
    if (!exam || examStatus.status !== "in_progress" || timeRemaining === null) return;

    if (timeRemaining <= 0) {
      finalizeExam("expired");
      return;
    }

    const timer = window.setInterval(() => {
      setTimeRemaining((prev) => (prev !== null ? Math.max(0, prev - 1) : prev));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [exam, examStatus.status, finalizeExam, timeRemaining]);

  useEffect(() => {
    if (examStatus.status !== "in_progress") return;

    const autoSave = window.setInterval(() => {
      saveAnswers();
    }, 30000);

    return () => {
      window.clearInterval(autoSave);
    };
  }, [examStatus.status, saveAnswers]);

  useEffect(() => {
    if (examStatus.status !== "in_progress") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      saveAnswers();
      event.preventDefault();
      event.returnValue = "";
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveAnswers();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [examStatus.status, saveAnswers]);

  useEffect(() => {
    if (examStatus.status !== "in_progress") return;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      toast("Klik kanan dinonaktifkan selama ujian", "info");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ["a", "c", "v", "x"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        toast("Copy-paste dinonaktifkan selama ujian", "info");
      }
    };

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [examStatus.status]);

  useEffect(() => {
    if (!isStandaloneExamRoute || examStatus.status !== "in_progress") return;

    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
      toast("Selesaikan ujian terlebih dahulu sebelum keluar dari mode ujian", "info");
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [examStatus.status, isStandaloneExamRoute]);

  useEffect(() => {
    if (!autoReturnAfterFinish || (examStatus.status !== "submitted" && examStatus.status !== "expired")) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.push(examListPath);
    }, 2200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoReturnAfterFinish, examListPath, examStatus.status, router]);

  useEffect(() => {
    if (
      isLoading ||
      isStandaloneExamRoute ||
      !exam ||
      (examStatus.status !== "not_started" && examStatus.status !== "in_progress")
    ) {
      return;
    }

    router.replace(`/exam/siswa/${params.examId}`);
  }, [exam, examStatus.status, isLoading, isStandaloneExamRoute, params.examId, router]);

  const startExam = async () => {
    if (!exam) return;

    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) return;

    const { student } = JSON.parse(sessionData);
    let activeSession: ExamSession | null = null;
    let resumedExistingSession = false;

    const { data: newSession, error } = await supabase
      .from("exam_sessions")
      .insert({
        exam_id: params.examId,
        student_nis: student.nis,
        started_at: new Date().toISOString(),
        is_completed: false,
        time_remaining: (exam.duration_minutes || 90) * 60,
      })
      .select()
      .single();

    if (error) {
      const { data: existingSession, error: existingSessionError } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("exam_id", params.examId)
        .eq("student_nis", student.nis)
        .maybeSingle();

      if (existingSessionError || !existingSession) {
        toast("Gagal memulai ujian", "error");
        return;
      }

      activeSession = existingSession as ExamSession;
      resumedExistingSession = true;
    } else if (newSession) {
      activeSession = newSession as ExamSession;
    }

    if (!activeSession) {
      toast("Gagal memulai ujian", "error");
      return;
    }

    if (resumedExistingSession) {
      await loadExamData();
      if (!isStandaloneExamRoute) {
        router.replace(`/exam/siswa/${params.examId}`);
      }
      toast("Sesi ujian sebelumnya ditemukan. Anda dilanjutkan ke progres terakhir.", "info");
      return;
    }

    const renderedQuestions = buildQuestionView(activeSession.id, baseQuestions, exam);
    setQuestions(renderedQuestions);
    setExamStatus({ status: "in_progress", currentSession: activeSession });
    setTimeRemaining(activeSession.time_remaining ?? (exam.duration_minutes || 90) * 60);
    setAnswers({});
    setCurrentQuestionIndex(0);
    persistMeta(0);

    if (!isStandaloneExamRoute) {
      router.replace(`/exam/siswa/${params.examId}`);
    }

    await logActivity(student.nis, "siswa", {
      action: "exam_start",
      details: `Memulai ujian: ${exam.title}`,
      metadata: { exam_id: params.examId },
    });

    toast("Ujian dimulai. Kerjakan dengan tenang dan fokus.", "success");
  };

  const requestSubmitExam = () => {
    setShowSubmitConfirm(true);
  };

  const confirmSubmitExam = async () => {
    setShowSubmitConfirm(false);
    await finalizeExam("submitted");
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: answer };
      localStorage.setItem(answersBackupKey, JSON.stringify(next));
      return next;
    });
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    persistMeta(index);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = useMemo(() => calculateExamSubmission(questions, answers), [answers, questions]);
  const answeredRatio = questions.length > 0 ? Math.round((progress.answeredCount / questions.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Menyiapkan ruang ujian...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return null;
  }

  if (examStatus.status === "not_started") {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push(examListPath)}>
          <ArrowLeft size={16} />
          Kembali ke daftar ujian
        </Button>

        <section className="rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(0,43,91,0.12),_transparent_42%),linear-gradient(135deg,_#ffffff,_#edf4ff)] p-8 shadow-sm">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles size={14} />
              Briefing Ujian
            </div>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-bold text-primary">{exam.title}</h1>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {exam.description || "Baca instruksi dengan teliti sebelum mulai mengerjakan."}
                </p>
              </div>
              <div className="rounded-2xl bg-white px-5 py-4 text-center shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Durasi</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {formatDurationLabel(exam.duration_minutes || 90)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <PrepCard icon={FileText} label="Jumlah Soal" value={`${baseQuestions.length} soal`} />
          <PrepCard icon={Clock} label="Waktu Aktif" value={formatDurationLabel(exam.duration_minutes || 90)} />
          <PrepCard icon={Target} label="Nilai Minimum" value={`${exam.passing_score || 70}`} />
          <PrepCard
            icon={CheckCircle}
            label="Hasil"
            value={exam.show_results === false ? "Disembunyikan" : "Bisa dilihat"}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <BookOpen size={18} className="text-primary" />
              Instruksi dari guru
            </h2>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
              {exam.instructions || "Kerjakan semua soal dengan jujur. Simpan jawaban secara berkala bila diperlukan."}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <AlertTriangle size={18} className="text-warning" />
              Aturan pengerjaan
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Waktu mulai dihitung saat tombol `Mulai Ujian` ditekan.</li>
              <li>Jawaban disimpan otomatis secara berkala selama ujian berjalan.</li>
              <li>Klik kanan dan copy-paste dibatasi selama mode ujian aktif.</li>
              <li>Saat waktu habis, sistem akan mengirim jawaban otomatis.</li>
            </ul>

            <Button onClick={() => setShowStartConfirm(true)} className="mt-6 w-full bg-primary hover:bg-primary-light">
              <PlayCircle size={18} />
              Mulai Ujian
            </Button>
          </section>
        </div>

        <Dialog open={showStartConfirm} onOpenChange={setShowStartConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mulai Ujian?</DialogTitle>
              <DialogDescription>
                Setelah Anda menekan `Ya`, waktu ujian langsung berjalan dan sistem mulai mencatat sesi pengerjaan Anda.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowStartConfirm(false)}>
                Tidak
              </Button>
              <Button
                onClick={async () => {
                  setShowStartConfirm(false);
                  await startExam();
                }}
                className="bg-primary hover:bg-primary-light"
              >
                Ya
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (examStatus.status === "submitted" || examStatus.status === "expired") {
    const score = examStatus.score;
    const isPassed = score ? (score.score || 0) >= (exam.passing_score || 70) : false;
    const summary = calculateExamSubmission(questions, (score?.answers as Record<string, string>) || answers);

    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push(examListPath)}>
          <ArrowLeft size={16} />
          Kembali ke daftar ujian
        </Button>

        <section className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{exam.title}</h1>
              <p className="mt-2 text-sm text-slate-500">{exam.description || "Ujian telah selesai diproses."}</p>
            </div>
            <div className={`rounded-2xl px-5 py-4 text-center ${isPassed ? "bg-success/10" : "bg-danger/10"}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status Hasil</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {score?.score ?? 0}/100
              </p>
              <p className={`mt-1 text-sm font-semibold ${isPassed ? "text-success" : "text-danger"}`}>
                {isPassed ? "Lulus" : "Belum Lulus"}
              </p>
            </div>
          </div>

          {examStatus.status === "expired" && (
            <div className="mt-6 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-slate-700">
              Waktu pengerjaan habis sehingga jawaban dikirim otomatis oleh sistem.
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <PrepCard icon={Clock} label="Submit" value={formatSubmissionTime(examStatus.currentSession?.submitted_at)} />
            <PrepCard icon={CheckCircle} label="Terjawab" value={`${summary.answeredCount}/${questions.length}`} />
            <PrepCard icon={Target} label="Poin" value={`${score?.earned_points || 0}/${score?.total_points || summary.totalPoints}`} />
            <PrepCard
              icon={FileText}
              label="Penilaian Essay"
              value={summary.hasEssayQuestions ? "Menunggu koreksi" : "Selesai"}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800">Ringkasan pengerjaan</h2>
          {!exam.show_results ? (
            <p className="mt-3 text-sm text-slate-500">
              Guru menyembunyikan detail hasil. Status pengiriman Anda sudah tercatat dengan aman.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {questions.map((question, index) => {
                const userAnswer = ((score?.answers as Record<string, string>) || answers)[question.id] || "";
                const isCorrect = !question.is_essay && userAnswer === (question.correct_answer || "");

                return (
                  <div key={question.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {index + 1}. {question.question_text}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Jawaban Anda: {userAnswer || "Belum diisi"}
                        </p>
                        {question.is_essay ? (
                          <p className="mt-1 text-xs text-warning">Soal essay menunggu koreksi guru.</p>
                        ) : (
                          <p className="mt-1 text-xs text-slate-500">
                            Kunci jawaban: {question.correct_answer || "-"}
                          </p>
                        )}
                      </div>
                      {!question.is_essay && (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCorrect ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                          {isCorrect ? "Benar" : "Salah"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="sticky top-4 z-30 rounded-3xl bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={!canNavigateAway}
                onClick={() => router.push(examListPath)}
              >
                <ArrowLeft size={16} />
                Keluar
              </Button>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                Sedang Mengerjakan
              </span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{exam.title}</h1>
              <p className="text-sm text-slate-500">
                Soal {currentQuestionIndex + 1} dari {questions.length} • {progress.answeredCount} sudah dijawab
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lastSavedAt && (
              <span className="text-xs text-slate-500">
                Tersimpan {new Date(lastSavedAt).toLocaleTimeString("id-ID")}
              </span>
            )}
            {isSaving && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Save size={12} className="animate-pulse" />
                Menyimpan...
              </span>
            )}
            <div className={`rounded-2xl px-4 py-2 text-sm font-semibold ${timeRemaining !== null && timeRemaining < 300 ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                {formatCountdown(timeRemaining || 0)}
              </div>
            </div>
            <Button onClick={() => saveAnswers()} variant="outline">
              <Save size={16} />
              Simpan
            </Button>
            <Button onClick={requestSubmitExam} className="bg-success hover:bg-success/90">
              <Send size={16} />
              Submit
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span>Progress</span>
            <span>{answeredRatio}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${answeredRatio}%` }}
            />
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Navigasi Soal</h2>
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((question, index) => {
                const isCurrent = index === currentQuestionIndex;
                const hasAnswer = Boolean(answers[question.id]?.trim());

                return (
                  <button
                    key={question.id}
                    onClick={() => goToQuestion(index)}
                    className={`aspect-square rounded-xl text-sm font-semibold transition-all ${
                      isCurrent
                        ? "bg-primary text-white"
                        : hasAnswer
                        ? "bg-success/10 text-success"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Ringkasan</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Sudah dijawab</span>
                <span className="font-semibold text-slate-900">{progress.answeredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Belum dijawab</span>
                <span className="font-semibold text-slate-900">{progress.unansweredCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Essay</span>
                <span className="font-semibold text-slate-900">
                  {progress.answeredEssayCount}
                </span>
              </div>
            </div>
          </section>
        </aside>

        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          {currentQuestion ? (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {currentQuestion.is_essay ? "Soal Essay" : "Pilihan Ganda"}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    Pertanyaan {currentQuestionIndex + 1}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {currentQuestion.points || 1} poin
                </span>
              </div>

              <div className="py-8">
                <p className="text-lg leading-relaxed text-slate-800">{currentQuestion.question_text}</p>

                {currentQuestion.is_essay ? (
                  <div className="mt-6 space-y-3">
                    <textarea
                      value={answers[currentQuestion.id] || ""}
                      onChange={(event) => handleAnswerSelect(currentQuestion.id, event.target.value)}
                      className="min-h-[220px] w-full rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      placeholder="Tulis jawaban essay Anda di sini..."
                    />
                    <p className="text-xs text-slate-500">Jawaban essay akan diperiksa langsung oleh guru.</p>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {(["A", "B", "C", "D", "E"] as const).map((letter) => {
                      const option = currentQuestion[`option_${letter.toLowerCase()}` as keyof ExamQuestion] as string | undefined;
                      if (!option) return null;

                      const selected = answers[currentQuestion.id] === letter;

                      return (
                        <button
                          key={letter}
                          onClick={() => handleAnswerSelect(currentQuestion.id, letter)}
                          className={`flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition-all ${
                            selected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full font-semibold ${selected ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>
                            {letter}
                          </span>
                          <span className="flex-1 text-sm leading-relaxed text-slate-700">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => goToQuestion(Math.max(0, currentQuestionIndex - 1))}
                >
                  <ChevronLeft size={16} />
                  Sebelumnya
                </Button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {currentQuestionIndex < questions.length - 1 ? (
                    <Button onClick={() => goToQuestion(currentQuestionIndex + 1)} className="bg-primary hover:bg-primary-light">
                      Selanjutnya
                      <ChevronRight size={16} />
                    </Button>
                  ) : (
                    <Button onClick={requestSubmitExam} className="bg-success hover:bg-success/90">
                      <Send size={16} />
                      Submit Ujian
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-slate-500">Soal belum tersedia untuk ujian ini.</div>
          )}
        </section>
      </div>

      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selesaikan Ujian?</DialogTitle>
            <DialogDescription>
              {progress.unansweredCount > 0
                ? `Masih ada ${progress.unansweredCount} soal yang belum dijawab. Jika Anda memilih Ya, jawaban saat ini akan langsung dikirim.`
                : "Jika Anda memilih Ya, jawaban akan langsung dikirim dan ujian tidak bisa dilanjutkan lagi."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
              Tidak
            </Button>
            <Button onClick={() => void confirmSubmitExam()} className="bg-success hover:bg-success/90">
              Ya
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrepCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
        <Icon size={16} className="text-primary" />
      </div>
      <p className="mt-3 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function shuffleArray<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
  }
  return next;
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function formatSubmissionTime(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID");
}
