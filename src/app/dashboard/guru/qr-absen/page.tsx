"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  CalendarDays,
  Camera,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Copy,
  Edit3,
  FileSpreadsheet,
  History,
  Keyboard,
  QrCode,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logActivity } from "@/lib/activity-logger";
import { notifyAttendance, notifyNewAttendanceSession } from "@/lib/notifications";
import { readPageCache, writePageCache } from "@/lib/page-cache";
import { useRouteCacheActive } from "@/components/route-cache";
import type { AttendanceRecord, AttendanceSession, Class, Student } from "@/types";

const TEACHER_QR_CACHE_KEY = "teacher-qr-absen-cache";

type TeacherQrAbsenCache = {
  activeTab: "session" | "history";
  selectedClassId: string;
  recapClassId: string;
  recapDate: string;
  duration: number;
  currentSession: AttendanceSession | null;
  records: AttendanceRecord[];
  manualNis: string;
};

type ScanFeedback = {
  variant: "success" | "already" | "error";
  message: string;
};

type AttendanceRecordWithStudent = AttendanceRecord & {
  student?: Pick<Student, "nis" | "name" | "absen" | "class_id"> | null;
};

type DailyAttendanceRow = {
  student: Pick<Student, "nis" | "name" | "absen" | "class_id">;
  record: AttendanceRecordWithStudent | null;
  session: AttendanceSession | null;
  state: "present" | "late" | "absent" | "unrecorded";
};

const playSuccessSound = () => {
  const audio = new Audio("/sounds/success.mp3");
  audio.play().catch(() => fallbackSound("success"));
};

const playErrorSound = () => {
  const audio = new Audio("/sounds/error.mp3");
  audio.play().catch(() => fallbackSound("error"));
};

const fallbackSound = (type: "success" | "error") => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = type === "success" ? 880 : 440;
  oscillator.type = "sine";
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

const getDateInputValue = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
};

