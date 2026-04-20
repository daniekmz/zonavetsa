"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardList, Plus, Search, Edit2, Trash2, Eye, EyeOff, Clock, Users, FileText, CheckCircle, Download, Upload, X, Sparkles, Target, BarChart3, Save, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Avatar } from "@/components/avatar";
import { notifyExam } from "@/lib/notifications";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Exam, Class, ExamQuestion } from "@/types";
import {
  ALL_CLASSES_VALUE,
  doesExamMatchClassFilter,
  encodeExamTargetClassIds,
  formatDurationLabel,
  parseExamTargetClassIds,
} from "@/lib/exam-utils";

interface ExamFormData {
  title: string;
  description: string;
  class_id: string;
  duration_minutes: number;
  status: "draft" | "published";
  instructions?: string;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_results?: boolean;
  passing_score?: number;
}

interface QuestionFormData {
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  correct_answer?: string;
  is_essay: boolean;
  is_true_false?: boolean;
  points?: number;
  explanation?: string;
}

export default function GuruUjianPage() {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [averageScores, setAverageScores] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<ExamQuestion | null>(null);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);
  const [examScores, setExamScores] = useState<any[]>([]);
  const [isScoresLoading, setIsScoresLoading] = useState(false);
  const [essayAnswers, setEssayAnswers] = useState<any[]>([]);
  const [gradingSubmission, setGradingSubmission] = useState<{ sessionId: string; questionId: string; answer: string; currentGrade?: string } | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClassPickerOpen, setIsClassPickerOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [formData, setFormData] = useState<ExamFormData>({
    title: "",
    description: "",
    class_id: "",
    duration_minutes: 90,
    status: "draft",
    instructions: "",
    shuffle_questions: false,
    shuffle_options: false,
    show_results: true,
    passing_score: 70,
  });

  useEffect(() => {
    loadData();
  }, []);

  const selectedTargetClassIds = useMemo(
    () => parseExamTargetClassIds(formData.class_id),
    [formData.class_id]
  );

  const getTargetClassNames = (classId: string) => {
    const targetIds = parseExamTargetClassIds(classId);

    if (targetIds.includes(ALL_CLASSES_VALUE)) {
      return ["Semua Kelas"];
    }

    return targetIds.map((targetId) => classes.find((item) => item.id === targetId)?.name || "Kelas belum ditemukan");
  };

  const getExamClassLabel = (classId: string) => {
    const names = getTargetClassNames(classId);
    if (names.length <= 2) return names.join(", ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2} kelas`;
  };

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return;

    const { kode_guru: teacherKode } = JSON.parse(sessionData);

    const [examsRes, classesRes] = await Promise.all([
      supabase.from("exams").select("*").eq("teacher_kode", teacherKode).order("created_at", { ascending: false }),
      supabase.from("classes").select("*").order("name"),
    ]);

    if (examsRes.data) {
      setExams(examsRes.data);

      const examIds = examsRes.data.map((exam: Exam) => exam.id);
      if (examIds.length > 0) {
        const [questionRes, scoresRes] = await Promise.all([
          supabase.from("exam_questions").select("exam_id").in("exam_id", examIds),
          supabase.from("exam_scores").select("exam_id, score").in("exam_id", examIds),
        ]);

        const nextQuestionCounts: Record<string, number> = {};
        (questionRes.data || []).forEach((item: { exam_id: string }) => {
          nextQuestionCounts[item.exam_id] = (nextQuestionCounts[item.exam_id] || 0) + 1;
        });
        setQuestionCounts(nextQuestionCounts);

        const nextSubmissionCounts: Record<string, number> = {};
        const scoreBuckets: Record<string, number[]> = {};
        (scoresRes.data || []).forEach((item: { exam_id: string; score?: number | null }) => {
          nextSubmissionCounts[item.exam_id] = (nextSubmissionCounts[item.exam_id] || 0) + 1;
          if (typeof item.score === "number") {
            scoreBuckets[item.exam_id] = [...(scoreBuckets[item.exam_id] || []), item.score];
          }
        });
        setSubmissionCounts(nextSubmissionCounts);

        const nextAverageScores: Record<string, number> = {};
        Object.entries(scoreBuckets).forEach(([examId, scores]) => {
          const total = scores.reduce((sum, score) => sum + score, 0);
          nextAverageScores[examId] = Math.round(total / scores.length);
        });
        setAverageScores(nextAverageScores);
      } else {
        setQuestionCounts({});
        setSubmissionCounts({});
        setAverageScores({});
      }
    }
    if (classesRes.data) setClasses(classesRes.data);
    setIsLoading(false);
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = doesExamMatchClassFilter(e.class_id, classFilter);
    return matchesSearch && matchesClass;
  });

  const dashboardSummary = useMemo(() => {
    const published = exams.filter((exam) => exam.status === "published").length;
    const totalQuestions = Object.values(questionCounts).reduce((sum, count) => sum + count, 0);
    const totalSubmissions = Object.values(submissionCounts).reduce((sum, count) => sum + count, 0);
    const averageValues = Object.values(averageScores);

    return {
      total: exams.length,
      published,
      totalQuestions,
      totalSubmissions,
      averageScore:
        averageValues.length > 0
          ? Math.round(averageValues.reduce((sum, score) => sum + score, 0) / averageValues.length)
          : 0,
    };
  }, [averageScores, exams, questionCounts, submissionCounts]);

  const openModal = (exam?: Exam) => {
    if (exam) {
      setEditingExam(exam);
      setFormData({
        title: exam.title,
        description: exam.description || "",
        class_id: exam.class_id,
        duration_minutes: exam.duration_minutes || 90,
        status: exam.status as "draft" | "published",
        instructions: exam.instructions || "",
        shuffle_questions: exam.shuffle_questions || false,
        shuffle_options: exam.shuffle_options || false,
        show_results: exam.show_results !== false,
        passing_score: exam.passing_score || 70,
      });
    } else {
      setEditingExam(null);
      setFormData({
        title: "",
        description: "",
        class_id: "",
        duration_minutes: 90,
        status: "draft",
        instructions: "",
        shuffle_questions: false,
        shuffle_options: false,
        show_results: true,
        passing_score: 70,
      });
    }
    setIsClassPickerOpen(false);
    setIsModalOpen(true);
  };

  const toggleTargetClass = (classId: string) => {
    if (classId === ALL_CLASSES_VALUE) {
      setFormData((prev) => ({ ...prev, class_id: ALL_CLASSES_VALUE }));
      return;
    }

    const currentIds = parseExamTargetClassIds(formData.class_id).filter((item) => item !== ALL_CLASSES_VALUE);
    const nextIds = currentIds.includes(classId)
      ? currentIds.filter((item) => item !== classId)
      : [...currentIds, classId];

    setFormData((prev) => ({
      ...prev,
      class_id: encodeExamTargetClassIds(nextIds),
    }));
  };

  const clearTargetClasses = () => {
    setFormData((prev) => ({ ...prev, class_id: "" }));
  };

  const openEditQuestionModal = (question: ExamQuestion) => {
    setEditingQuestion(question);
    setIsEditQuestionModalOpen(true);
  };

  const openQuestionsModal = async (exam: Exam) => {
    setSelectedExam(exam);
    setIsQuestionsLoading(true);
    setIsQuestionsModalOpen(true);
    
    const supabase = createClient();
    const { data } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", exam.id)
      .order("order_index");
    
    if (data) setQuestions(data);
    setIsQuestionsLoading(false);
  };

  const openResultsModal = async (exam: Exam) => {
    setSelectedExam(exam);
    setIsScoresLoading(true);
    setIsResultsModalOpen(true);
    
    const supabase = createClient();
    
    // Get scores with student names
    const { data: scoresData } = await supabase
      .from("exam_scores")
      .select("*")
      .eq("exam_id", exam.id)
      .order("submitted_at", { ascending: false });

    // Get student info for each score
    let scoresWithStudents: any[] = [];
    if (scoresData) {
      for (const score of scoresData) {
        const { data: studentData } = await supabase
          .from("students")
          .select("name, absen, avatar_url")
          .eq("nis", score.student_nis)
          .single();
        
        scoresWithStudents.push({
          ...score,
          student_name: studentData?.name || "Unknown",
          student_absen: studentData?.absen || "-",
          student_avatar: studentData?.avatar_url || null,
        });
      }
    }
    
    setExamScores(scoresWithStudents);
    setIsScoresLoading(false);
  };

  const loadEssayAnswers = async (examId: string) => {
    const supabase = createClient();
    
    // Get all essay questions for this exam
    const { data: essayQuestions } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("is_essay", true);
    
    if (!essayQuestions || essayQuestions.length === 0) {
      setEssayAnswers([]);
      return;
    }
    
    // Get all exam sessions for this exam
    const { data: sessions } = await supabase
      .from("exam_sessions")
      .select("id, student_nis")
      .eq("exam_id", examId)
      .not("submitted_at", "is", null);
    
    if (!sessions || sessions.length === 0) {
      setEssayAnswers([]);
      return;
    }
    
    // Get all answers for essay questions
    const questionIds = essayQuestions.map((q: { id: string }) => q.id);
    const sessionIds = sessions.map((s: { id: string; student_nis: string }) => s.id);
    
    const { data: answers } = await supabase
      .from("exam_answers")
      .select("*")
      .in("question_id", questionIds)
      .in("session_id", sessionIds);
    
    // Build essay answers with student info
    let essayData: any[] = [];
    for (const session of sessions) {
      const { data: studentData } = await supabase
        .from("students")
        .select("name, nis")
        .eq("nis", session.student_nis)
        .single();
      
      const sessionAnswers = answers?.filter((a: { session_id: string; question_id: string; answer?: string; is_correct?: boolean; points_earned?: number; graded_at?: string; id: string }) => a.session_id === session.id) || [];
      
      for (const answer of sessionAnswers) {
        const question = essayQuestions.find((q: { id: string; question_text: string }) => q.id === answer.question_id);
        if (question) {
          essayData.push({
            id: answer.id,
            session_id: session.id,
            student_nis: session.student_nis,
            student_name: studentData?.name || "Unknown",
            question_text: question.question_text,
            question_id: question.id,
            answer: answer.answer || "",
            is_correct: answer.is_correct,
            points_earned: answer.points_earned,
            graded_at: answer.graded_at,
          });
        }
      }
    }
    
    setEssayAnswers(essayData);
  };

  const gradeEssayAnswer = async (answerId: string, points: number, feedback: string) => {
    const supabase = createClient();
    
    const { error } = await supabase
      .from("exam_answers")
      .update({
        is_correct: points > 0,
        points_earned: points,
        graded_at: new Date().toISOString(),
      })
      .eq("id", answerId);
    
    if (error) {
      toast("Gagal menyimpan nilai", "error");
    } else {
      toast("Nilai berhasil disimpan", "success");
      // Reload essay answers
      if (selectedExam) {
        loadEssayAnswers(selectedExam.id);
      }
    }
  };

  const exportToExcel = () => {
    if (!selectedExam || examScores.length === 0) {
      toast("Tidak ada data untuk diexport", "error");
      return;
    }

    const passingScore = selectedExam.passing_score || 70;
    
    const data = examScores.map((score, idx) => ({
      No: idx + 1,
      NIS: score.student_nis,
      Nama: score.student_name,
      Nilai: `${score.score}%`,
      Poin: `${score.earned_points}/${score.total_points}`,
      Status: (score.score || 0) >= passingScore ? "LULUS" : "TIDAK LULUS",
      "Waktu Submit": score.submitted_at ? new Date(score.submitted_at).toLocaleString("id-ID") : "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    
    // Auto-fit column widths
    const colWidths = [
      { wch: 5 },  // No
      { wch: 12 }, // NIS
      { wch: 20 }, // Nama
      { wch: 8 },  // Nilai
      { wch: 10 }, // Poin
      { wch: 12 }, // Status
      { wch: 20 }, // Waktu Submit
    ];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Hasil Ujian");
    
    const fileName = `hasil-ujian-${selectedExam.title.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast("Berhasil export ke Excel", "success");
  };

  const exportToPDF = () => {
    if (!selectedExam || examScores.length === 0) {
      toast("Tidak ada data untuk diexport", "error");
      return;
    }

    const doc = new jsPDF();
    const passingScore = selectedExam.passing_score || 70;
    const avgScore = Math.round(examScores.reduce((sum, s) => sum + (s.score || 0), 0) / examScores.length);
    const lulusCount = examScores.filter(s => (s.score || 0) >= passingScore).length;

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Hasil Ujian: ${selectedExam.title}`, 14, 20);
    
    // Info
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Kelas: ${getExamClassLabel(selectedExam.class_id)}`, 14, 28);
    doc.text(`Tanggal Export: ${new Date().toLocaleString("id-ID")}`, 14, 34);
    doc.text(`Total Siswa: ${examScores.length} | Rata-rata: ${avgScore}% | Lulus: ${lulusCount}`, 14, 40);

    // Table
    const tableData = examScores.map((score, idx) => [
      idx + 1,
      score.student_nis,
      score.student_name,
      `${score.score}%`,
      `${score.earned_points}/${score.total_points}`,
      (score.score || 0) >= passingScore ? "LULUS" : "TIDAK LULUS",
    ]);

    (doc as any).autoTable({
      startY: 46,
      head: [["No", "NIS", "Nama", "Nilai", "Poin", "Status"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [0, 43, 91],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 25 },
        2: { cellWidth: 50 },
        3: { cellWidth: 15 },
        4: { cellWidth: 20 },
        5: { cellWidth: 25 },
      },
    });

    const fileName = `hasil-ujian-${selectedExam.title.replace(/[^a-zA-Z0-9]/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(fileName);
    
    toast("Berhasil export ke PDF", "success");
  };

  const notifyStudentsForPublishedExam = async (
    classId: string,
    examTitle: string,
    teacherKode: string,
    teacherName: string
  ) => {
    const supabase = createClient();
    const targetClassIds = parseExamTargetClassIds(classId);
    const { data: students } = await supabase
      .from("students")
      .select("nis, class_id, last_class_id");

    if (!students || students.length === 0) {
      return;
    }

    const filteredStudents =
      targetClassIds.includes(ALL_CLASSES_VALUE)
        ? students
        : students.filter((student: { class_id?: string | null; last_class_id?: string | null }) => {
            return Boolean(
              (student.class_id && targetClassIds.includes(student.class_id)) ||
              (student.last_class_id && targetClassIds.includes(student.last_class_id))
            );
          });

    const nisList = Array.from(
      new Set(filteredStudents.map((student: { nis: string }) => student.nis).filter(Boolean))
    ) as string[];
    if (nisList.length === 0) {
      return;
    }

    const className = getExamClassLabel(classId);
    await notifyExam("published", examTitle, nisList, teacherKode, teacherName, className);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.class_id) {
      toast("Judul dan kelas wajib diisi", "error");
      return;
    }

    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return;
    const teacherSession = JSON.parse(sessionData);
    const teacherKode = teacherSession.kode_guru;
    const teacherName = teacherSession.name || teacherSession.nama_guru || "Guru";

    if (editingExam) {
      const { error } = await supabase
        .from("exams")
        .update({
          title: formData.title,
          description: formData.description,
          class_id: formData.class_id,
          duration_minutes: formData.duration_minutes,
          status: formData.status,
          instructions: formData.instructions,
          shuffle_questions: formData.shuffle_questions,
          shuffle_options: formData.shuffle_options,
          show_results: formData.show_results,
          passing_score: formData.passing_score,
        })
        .eq("id", editingExam.id);

      if (error) {
        toast("Gagal mengupdate", "error");
      } else {
        if (editingExam.status !== "published" && formData.status === "published") {
          await notifyStudentsForPublishedExam(formData.class_id, formData.title, teacherKode, teacherName);
        }

        toast("Berhasil diupdate", "success");
        loadData();
        setIsModalOpen(false);
      }
    } else {
      const { data: newExam, error } = await supabase.from("exams").insert({
        title: formData.title,
        description: formData.description,
        class_id: formData.class_id,
        duration_minutes: formData.duration_minutes,
        status: formData.status,
        instructions: formData.instructions,
        shuffle_questions: formData.shuffle_questions,
        shuffle_options: formData.shuffle_options,
        show_results: formData.show_results,
        passing_score: formData.passing_score,
        teacher_kode: teacherKode,
      }).select().single();

      if (error) {
        toast("Gagal membuat ujian", "error");
      } else {
        if (formData.status === "published" && newExam) {
          await notifyStudentsForPublishedExam(formData.class_id, formData.title, teacherKode, teacherName);
        }

        toast("Ujian berhasil dibuat", "success");

        loadData();
        setIsModalOpen(false);
        if (newExam) {
          openQuestionsModal(newExam);
        }
      }
    }
  };

  const handleDelete = async (exam: Exam) => {
    if (!confirm(`Hapus ujian "${exam.title}"?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("exams").delete().eq("id", exam.id);

    if (error) {
      toast("Gagal menghapus", "error");
    } else {
      toast("Berhasil dihapus", "success");
      loadData();
    }
  };

  const handleToggleStatus = async (exam: Exam) => {
    const newStatus = exam.status === "published" ? "draft" : "published";
    const supabase = createClient();
    const { error } = await supabase.from("exams").update({ status: newStatus }).eq("id", exam.id);
    
    if (!error && newStatus === "published") {
      const sessionData = sessionStorage.getItem("guruSession");
      if (sessionData) {
        const teacherSession = JSON.parse(sessionData);
        const teacherKode = teacherSession.kode_guru;
        const teacherName = teacherSession.name || teacherSession.nama_guru || "Guru";
        await notifyStudentsForPublishedExam(exam.class_id, exam.title, teacherKode, teacherName);
      }
    }
    
    loadData();
  };

  const addNewQuestion = async () => {
    if (!selectedExam) return;
    
    const supabase = createClient();
    const newQuestion = {
      exam_id: selectedExam.id,
      question_text: "Soal baru",
      option_a: "A",
      option_b: "B",
      option_c: "C",
      option_d: "D",
      correct_answer: "A",
      is_essay: false,
      points: 10,
      order_index: questions.length + 1,
    };

    const { data, error } = await supabase
      .from("exam_questions")
      .insert(newQuestion)
      .select()
      .single();

    if (error) {
      toast("Gagal menambahkan soal", "error");
    } else if (data) {
      setQuestions([...questions, data]);
      toast("Soal ditambahkan", "success");
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!confirm("Hapus soal ini?")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("exam_questions")
      .delete()
      .eq("id", questionId);

    if (error) {
      toast("Gagal menghapus soal", "error");
    } else {
      setQuestions(questions.filter(q => q.id !== questionId));
      toast("Soal dihapus", "success");
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // Map and validate data
        const mappedData = jsonData.map((row: any, idx) => {
          const rowData = row as any;
          const rawEssay = (rowData["Is Essay"] || rowData["Essay"] || rowData["Tipe"] || "No")
            .toString()
            .toLowerCase()
            .trim();
          const isEssay = ["yes", "ya", "essay", "esai", "true", "1"].includes(rawEssay);
          const parsedPoints = parseInt((rowData["Points"] || rowData["Poin"] || "10").toString(), 10);

          return {
            question_text: rowData["Question"] || rowData["Soal"] || rowData["Pertanyaan"] || "",
            option_a: rowData["Option A"] || rowData["Opsi A"] || "",
            option_b: rowData["Option B"] || rowData["Opsi B"] || "",
            option_c: rowData["Option C"] || rowData["Opsi C"] || "",
            option_d: rowData["Option D"] || rowData["Opsi D"] || "",
            option_e: rowData["Option E"] || rowData["Opsi E"] || "",
            correct_answer: (rowData["Correct Answer"] || rowData["Jawaban Benar"] || "A").toString().toUpperCase().charAt(0),
            points: Number.isFinite(parsedPoints) ? parsedPoints : 10,
            is_essay: isEssay,
            explanation: rowData["Explanation"] || rowData["Penjelasan"] || "",
            order_index: idx + 1,
          };
        }).filter((row: any) => row.question_text); // Filter out empty rows

        if (mappedData.length === 0) {
          toast("Tidak ada data yang valid dalam file", "error");
          return;
        }

        setImportPreview(mappedData);
        setIsImportModalOpen(true);
      } catch (err) {
        console.error(err);
        toast("Gagal membaca file Excel", "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ""; // Reset input
  };

  const executeImport = async () => {
    if (!selectedExam || importPreview.length === 0) return;

    const supabase = createClient();
    
    // Prepare questions for insertion
    const questionsToInsert = importPreview.map(q => ({
      exam_id: selectedExam.id,
      question_text: q.question_text,
      option_a: q.option_a || null,
      option_b: q.option_b || null,
      option_c: q.option_c || null,
      option_d: q.option_d || null,
      option_e: q.option_e || null,
      correct_answer: q.is_essay ? null : (q.correct_answer || "A"),
      is_essay: q.is_essay || false,
      points: q.points || 10,
      explanation: q.explanation || null,
      order_index: q.order_index,
    }));

    const { data, error } = await supabase
      .from("exam_questions")
      .insert(questionsToInsert)
      .select();

    if (error) {
      toast("Gagal mengimport soal: " + error.message, "error");
    } else if (data) {
      setQuestions([...questions, ...data]);
      toast(`Berhasil import ${data.length} soal`, "success");
      setIsImportModalOpen(false);
      setImportPreview([]);
    }
  };

  const triggerImportPicker = () => {
    importInputRef.current?.click();
  };

  const downloadImportTemplate = () => {
    const templateRows = [
      {
        No: 1,
        Question: "Bahasa pemrograman untuk web frontend adalah...",
        "Option A": "HTML",
        "Option B": "CSS",
        "Option C": "JavaScript",
        "Option D": "Semua benar",
        "Option E": "",
        "Correct Answer": "D",
        Points: 10,
        "Is Essay": "No",
        Explanation: "HTML, CSS, dan JavaScript dipakai di frontend.",
      },
      {
        No: 2,
        Question: "Jelaskan fungsi utama database pada aplikasi web.",
        "Option A": "",
        "Option B": "",
        "Option C": "",
        "Option D": "",
        "Option E": "",
        "Correct Answer": "",
        Points: 20,
        "Is Essay": "Yes",
        Explanation: "Menyimpan, mengelola, dan mengambil data aplikasi.",
      },
    ];

    const guideRows = [
      { Kolom: "Question", Keterangan: "Wajib diisi. Isi pertanyaan/soal." },
      { Kolom: "Option A-E", Keterangan: "Isi opsi pilihan ganda. Untuk essay boleh kosong." },
      { Kolom: "Correct Answer", Keterangan: "Isi A/B/C/D/E. Untuk essay boleh kosong." },
      { Kolom: "Points", Keterangan: "Skor soal, angka. Jika kosong otomatis 10." },
      { Kolom: "Is Essay", Keterangan: "Isi Yes/No (bisa juga Ya/Tidak)." },
      { Kolom: "Explanation", Keterangan: "Opsional. Penjelasan jawaban." },
    ];

    const workbook = XLSX.utils.book_new();
    const templateSheet = XLSX.utils.json_to_sheet(templateRows);
    const guideSheet = XLSX.utils.json_to_sheet(guideRows);

    templateSheet["!cols"] = [
      { wch: 6 },
      { wch: 50 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 16 },
      { wch: 10 },
      { wch: 12 },
      { wch: 50 },
    ];
    guideSheet["!cols"] = [{ wch: 22 }, { wch: 70 }];

    XLSX.utils.book_append_sheet(workbook, templateSheet, "Template Soal");
    XLSX.utils.book_append_sheet(workbook, guideSheet, "Panduan");

    XLSX.writeFile(workbook, `template-import-soal-ujian.xlsx`);
    toast("Template Excel berhasil didownload", "success");
  };

  const updateQuestion = async (questionId: string, data: Partial<ExamQuestion>) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("exam_questions")
      .update(data)
      .eq("id", questionId);

    if (error) {
      toast("Gagal mengupdate soal", "error");
    } else {
      setQuestions(questions.map(q => q.id === questionId ? { ...q, ...data } : q));
      toast("Soal berhasil diupdate", "success");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-[radial-gradient(circle_at_top_left,_rgba(0,43,91,0.12),_transparent_42%),linear-gradient(135deg,_#ffffff,_#edf4ff)] p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles size={14} />
              Exam Studio
            </div>
            <div>
              <h2 className="text-3xl font-bold text-primary">Manajemen ujian guru</h2>
              <p className="mt-2 text-sm text-slate-600">
                Pantau status publish, jumlah soal, submission siswa, dan rata-rata hasil dari satu
                tampilan yang lebih cepat dipindai.
              </p>
            </div>
          </div>
          <Button onClick={() => openModal()} className="bg-success hover:bg-success/90">
            <Plus size={18} />
            Ujian Baru
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryTile icon={ClipboardList} label="Total Ujian" value={`${dashboardSummary.total}`} />
          <SummaryTile icon={Eye} label="Published" value={`${dashboardSummary.published}`} />
          <SummaryTile icon={FileText} label="Total Soal" value={`${dashboardSummary.totalQuestions}`} />
          <SummaryTile icon={Users} label="Submission" value={`${dashboardSummary.totalSubmissions}`} />
          <SummaryTile icon={BarChart3} label="Rata-rata" value={`${dashboardSummary.averageScore}/100`} />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari judul, deskripsi, atau tema ujian..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Semua Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              <SelectItem value={ALL_CLASSES_VALUE}>Target: Semua Kelas</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
              <div className="mt-4 h-4 w-4/5 animate-pulse rounded bg-slate-200" />
              <div className="mt-6 h-24 animate-pulse rounded-2xl bg-slate-100" />
            </div>
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Belum Ada Ujian
          </h3>
          <p className="text-gray-500 mb-4">Buat ujian baru untuk siswa</p>
          <Button onClick={() => openModal()} className="bg-success hover:bg-success/90">
            <Plus size={18} />
            Buat Ujian
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredExams.map((exam) => {
            const className = getExamClassLabel(exam.class_id);
            const currentQuestionCount = questionCounts[exam.id] || 0;
            const currentSubmissionCount = submissionCounts[exam.id] || 0;
            const currentAverage = averageScores[exam.id] || 0;

            return (
              <article
                key={exam.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        exam.status === "published" ? "bg-success/10 text-success" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {exam.status === "published" ? "Published" : "Draft"}
                    </span>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{exam.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500">
                        {exam.description || "Belum ada deskripsi tambahan untuk ujian ini."}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rata-rata</p>
                    <p className="mt-2 text-xl font-bold text-slate-900">{currentAverage}/100</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricTile icon={Users} label="Kelas" value={className} />
                  <MetricTile icon={Clock} label="Durasi" value={formatDurationLabel(exam.duration_minutes || 90)} />
                  <MetricTile icon={FileText} label="Jumlah Soal" value={`${currentQuestionCount}`} />
                  <MetricTile icon={Target} label="Submission" value={`${currentSubmissionCount}`} />
                </div>

                <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <ActionChip onClick={() => openQuestionsModal(exam)} icon={FileText} label="Kelola Soal" />
                  <ActionChip
                    onClick={() => {
                      openResultsModal(exam);
                      loadEssayAnswers(exam.id);
                    }}
                    icon={CheckCircle}
                    label="Hasil"
                  />
                  <ActionChip
                    onClick={() => {
                      setSelectedExam(exam);
                      loadEssayAnswers(exam.id);
                      setIsResultsModalOpen(true);
                    }}
                    icon={BarChart3}
                    label="Koreksi Essay"
                  />
                  <ActionChip
                    onClick={() => handleToggleStatus(exam)}
                    icon={exam.status === "published" ? EyeOff : Eye}
                    label={exam.status === "published" ? "Set Draft" : "Publish"}
                  />
                  <ActionChip onClick={() => openModal(exam)} icon={Edit2} label="Edit" />
                  <ActionChip onClick={() => handleDelete(exam)} icon={Trash2} label="Hapus" tone="danger" />
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExam ? "Edit Ujian" : "Buat Ujian Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Judul Ujian</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Ulangan Harian Bab 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Kelas</Label>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsClassPickerOpen((prev) => !prev)}
                  className="flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200/80 bg-white/88 px-4 py-2 text-sm font-medium text-slate-900 shadow-sm ring-offset-background placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyber/40 focus:ring-offset-2 focus:border-cyber/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950/72 dark:text-slate-100 dark:focus:ring-offset-slate-950"
                >
                  <span className={!formData.class_id ? "text-slate-400" : ""}>
                    {!formData.class_id
                      ? "Pilih Kelas"
                      : getExamClassLabel(formData.class_id)}
                  </span>
                  <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isClassPickerOpen ? "rotate-180" : ""}`} />
                </button>

                {isClassPickerOpen && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <button
                        type="button"
                        onClick={() => toggleTargetClass(ALL_CLASSES_VALUE)}
                        className={`flex flex-1 items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                          selectedTargetClassIds.includes(ALL_CLASSES_VALUE)
                            ? "bg-primary/10 text-primary"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>Semua Kelas</span>
                        <input
                          type="checkbox"
                          readOnly
                          checked={selectedTargetClassIds.includes(ALL_CLASSES_VALUE)}
                          className="h-4 w-4 pointer-events-none"
                        />
                      </button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearTargetClasses}>
                        Reset
                      </Button>
                    </div>

                    <div className="mt-3 grid max-h-56 gap-2 overflow-y-auto pr-1">
                      {classes.map((cls) => {
                        const isChecked =
                          selectedTargetClassIds.includes(ALL_CLASSES_VALUE) ||
                          selectedTargetClassIds.includes(cls.id);

                        return (
                          <button
                            key={cls.id}
                            type="button"
                            onClick={() => toggleTargetClass(cls.id)}
                            disabled={selectedTargetClassIds.includes(ALL_CLASSES_VALUE)}
                            className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                              isChecked
                                ? "bg-sky-50 text-sky-900"
                                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <span>{cls.name}</span>
                            <input
                              type="checkbox"
                              readOnly
                              checked={isChecked}
                              className="h-4 w-4 pointer-events-none"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formData.class_id && (
                  <p className="text-xs text-slate-500">
                    Target: {getTargetClassNames(formData.class_id).join(", ")}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Durasi (menit)</Label>
              <Select
                value={formData.duration_minutes.toString()}
                onValueChange={(v) => setFormData({ ...formData, duration_minutes: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 menit</SelectItem>
                  <SelectItem value="60">60 menit</SelectItem>
                  <SelectItem value="90">90 menit</SelectItem>
                  <SelectItem value="120">120 menit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as "draft" | "published" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="instructions">Instruksi Ujian</Label>
              <textarea
                id="instructions"
                value={formData.instructions || ""}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Petunjuk untuk siswa..."
                className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passing_score">Nilai Minimal (%)</Label>
                <Input
                  id="passing_score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passing_score || 70}
                  onChange={(e) => setFormData({ ...formData, passing_score: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tampilkan Hasil</Label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="show_results"
                    checked={formData.show_results !== false}
                    onChange={(e) => setFormData({ ...formData, show_results: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="show_results" className="text-sm">Tampilkan nilai setelah submit</label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shuffle_questions"
                  checked={formData.shuffle_questions || false}
                  onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="shuffle_questions" className="text-sm">Acak soal</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shuffle_options"
                  checked={formData.shuffle_options || false}
                  onChange={(e) => setFormData({ ...formData, shuffle_options: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="shuffle_options" className="text-sm">Acak opsi jawaban</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} className="bg-success hover:bg-success/90">
              {editingExam ? "Update" : "Buat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Questions Management Modal */}
      <Dialog open={isQuestionsModalOpen} onOpenChange={setIsQuestionsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Kelola Soal - {selectedExam?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {isQuestionsLoading ? (
              <div className="text-center py-8">Memuat soal...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Belum ada soal untuk ujian ini</p>
                <p className="text-sm mt-2">Tambahkan soal di bawah</p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={q.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start">
<div className="flex-1">
                         <p className="font-medium">{idx + 1}. {q.question_text}</p>
                         {q.is_essay ? (
                           <p className="text-xs text-gray-500 mt-1">Essay ({q.points} poin)</p>
                         ) : (
                           <div className="text-xs text-gray-500 mt-1 space-x-2">
                             <span>A: {q.option_a}</span>
                             <span>B: {q.option_b}</span>
                             <span>C: {q.option_c}</span>
                             <span>D: {q.option_d}</span>
                             {q.option_e && <span>E: {q.option_e}</span>}
                             <span className="font-bold text-green-600">Jawaban: {q.correct_answer}</span>
                           </div>
                         )}
                       </div>
                       <div className="flex gap-1">
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => openEditQuestionModal(q)}
                           className="text-info"
                         >
                           <Edit2 size={14} />
                         </Button>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => deleteQuestion(q.id)}
                           className="text-danger"
                         >
                           <Trash2 size={14} />
                         </Button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="p-4 border-t">
            <div className="flex gap-2 w-full">
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileImport}
                className="hidden"
              />
              <Button variant="outline" onClick={downloadImportTemplate}>
                <Download size={16} className="mr-2" />
                Download Template
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={triggerImportPicker}>
                <Upload size={16} className="mr-2" />
                Import Excel
              </Button>
              <Button onClick={addNewQuestion} className="bg-success">
                <Plus size={16} /> Tambah
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Modal */}
      <Dialog open={isEditQuestionModalOpen} onOpenChange={setIsEditQuestionModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Soal</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Pertanyaan</Label>
                <textarea
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_essay"
                    checked={editingQuestion.is_essay || false}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, is_essay: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_essay">Soal Essay</label>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Poin</Label>
                  <Input
                    type="number"
                    value={editingQuestion.points || 10}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, points: parseInt(e.target.value) })}
                    className="w-20"
                  />
                </div>
              </div>

              {!editingQuestion.is_essay && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Opsi A</Label>
                      <Input
                        value={editingQuestion.option_a || ""}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, option_a: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Opsi B</Label>
                      <Input
                        value={editingQuestion.option_b || ""}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, option_b: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Opsi C</Label>
                      <Input
                        value={editingQuestion.option_c || ""}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, option_c: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Opsi D</Label>
                      <Input
                        value={editingQuestion.option_d || ""}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, option_d: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Jawaban Benar</Label>
                    <Select
                      value={editingQuestion.correct_answer || "A"}
                      onValueChange={(v) => setEditingQuestion({ ...editingQuestion, correct_answer: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Penjelasan (opsional)</Label>
                <textarea
                  value={editingQuestion.explanation || ""}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                  className="w-full min-h-[60px] px-3 py-2 border rounded-md"
                  placeholder="Penjelasan jawaban yang benar..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditQuestionModalOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                if (editingQuestion) {
                  updateQuestion(editingQuestion.id, editingQuestion);
                  setIsEditQuestionModalOpen(false);
                }
              }}
              className="bg-success"
            >
              <Save size={16} className="mr-2" />
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Results Modal */}
      <Dialog open={isResultsModalOpen} onOpenChange={setIsResultsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Hasil Ujian - {selectedExam?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {isScoresLoading ? (
              <div className="text-center py-8">Memuat...</div>
            ) : examScores.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Belum ada siswa yang mengerjakan ujian ini</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total: {examScores.length} siswa | 
                    Rata-rata: {Math.round(examScores.reduce((sum, s) => sum + (s.score || 0), 0) / examScores.length)}%
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={exportToExcel}
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                    >
                      <Download size={16} className="mr-1" />
                      Excel
                    </Button>
                    <Button
                      onClick={exportToPDF}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-600 hover:bg-red-50"
                    >
                      <Download size={16} className="mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">No</th>
                        <th className="px-3 py-2 text-left">Foto</th>
                        <th className="px-3 py-2 text-left">NIS</th>
                        <th className="px-3 py-2 text-left">Nama</th>
                        <th className="px-3 py-2 text-left">Nilai</th>
                        <th className="px-3 py-2 text-left">Poin</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Waktu Submit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {examScores.map((score, idx) => {
                        const passingScore = selectedExam?.passing_score || 70;
                        const isPassed = (score.score || 0) >= passingScore;
                        return (
                        <tr key={score.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{idx + 1}</td>
                          <td className="px-3 py-2">
                            <Avatar src={score.student_avatar} name={score.student_name} size="sm" />
                          </td>
                          <td className="px-3 py-2">{score.student_nis}</td>
                          <td className="px-3 py-2">{score.student_name}</td>
                          <td className="px-3 py-2">
                            <span className={`font-bold ${
                              isPassed ? "text-green-600" : "text-red-600"
                            }`}>
                              {score.score}%
                            </span>
                          </td>
                          <td className="px-3 py-2">{score.earned_points} / {score.total_points}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              isPassed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {isPassed ? "LULUS" : "TIDAK"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {score.submitted_at ? new Date(score.submitted_at).toLocaleString("id-ID") : "-"}
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          
          {/* Essay Grading Section */}
          {essayAnswers.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-4">Koreksi Jawaban Essay ({essayAnswers.length})</h3>
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {essayAnswers.map((answer, idx) => (
                  <div key={answer.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{answer.student_nis} - {answer.student_name}</p>
                        <p className="text-xs text-gray-500">Soal: {answer.question_text.substring(0, 60)}...</p>
                      </div>
                      <div className="text-right">
                        {answer.graded_at ? (
                          <span className="text-green-600 text-sm font-medium">
                            Dinilai: {answer.points_earned}/{answer.points_earned !== answer.points_earned ? "?" : "10"}
                          </span>
                        ) : (
                          <span className="text-yellow-600 text-sm">Belum dinilai</span>
                        )}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded text-sm mb-2">
                      <strong>Jawaban:</strong> {answer.answer || "-"}
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Poin"
                        defaultValue={answer.points_earned || ""}
                        className="w-20 px-2 py-1 border rounded text-sm"
                        id={`points-${answer.id}`}
                      />
                      <Button
                        size="sm"
                        className="bg-success"
                        onClick={() => {
                          const points = parseInt((document.getElementById(`points-${answer.id}`) as HTMLInputElement).value) || 0;
                          gradeEssayAnswer(answer.id, points, "");
                        }}
                      >
                        Simpan
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResultsModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview Import ({importPreview.length} soal)</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {importPreview.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Tidak ada data untuk diimport</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left">No</th>
                      <th className="px-2 py-2 text-left">Pertanyaan</th>
                      <th className="px-2 py-2 text-left">A</th>
                      <th className="px-2 py-2 text-left">B</th>
                      <th className="px-2 py-2 text-left">C</th>
                      <th className="px-2 py-2 text-left">D</th>
                      <th className="px-2 py-2 text-left">Jawaban</th>
                      <th className="px-2 py-2 text-left">Poin</th>
                      <th className="px-2 py-2 text-left">Essay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importPreview.map((q, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-2 py-2">{idx + 1}</td>
                        <td className="px-2 py-2 max-w-xs truncate" title={q.question_text}>
                          {q.question_text}
                        </td>
                        <td className="px-2 py-2 max-w-xs truncate">{q.option_a || "-"}</td>
                        <td className="px-2 py-2 max-w-xs truncate">{q.option_b || "-"}</td>
                        <td className="px-2 py-2 max-w-xs truncate">{q.option_c || "-"}</td>
                        <td className="px-2 py-2 max-w-xs truncate">{q.option_d || "-"}</td>
                        <td className="px-2 py-2">{q.is_essay ? "-" : q.correct_answer}</td>
                        <td className="px-2 py-2">{q.points}</td>
                        <td className="px-2 py-2">
                          {q.is_essay ? (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Yes</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsImportModalOpen(false); setImportPreview([]); }}>
              Batal
            </Button>
            <Button onClick={executeImport} className="bg-success" disabled={importPreview.length === 0}>
              <Upload size={16} className="mr-2" />
              Import {importPreview.length} Soal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
        <Icon size={16} className="text-primary" />
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ActionChip({
  onClick,
  icon: Icon,
  label,
  tone = "default",
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
        tone === "danger"
          ? "border-danger/20 bg-danger/5 text-danger hover:bg-danger/10"
          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