const getDateRangeIso = (dateValue: string) => {
  const start = new Date(`${dateValue}T00:00:00`);
  const end = new Date(`${dateValue}T23:59:59.999`);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

const getRecapRecordedAt = (dateValue: string) => {
  const base = dateValue === getDateInputValue() ? new Date() : new Date(`${dateValue}T07:00:00`);
  return base.toISOString();
};

export default function TeacherQRAbsenPage() {
  const isRouteActive = useRouteCacheActive();
  const [activeTab, setActiveTab] = useState<"session" | "history">("session");
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [recapClassId, setRecapClassId] = useState<string>("");
  const [recapDate, setRecapDate] = useState<string>(getDateInputValue());
  const [duration, setDuration] = useState<number>(30);
  const [currentSession, setCurrentSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecordWithStudent[]>([]);
  const [manualNis, setManualNis] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [timeNow, setTimeNow] = useState(() => Date.now());
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback | null>(null);
  const [dailySessions, setDailySessions] = useState<AttendanceSession[]>([]);
  const [dailyRows, setDailyRows] = useState<DailyAttendanceRow[]>([]);
  const [isLoadingDailyRecap, setIsLoadingDailyRecap] = useState(false);
  const [editingRow, setEditingRow] = useState<DailyAttendanceRow | null>(null);
  const [editStatus, setEditStatus] = useState<"present" | "late" | "absent">("present");
  const [editNotes, setEditNotes] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const hasRestoredCache = useRef(false);
  const isSyncingExpiredSession = useRef(false);
  const isProcessingScan = useRef(false);
  const scannerRef = useRef<any>(null);

  const activeClassId = currentSession?.class_id || selectedClassId;
  const className = useMemo(
    () => classes.find((item) => item.id === activeClassId)?.name || "-",
    [classes, activeClassId]
  );
  const recapClassName = useMemo(
    () => classes.find((item) => item.id === recapClassId)?.name || "-",
    [classes, recapClassId]
  );
  const dailySummary = useMemo(() => {
    const summary = {
      present: 0,
      late: 0,
      absent: 0,
      unrecorded: 0,
    };

    dailyRows.forEach((row) => {
      summary[row.state] += 1;
    });

    return summary;
  }, [dailyRows]);
  const activeSessionRows = useMemo(() => {
    if (!activeClassId) return [];

    const recordMap = new Map(records.map((record) => [record.student_nis, record]));
    return students.map((student) => {
      const record = recordMap.get(student.nis) || null;
      return {
        student,
        record,
        state: (record?.status || "unrecorded") as DailyAttendanceRow["state"],
      };
    });
  }, [students, records, activeClassId]);

  useEffect(() => {
    const cached = readPageCache<TeacherQrAbsenCache>(TEACHER_QR_CACHE_KEY);
    if (cached) {
      setActiveTab(cached.activeTab || "session");
      setSelectedClassId(cached.selectedClassId || "");
      setRecapClassId(cached.recapClassId || "");
      setRecapDate(cached.recapDate || getDateInputValue());
      setDuration(cached.duration || 30);
      setCurrentSession(cached.currentSession);
      setRecords((cached.records as AttendanceRecordWithStudent[]) || []);
      setManualNis(cached.manualNis || "");
    }
    hasRestoredCache.current = true;
    void loadClasses();

    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeClassId) {
      setStudents([]);
      return;
    }

    void loadStudents(activeClassId);
  }, [activeClassId]);

  useEffect(() => {
    if (!recapClassId) {
      setDailyRows([]);
      setDailySessions([]);
      return;
    }

    void loadDailyRecap(recapClassId, recapDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recapClassId, recapDate]);

  useEffect(() => {
    if (!currentSession || !isRouteActive) return;

    void loadRecords(currentSession);

    const supabase = createClient();
    const refreshRecords = () => {
      setTimeNow(Date.now());
      void loadRecords(currentSession);
      if (recapClassId) {
        void loadDailyRecap(recapClassId, recapDate);
      }
    };

    const channel = supabase
      .channel(`session_${currentSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `session_id=eq.${currentSession.id}`,
        },
        refreshRecords
      )
      .subscribe();

    const pollId = window.setInterval(refreshRecords, 5000);
    const timerId = window.setInterval(() => {
      setTimeNow(Date.now());
    }, 1000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshRecords();
      }
    };

    window.addEventListener("focus", refreshRecords);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(pollId);
      window.clearInterval(timerId);
      window.removeEventListener("focus", refreshRecords);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [currentSession, isRouteActive, recapClassId, recapDate]);

  useEffect(() => {
    if (!currentSession || !isSessionExpired(currentSession) || isSyncingExpiredSession.current) {
      return;
    }

    isSyncingExpiredSession.current = true;
    void syncExpiredSession(currentSession.id).finally(() => {
      isSyncingExpiredSession.current = false;
    });
  }, [currentSession, timeNow]);

  useEffect(() => {
    if (!hasRestoredCache.current) return;

    writePageCache<TeacherQrAbsenCache>(TEACHER_QR_CACHE_KEY, {
      activeTab,
      selectedClassId,
      recapClassId,
      recapDate,
      duration,
      currentSession,
      records,
      manualNis,
    });
  }, [activeTab, selectedClassId, recapClassId, recapDate, duration, currentSession, records, manualNis]);

  const getTeacherSession = () => {
    const sessionData = sessionStorage.getItem("guruSession");
    return sessionData ? JSON.parse(sessionData) : null;
  };

  const loadClasses = async () => {
    const supabase = createClient();

    const { data } = await supabase.from("classes").select("*").order("name");
    if (data) {
      setClasses(data);
      if (!selectedClassId && data[0]) {
        setSelectedClassId(data[0].id);
      }
      if (!recapClassId && data[0]) {
        setRecapClassId(data[0].id);
      }
    }

    await restoreActiveSession();
    setIsLoading(false);
  };

  const loadStudents = async (classId: string) => {
    const supabase = createClient();

    const { data } = await supabase
      .from("students")
      .select("nis, name, absen, class_id")
      .eq("class_id", classId)
      .order("absen", { ascending: true })
      .order("name", { ascending: true });

    setStudents(data || []);
  };

  const restoreActiveSession = async () => {
    const teacher = getTeacherSession();
    if (!teacher) return;

    const teacherKode = teacher.kode_guru || teacher.id;
    const supabase = createClient();

    const { data } = await supabase
      .from("attendance_sessions")
      .select("*")
      .eq("teacher_kode", teacherKode)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return;

    setCurrentSession(data);
    setSelectedClassId(data.class_id);
    setRecapClassId((previous) => previous || data.class_id);
  };

  const handleGenerate = async () => {
    if (!selectedClassId) {
      toast("Pilih kelas terlebih dahulu", "error");
      return;
    }

    const teacher = getTeacherSession();
    if (!teacher) {
      toast("Sesi guru tidak ditemukan, silakan login ulang", "error");
      return;
    }

    setIsGenerating(true);
    const supabase = createClient();

    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + duration);

      const { data: session, error } = await supabase
        .from("attendance_sessions")
        .insert({
          teacher_kode: teacher.kode_guru || teacher.id,
          class_id: selectedClassId,
          code,
          duration_minutes: duration,
          expires_at: expiresAt.toISOString(),
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(session);
      setScanFeedback(null);
      setRecapClassId(selectedClassId);
      setRecapDate(getDateInputValue(new Date(session.started_at || session.created_at)));
      toast("Sesi absensi berhasil dimulai", "success");

      await notifyNewAttendanceSession(
        selectedClassId,
        classes.find((item) => item.id === selectedClassId)?.name || "",
        teacher.kode_guru || teacher.id,
        teacher.name,
        code
      );
    } catch (error) {
      console.error("Generate attendance session error:", error);
      toast("Gagal memulai sesi absensi", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = async () => {
    if (!currentSession) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("attendance_sessions")
      .update({
        status: "cancelled",
        closed_at: new Date().toISOString(),
      })
      .eq("id", currentSession.id);

    if (error) {
      toast("Gagal membatalkan sesi", "error");
      return;
    }

    await stopScanner();
    resetSessionState();
    if (recapClassId) {
      await loadDailyRecap(recapClassId, recapDate);
    }
    toast("Sesi absensi dibatalkan", "success");
  };

  const loadRecords = async (sessionOverride?: AttendanceSession | null) => {
    const sessionToLoad = sessionOverride || currentSession;
    if (!sessionToLoad) return;

    const supabase = createClient();

    const { data } = await supabase
      .from("attendance_records")
      .select(`
        *,
        student:students(nis, name, absen, class_id)
      `)
      .eq("session_id", sessionToLoad.id)
      .order("recorded_at", { ascending: false });

    setRecords((data as AttendanceRecordWithStudent[]) || []);
  };

  const loadDailyRecap = async (classId: string, dateValue: string) => {
    const teacher = getTeacherSession();
    if (!teacher || !classId) return;

    setIsLoadingDailyRecap(true);
    const supabase = createClient();
    const { startIso, endIso } = getDateRangeIso(dateValue);
    const teacherKode = teacher.kode_guru || teacher.id;

    try {
      const [{ data: classStudents }, { data: sessions }] = await Promise.all([
        supabase
          .from("students")
          .select("nis, name, absen, class_id")
          .eq("class_id", classId)
          .order("absen", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("attendance_sessions")
          .select("*")
          .eq("teacher_kode", teacherKode)
          .eq("class_id", classId)
          .gte("started_at", startIso)
          .lte("started_at", endIso)
          .order("started_at", { ascending: false }),
      ]);

      const studentList = (classStudents || []) as Pick<Student, "nis" | "name" | "absen" | "class_id">[];
      const sessionList = (sessions || []) as AttendanceSession[];
      setDailySessions(sessionList);

      if (sessionList.length === 0) {
        setDailyRows(
          studentList.map((student) => ({
            student,
            record: null,
            session: null,
            state: "unrecorded",
          }))
        );
        return;
      }

      const sessionIds = sessionList.map((session) => session.id);
      const { data: recapRecords } = await supabase
        .from("attendance_records")
        .select(`
          *,
          student:students(nis, name, absen, class_id)
        `)
        .in("session_id", sessionIds)
        .order("recorded_at", { ascending: false });

      const recordsList = (recapRecords || []) as AttendanceRecordWithStudent[];
      const recordMap = new Map<string, AttendanceRecordWithStudent>();
      recordsList.forEach((record) => {
        if (!recordMap.has(record.student_nis)) {
          recordMap.set(record.student_nis, record);
        }
      });

      const sessionMap = new Map(sessionList.map((session) => [session.id, session]));
      const rows = studentList.map((student) => {
        const record = recordMap.get(student.nis) || null;
        return {
          student,
          record,
          session: record ? sessionMap.get(record.session_id) || null : null,
          state: record?.status || "unrecorded",
        } as DailyAttendanceRow;
      });

      setDailyRows(rows);
    } catch (error) {
      console.error("Load daily recap error:", error);
      toast("Gagal memuat rekap absensi harian", "error");
    } finally {
      setIsLoadingDailyRecap(false);
    }
  };

  const syncExpiredSession = async (sessionId: string) => {
    const supabase = createClient();

    await supabase
      .from("attendance_sessions")
      .update({
        status: "expired",
        closed_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("status", "active");

    await stopScanner();
    resetSessionState();
    if (recapClassId) {
      await loadDailyRecap(recapClassId, recapDate);
    }
  };

  const resetSessionState = () => {
    setCurrentSession(null);
    setRecords([]);
    setScanFeedback(null);
    setManualNis("");
  };

  const isSessionExpired = (session: AttendanceSession) =>
    new Date(session.expires_at).getTime() <= Date.now();

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDateTime = (date: string) =>
    new Date(date).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getTimeRemaining = () => {
    if (!currentSession) return "";

    const expires = new Date(currentSession.expires_at).getTime();
    const diff = expires - timeNow;

    if (diff <= 0) return "Expired";

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const copyCode = async () => {
    if (!currentSession) return;

    await navigator.clipboard.writeText(currentSession.code);
    toast("Kode sesi berhasil disalin", "success");
  };

  const exportSessionToExcel = () => {
    if (records.length === 0) {
      toast("Belum ada data absensi untuk diexport", "error");
      return;
    }

    const wsData = [
      ["Laporan Absensi Sesi Aktif"],
      ["Kelas:", className],
      ["Kode Sesi:", currentSession?.code || "-"],
      ["Tanggal:", new Date().toLocaleDateString("id-ID")],
      [],
      ["No", "Absen", "NIS", "Nama Siswa", "Waktu Absen", "Status", "Sumber"],
      ...records.map((record, index) => [
        index + 1,
        record.student?.absen || "-",
        record.student?.nis || record.student_nis,
        record.student?.name || "Unknown",
        new Date(record.recorded_at).toLocaleTimeString("id-ID"),
        getStatusLabel(record.status),
        getSourceLabel(record.source),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sesi Aktif");
    XLSX.writeFile(wb, `absensi-sesi-${currentSession?.code || "guru"}.xlsx`);
    toast("Berhasil export sesi aktif", "success");
  };

  const exportDailyRecap = () => {
    if (!recapClassId || dailyRows.length === 0) {
      toast("Belum ada data rekap untuk diexport", "error");
      return;
    }

    const wsData = [
      ["Rekap Absensi Harian"],
      ["Kelas:", recapClassName],
      ["Tanggal:", new Date(`${recapDate}T00:00:00`).toLocaleDateString("id-ID")],
      ["Jumlah sesi:", dailySessions.length],
      [],
      ["No", "Absen", "NIS", "Nama Siswa", "Status", "Waktu", "Sumber", "Catatan"],
      ...dailyRows.map((row, index) => [
        index + 1,
        row.student.absen || "-",
        row.student.nis,
        row.student.name,
        getStatusLabel(row.state),
        row.record?.recorded_at ? formatDateTime(row.record.recorded_at) : "-",
        row.record ? getSourceLabel(row.record.source) : "-",
        row.record?.notes || (row.state === "unrecorded" ? "Belum ada catatan absensi" : "-"),
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Harian");
    XLSX.writeFile(wb, `rekap-absensi-${recapClassName}-${recapDate}.xlsx`);
    toast("Berhasil export rekap harian", "success");
  };

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) {
      setIsScanning(false);
      return;
    }

    try {
      await scanner.stop();
    } catch (error) {
      console.error("Error stopping scanner:", error);
    }

    try {
      await scanner.clear();
    } catch (error) {
      console.error("Error clearing scanner:", error);
    }

    scannerRef.current = null;
    setIsScanning(false);
  };

  const startScanner = async () => {
    if (!currentSession) {
      toast("Mulai sesi absensi terlebih dahulu", "error");
      return;
    }

    if (isSessionExpired(currentSession)) {
      toast("Sesi sudah berakhir, silakan buat sesi baru", "error");
      return;
    }

    setScanFeedback(null);
    setIsScanning(true);

    try {
      const Html5Qrcode = (await import("html5-qrcode")).Html5Qrcode;
      const scanner = new Html5Qrcode("teacher-qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        () => undefined
      );
    } catch (error: any) {
      console.error("Error starting scanner:", error);
      if (error?.toString?.()?.includes("Permission") || error?.toString?.()?.includes("NotAllowedError")) {
        toast("Izin kamera diperlukan untuk scan QR siswa", "error");
      } else if (error?.toString?.()?.includes("NotFoundError")) {
        toast("Kamera tidak ditemukan di perangkat ini", "error");
      } else {
        toast("Gagal mengakses kamera", "error");
      }
      setIsScanning(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingScan.current) return;
    isProcessingScan.current = true;

    let scannedNis = decodedText.trim();
    let scannedClassId = "";

    try {
      const parsed = JSON.parse(decodedText);
      if (parsed?.nis) {
        scannedNis = parsed.nis;
        scannedClassId = parsed.class_id || "";
      }
    } catch {
      // Fallback to raw text for older QR payloads.
    }

    if (scannedClassId && currentSession?.class_id && scannedClassId !== currentSession.class_id) {
      setScanFeedback({
        variant: "error",
        message: "QR siswa berasal dari kelas yang berbeda dengan sesi aktif.",
      });
      playErrorSound();
      toast("QR siswa tidak cocok dengan kelas sesi aktif", "error");
      window.setTimeout(() => {
        isProcessingScan.current = false;
      }, 1200);
      return;
    }

    await handleAttendanceByNis(scannedNis, "qr");
    window.setTimeout(() => {
      isProcessingScan.current = false;
    }, 1200);
  };

  const resolveStudent = async (nis: string) => {
    const normalized = nis.trim();
    if (!normalized) return null;

    const existingStudent = students.find((item) => item.nis === normalized);
    if (existingStudent) return existingStudent;

    const supabase = createClient();
    const { data } = await supabase
      .from("students")
      .select("nis, name, absen, class_id")
      .eq("nis", normalized)
      .maybeSingle();

    return data;
  };

  const handleAttendanceByNis = async (nis: string, source: "qr" | "manual") => {
    if (!currentSession) {
      toast("Tidak ada sesi absensi aktif", "error");
      return;
    }

    if (isSessionExpired(currentSession)) {
      toast("Sesi sudah berakhir, silakan buat sesi baru", "error");
      await syncExpiredSession(currentSession.id);
      return;
    }

    const student = await resolveStudent(nis);
    if (!student) {
      setScanFeedback({
        variant: "error",
        message: `Siswa dengan NIS ${nis} tidak ditemukan.`,
      });
      playErrorSound();
      toast("Siswa tidak ditemukan", "error");
      return;
    }

    if (student.class_id !== currentSession.class_id) {
      setScanFeedback({
        variant: "error",
        message: `${student.name} bukan bagian dari kelas sesi aktif.`,
      });
      playErrorSound();
      toast("Siswa bukan bagian dari kelas sesi aktif", "error");
      return;
    }

    const supabase = createClient();
    const { data: existingRecord } = await supabase
      .from("attendance_records")
      .select("id")
      .eq("session_id", currentSession.id)
      .eq("student_nis", student.nis)
      .maybeSingle();

    if (existingRecord) {
      setScanFeedback({
        variant: "already",
        message: `${student.name} sudah tercatat hadir pada sesi ini.`,
      });
      playErrorSound();
      toast("Siswa sudah tercatat hadir", "info");
      return;
    }

    const { error } = await supabase.from("attendance_records").insert({
      session_id: currentSession.id,
      student_nis: student.nis,
      status: "present",
      source,
      notes: source === "manual" ? "Dicatat manual oleh guru" : "Scan QR siswa oleh guru",
    });

    if (error) {
      console.error("Record attendance error:", error);
      setScanFeedback({
        variant: "error",
        message: `Gagal mencatat absensi untuk ${student.name}.`,
      });
      playErrorSound();
      toast("Gagal mencatat absensi", "error");
      return;
    }

    const teacher = getTeacherSession();

    await supabase.rpc("increment_points", { s_nis: student.nis, amount: 10 });
    await notifyAttendance(
      student.nis,
      student.name,
      "success",
      teacher?.kode_guru || teacher?.id || "",
      teacher?.name || "Guru",
      className,
      true
    );
    await logActivity(teacher?.kode_guru || teacher?.id || "system", "guru", {
      action: "absensi",
      details: `${source === "manual" ? "Input manual" : "Scan QR siswa"} untuk ${student.name}`,
      metadata: {
        session_id: currentSession.id,
        student_nis: student.nis,
        source,
      },
    });

    setManualNis("");
    setScanFeedback({
      variant: "success",
      message: `${student.name} berhasil dicatat hadir.`,
    });
    playSuccessSound();
    toast("Absensi berhasil dicatat", "success");
    await loadRecords();
    if (recapClassId) {
      await loadDailyRecap(recapClassId, recapDate);
    }
  };

  const handleManualSubmit = async () => {
    if (!manualNis.trim()) {
      toast("Masukkan atau pilih NIS siswa terlebih dahulu", "error");
      return;
    }

    setIsSubmittingManual(true);
    try {
      await handleAttendanceByNis(manualNis, "manual");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const openEditDialog = (row: DailyAttendanceRow) => {
    setEditingRow(row);
    setEditStatus(row.record?.status || (row.state === "unrecorded" ? "absent" : row.state));
    setEditNotes(row.record?.notes || "");
  };

  const ensureRecapSession = async () => {
    if (dailySessions[0]) {
      return dailySessions[0];
    }

    const teacher = getTeacherSession();
    if (!teacher || !recapClassId) return null;

    const supabase = createClient();
    const manualCode = `MAN-${recapDate.replaceAll("-", "")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const startedAt = new Date(`${recapDate}T07:00:00`);
    const expiresAt = new Date(`${recapDate}T23:59:59`);
    const isToday = recapDate === getDateInputValue();
    const status: AttendanceSession["status"] = isToday ? "active" : "expired";

    const { data, error } = await supabase
      .from("attendance_sessions")
      .insert({
        teacher_kode: teacher.kode_guru || teacher.id,
        class_id: recapClassId,
        code: manualCode,
        duration_minutes: 1,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status,
        closed_at: status === "expired" ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (error) {
      console.error("Create recap session error:", error);
      return null;
    }

    setDailySessions((previous) => [data, ...previous]);
    return data as AttendanceSession;
  };

  const handleSaveAttendanceEdit = async () => {
    if (!editingRow) return;

    setIsSavingEdit(true);
    const supabase = createClient();
    const teacher = getTeacherSession();

    try {
      const targetSession = editingRow.session || (await ensureRecapSession());
      if (!targetSession) {
        toast("Gagal menyiapkan sesi untuk menyimpan rekap", "error");
        return;
      }

      if (editingRow.record) {
        const { error } = await supabase
          .from("attendance_records")
          .update({
            status: editStatus,
            source: "manual",
            notes: editNotes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingRow.record.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance_records").insert({
          session_id: targetSession.id,
          student_nis: editingRow.student.nis,
          recorded_at: getRecapRecordedAt(recapDate),
          status: editStatus,
          source: "manual",
          notes: editNotes || "Diinput dari rekap harian oleh guru",
        });

        if (error) throw error;
      }

      await logActivity(teacher?.kode_guru || teacher?.id || "system", "guru", {
        action: "absensi",
        details: `Update rekap absensi ${editingRow.student.name} menjadi ${editStatus}`,
        metadata: {
          date: recapDate,
          class_id: recapClassId,
          student_nis: editingRow.student.nis,
          status: editStatus,
        },
      });

      toast("Data absensi berhasil diperbarui", "success");
      setEditingRow(null);
      setEditNotes("");
      await loadDailyRecap(recapClassId, recapDate);
      if (currentSession?.class_id === recapClassId) {
        await loadRecords();
      }
    } catch (error) {
      console.error("Save attendance edit error:", error);
      toast("Gagal memperbarui data absensi", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const getSourceLabel = (source?: AttendanceRecord["source"]) => {
    if (source === "manual") return "Manual";
    if (source === "system") return "Sistem";
    return "QR Siswa";
  };

  const getStatusLabel = (status: DailyAttendanceRow["state"] | AttendanceRecord["status"]) => {
    if (status === "present") return "Hadir";
    if (status === "late") return "Terlambat";
    if (status === "absent") return "Tidak Hadir";
    return "Belum Absen";
  };

  const getStatusClassName = (status: DailyAttendanceRow["state"]) => {
    if (status === "present") return "bg-success/10 text-success";
    if (status === "late") return "bg-warning/10 text-warning";
    if (status === "absent") return "bg-danger/10 text-danger";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">QR Absensi Guru</h2>
        <p className="text-gray-500">
          Guru dapat scan QR siswa, melihat rekap absensi per tanggal, dan mengedit data absensi sesuai kelas.
        </p>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primary">
          Memulihkan sesi absensi terakhir...
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "session" | "history")} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="session">
            <QrCode size={16} />
            Sesi Aktif
          </TabsTrigger>
          <TabsTrigger value="history">
            <History size={16} />
            Rekap Harian
          </TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-800">Pengaturan Sesi</h3>

              {!currentSession ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="class">Pilih Kelas</Label>
                    <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                      <SelectTrigger>
                        <SelectValue placeholder="-- Pilih Kelas --" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Durasi Valid (Menit)</Label>
                    <Select value={duration.toString()} onValueChange={(value) => setDuration(Number(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 menit</SelectItem>
                        <SelectItem value="10">10 menit</SelectItem>
                        <SelectItem value="15">15 menit</SelectItem>
                        <SelectItem value="30">30 menit</SelectItem>
                        <SelectItem value="60">60 menit</SelectItem>
                        <SelectItem value="120">120 menit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={!selectedClassId || isGenerating}
                    className="w-full bg-primary hover:bg-primary-light"
                  >
                    <ClipboardCheck size={18} />
                    {isGenerating ? "Memulai..." : "Mulai Sesi Absensi"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <QrCode size={22} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Sesi Aktif</p>
                        <p className="text-lg font-bold text-primary">{className}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-gray-600">
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                        <span>Kode sesi</span>
                        <span className="font-mono font-bold tracking-widest text-primary">{currentSession.code}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                        <span>Berakhir</span>
                        <span>{formatTime(currentSession.expires_at)}</span>
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
                        <span>Sisa waktu</span>
                        <span className="font-semibold text-warning">{getTimeRemaining()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button onClick={copyCode} variant="outline">
                      <Copy size={16} />
                      Salin Kode
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      className="border-danger text-danger hover:bg-danger/10"
                    >
                      <X size={16} />
                      Batalkan
                    </Button>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Minta siswa membuka menu absensi lalu tunjukkan QR masing-masing ke kamera guru.
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Scan atau Input Manual</h3>
                    <p className="text-sm text-gray-500">Guru mencatat absensi dari QR siswa atau NIS manual.</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                    <Users size={14} className="mr-1 inline" />
                    {records.length}
                  </span>
                </div>

                {!currentSession ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Mulai sesi absensi terlebih dahulu agar guru bisa scan QR siswa.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                          <Camera size={22} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Scanner Guru</p>
                          <p className="text-sm text-gray-500">Arahkan kamera ke QR siswa yang tampil di menu absensi siswa.</p>
                        </div>
                      </div>

                      {isScanning ? (
                        <div className="space-y-4">
                          <div
                            id="teacher-qr-reader"
                            className="mx-auto overflow-hidden rounded-xl"
                            style={{ maxWidth: "320px" }}
                          />
                          <Button onClick={() => void stopScanner()} variant="outline" className="w-full">
                            Hentikan Scanner
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={startScanner} className="w-full bg-primary hover:bg-primary-light">
                          <Camera size={18} />
                          Mulai Scan QR Siswa
                        </Button>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                          <Keyboard size={22} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">Input Manual</p>
                          <p className="text-sm text-gray-500">Gunakan jika kamera bermasalah atau QR siswa tidak bisa dibaca.</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="manual-nis">NIS Siswa</Label>
                          <Input
                            id="manual-nis"
                            placeholder="Contoh: 2310001"
                            value={manualNis}
                            onChange={(event) => setManualNis(event.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Pilih Cepat dari Kelas Aktif</Label>
                          <Select value={manualNis} onValueChange={setManualNis}>
                            <SelectTrigger>
                              <SelectValue placeholder="-- Pilih Siswa --" />
                            </SelectTrigger>
                            <SelectContent>
                              {students.map((student) => (
                                <SelectItem key={student.nis} value={student.nis}>
                                  {student.absen ? `${student.absen}. ` : ""}
                                  {student.name} ({student.nis})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          onClick={handleManualSubmit}
                          disabled={isSubmittingManual || !manualNis.trim()}
                          variant="outline"
                          className="w-full"
                        >
                          <CheckCircle size={18} />
                          {isSubmittingManual ? "Menyimpan..." : "Catat Absensi Manual"}
                        </Button>
                      </div>
                    </div>

                    {scanFeedback && (
                      <div
                        className={`rounded-xl border p-4 ${
                          scanFeedback.variant === "success"
                            ? "border-success/30 bg-success/10"
                            : scanFeedback.variant === "already"
                            ? "border-warning/30 bg-warning/10"
                            : "border-danger/30 bg-danger/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {scanFeedback.variant === "success" ? (
                            <CheckCircle size={18} className="text-success" />
                          ) : scanFeedback.variant === "already" ? (
                            <Clock size={18} className="text-warning" />
                          ) : (
                            <XCircle size={18} className="text-danger" />
                          )}
                          <p
                            className={`font-medium ${
                              scanFeedback.variant === "success"
                                ? "text-success"
                                : scanFeedback.variant === "already"
                                ? "text-warning"
                                : "text-danger"
                            }`}
                          >
                            {scanFeedback.message}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-800">Siswa yang Sudah Tercatat</h3>
                  <Button onClick={exportSessionToExcel} variant="outline" size="sm" disabled={records.length === 0}>
                    <FileSpreadsheet size={14} />
                    Export
                  </Button>
                </div>

                {records.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <CheckCircle size={48} className="mx-auto mb-3 opacity-40" />
                    <p>Belum ada absensi tercatat.</p>
                    <p className="text-sm">Guru dapat scan QR siswa atau input manual dari kelas aktif.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {records.map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
                            <CheckCircle size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{record.student?.name || record.student_nis}</p>
                            <p className="text-sm text-gray-500">
                              NIS: {record.student?.nis || record.student_nis}
                              {record.source ? ` • ${getSourceLabel(record.source)}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-success">{getStatusLabel(record.status)}</p>
                          <p className="text-xs text-gray-500">{formatTime(record.recorded_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Daftar Siswa Kelas Aktif</h3>
                    <p className="text-sm text-gray-500">
                      Pantau langsung siapa yang sudah absen dan siapa yang belum absen.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                    {activeSessionRows.length} siswa
                  </span>
                </div>

                {!activeClassId ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Pilih kelas atau mulai sesi absensi untuk menampilkan daftar siswa.
                  </div>
                ) : activeSessionRows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada data siswa pada kelas ini.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSessionRows.map((row) => (
                      <div key={row.student.nis} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${
                              row.state === "present"
                                ? "bg-success/10 text-success"
                                : row.state === "late"
                                ? "bg-warning/10 text-warning"
                                : row.state === "absent"
                                ? "bg-danger/10 text-danger"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            <Users size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {row.student.absen ? `${row.student.absen}. ` : ""}
                              {row.student.name}
                            </p>
                            <p className="text-sm text-gray-500">NIS: {row.student.nis}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-medium ${
                              row.state === "present"
                                ? "text-success"
                                : row.state === "late"
                                ? "text-warning"
                                : row.state === "absent"
                                ? "text-danger"
                                : "text-slate-500"
                            }`}
                          >
                            {getStatusLabel(row.state)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {row.record?.recorded_at ? formatTime(row.record.recorded_at) : "Belum absen"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-2">
                <Label htmlFor="recap-class">Kelas</Label>
                <Select value={recapClassId} onValueChange={setRecapClassId}>
                  <SelectTrigger id="recap-class">
                    <SelectValue placeholder="-- Pilih Kelas --" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recap-date">Tanggal Rekap</Label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="recap-date"
                    type="date"
                    value={recapDate}
                    onChange={(event) => setRecapDate(event.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button onClick={exportDailyRecap} variant="outline" className="w-full lg:w-auto" disabled={dailyRows.length === 0}>
                  <FileSpreadsheet size={16} />
                  Export Rekap
                </Button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
                <p className="text-sm text-gray-500">Hadir</p>
                <p className="mt-1 text-2xl font-bold text-success">{dailySummary.present}</p>
              </div>
              <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
                <p className="text-sm text-gray-500">Terlambat</p>
                <p className="mt-1 text-2xl font-bold text-warning">{dailySummary.late}</p>
              </div>
              <div className="rounded-2xl border border-danger/20 bg-danger/10 p-4">
                <p className="text-sm text-gray-500">Tidak Hadir</p>
                <p className="mt-1 text-2xl font-bold text-danger">{dailySummary.absent}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-gray-500">Belum Absen</p>
                <p className="mt-1 text-2xl font-bold text-slate-700">{dailySummary.unrecorded}</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-slate-600">
              <p className="font-semibold text-primary">Ringkasan Rekap</p>
              <p className="mt-1">
                Rekap tanggal <span className="font-medium">{new Date(`${recapDate}T00:00:00`).toLocaleDateString("id-ID")}</span> untuk kelas{" "}
                <span className="font-medium">{recapClassName}</span>.
                {dailySessions.length > 0
                  ? ` Ditemukan ${dailySessions.length} sesi absensi pada tanggal ini.`
                  : " Belum ada sesi absensi, guru tetap bisa mengisi rekap manual."}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Daftar Siswa dan Status Absensi</h3>
                <p className="text-sm text-gray-500">Daftar mengikuti data siswa pada kelas yang dipilih.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Users size={14} className="mr-1 inline" />
                {dailyRows.length}
              </span>
            </div>

            {isLoadingDailyRecap ? (
              <div className="py-12 text-center text-gray-500">
                <Clock size={40} className="mx-auto mb-3 opacity-40" />
                <p>Memuat rekap absensi...</p>
              </div>
            ) : dailyRows.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Users size={40} className="mx-auto mb-3 opacity-40" />
                <p>Belum ada data siswa pada kelas ini.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dailyRows.map((row) => (
                  <div key={row.student.nis} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${getStatusClassName(row.state)}`}>
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {row.student.absen ? `${row.student.absen}. ` : ""}
                            {row.student.name}
                          </p>
                          <p className="text-sm text-gray-500">NIS: {row.student.nis}</p>
                        </div>
                      </div>

                      <div className="grid gap-2 text-sm text-gray-500 sm:grid-cols-3 lg:min-w-[460px]">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
                          <p className="font-medium text-gray-700">{getStatusLabel(row.state)}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Waktu</p>
                          <p className="font-medium text-gray-700">
                            {row.record?.recorded_at ? formatDateTime(row.record.recorded_at) : "Belum tercatat"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Sumber</p>
                          <p className="font-medium text-gray-700">
                            {row.record ? getSourceLabel(row.record.source) : "Belum absen"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 rounded-xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Catatan</p>
                        <p className="truncate text-sm text-gray-600">
                          {row.record?.notes || (row.state === "unrecorded" ? "Belum ada catatan absensi untuk siswa ini." : "-")}
                        </p>
                      </div>
                      <Button onClick={() => openEditDialog(row)} variant="outline" size="sm">
                        <Edit3 size={14} />
                        Edit Absensi
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editingRow)} onOpenChange={(open) => !open && setEditingRow(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Data Absensi</DialogTitle>
            <DialogDescription>
              Perbarui status absensi untuk {editingRow?.student.name || "siswa"} pada tanggal{" "}
              {new Date(`${recapDate}T00:00:00`).toLocaleDateString("id-ID")}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-gray-800">{editingRow?.student.name}</p>
              <p className="text-sm text-gray-500">NIS {editingRow?.student.nis}</p>
            </div>

            <div className="space-y-2">
              <Label>Status Absensi</Label>
              <Select value={editStatus} onValueChange={(value) => setEditStatus(value as "present" | "late" | "absent")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Hadir</SelectItem>
                  <SelectItem value="late">Terlambat</SelectItem>
                  <SelectItem value="absent">Tidak Hadir</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Catatan</Label>
              <Input
                id="edit-notes"
                placeholder="Contoh: Izin, sakit, atau koreksi data absensi"
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>
              Batal
            </Button>
            <Button onClick={handleSaveAttendanceEdit} disabled={isSavingEdit}>
              {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
