"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { CheckCircle, Clock, Copy, Keyboard, QrCode, RefreshCw, UserSquare2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { notifyAttendance } from "@/lib/notifications";
import { logActivity } from "@/lib/activity-logger";
import type { AttendanceRecord, AttendanceSession, Student } from "@/types";

interface StudentSessionPayload {
  student: Student;
  selected: boolean;
}

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

export default function StudentAttendancePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    void hydratePage();

    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) return;

    const { student: currentStudent } = JSON.parse(sessionData) as StudentSessionPayload;
    const channelTopic = `student-attendance-${currentStudent.nis}`;

    // Prevent duplicate topic reuse (common in StrictMode/hot-reload) which can
    // make realtime think we're adding callbacks after subscribe.
    supabase
      .getChannels()
      .filter((channel) => channel.topic === `realtime:${channelTopic}`)
      .forEach((channel) => {
        void supabase.removeChannel(channel);
      });

    const attendanceChannel = supabase
      .channel(channelTopic)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_sessions",
        },
        () => {
          void loadActiveSession(currentStudent);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_records",
          filter: `student_nis=eq.${currentStudent.nis}`,
        },
        () => {
          void loadMyRecords(currentStudent);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
    };
  }, []);

  useEffect(() => {
    if (!student) return;
    void generateStudentQr(student);
  }, [student]);

  const hydratePage = async () => {
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) return;

    const { student: currentStudent } = JSON.parse(sessionData) as StudentSessionPayload;
    setStudent(currentStudent);

    await Promise.all([loadActiveSession(currentStudent), loadMyRecords(currentStudent)]);
    setIsLoading(false);
  };

  const loadActiveSession = async (currentStudent: Student) => {
    const supabase = createClient();
    const classId = currentStudent.last_class_id || currentStudent.class_id;

    const { data } = await supabase
      .from("attendance_sessions")
      .select("*")
      .eq("status", "active")
      .eq("class_id", classId)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setSession(data || null);
  };

  const loadMyRecords = async (currentStudent: Student) => {
    const supabase = createClient();

    const { data } = await supabase
      .from("attendance_records")
      .select("*, session:attendance_sessions(id, code, class_id, teacher_kode, created_at)")
      .eq("student_nis", currentStudent.nis)
      .order("recorded_at", { ascending: false })
      .limit(10);

    setRecords(data || []);
  };

  const generateStudentQr = async (currentStudent: Student) => {
    if (!canvasRef.current) return;

    const qrData = JSON.stringify({
      type: "student-attendance",
      nis: currentStudent.nis,
      name: currentStudent.name,
      class_id: currentStudent.last_class_id || currentStudent.class_id || null,
      generated_at: new Date().toISOString(),
    });

    try {
      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: 280,
        margin: 2,
        color: {
          dark: "#002b5b",
          light: "#ffffff",
        },
      });

      setQrCodeUrl(canvasRef.current.toDataURL());
    } catch (error) {
      console.error("Student QR generation error:", error);
      toast("Gagal membuat QR siswa", "error");
    }
  };

  const refreshQr = async () => {
    if (!student) return;
    await generateStudentQr(student);
    toast("QR siswa diperbarui", "success");
  };

  const copyNis = async () => {
    if (!student) return;
    await navigator.clipboard.writeText(student.nis);
    toast("NIS berhasil disalin", "success");
  };

  const handleManualAttendance = async () => {
    if (!student) return;

    const code = manualCode.trim().toUpperCase();
    if (!code) {
      playErrorSound();
      toast("Masukkan kode absen dari guru terlebih dahulu", "error");
      return;
    }

    setIsSubmittingManual(true);
    const supabase = createClient();

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("code", code)
        .eq("class_id", student.last_class_id || student.class_id || "")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (sessionError || !sessionData) {
        playErrorSound();
        toast("Kode absen tidak valid atau sudah berakhir", "error");
        return;
      }

      const { data: existingRecord } = await supabase
        .from("attendance_records")
        .select("id")
        .eq("session_id", sessionData.id)
        .eq("student_nis", student.nis)
        .maybeSingle();

      if (existingRecord) {
        playErrorSound();
        toast("Anda sudah tercatat hadir pada sesi ini", "info");
        return;
      }

      const { error: insertError } = await supabase.from("attendance_records").insert({
        session_id: sessionData.id,
        student_nis: student.nis,
        status: "present",
        source: "manual",
        notes: "Input kode absen guru dari menu siswa",
      });

      if (insertError) {
        throw insertError;
      }

      await supabase.rpc("increment_points", { s_nis: student.nis, amount: 10 });
      await notifyAttendance(
        student.nis,
        student.name,
        "success",
        sessionData.teacher_kode || "",
        "Guru",
        undefined,
        true
      );
      await logActivity(student.nis, "siswa", {
        action: "absensi",
        details: `Input kode absensi manual: ${code}`,
        metadata: { session_id: sessionData.id, code, source: "manual-student" },
      });

      setManualCode("");
      setSession(sessionData);
      playSuccessSound();
      toast("Absensi manual berhasil dicatat", "success");
      await loadMyRecords(student);
    } catch (error) {
      console.error("Manual attendance by student error:", error);
      playErrorSound();
      toast("Gagal mencatat absensi manual", "error");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Absensi Siswa</h2>
          <p className="text-gray-500">Tampilkan QR ini ke guru agar kehadiran Anda discan.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primary">
          Menyiapkan QR absensi siswa...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <QrCode size={40} className="text-primary" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">QR Kehadiran Anda</h3>
              <p className="text-sm text-gray-500">Buka halaman ini saat guru melakukan scan absensi.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <canvas ref={canvasRef} className="rounded-2xl" />
              </div>

              <div className="mt-5 w-full rounded-2xl bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-primary shadow-sm">
                    <UserSquare2 size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Identitas Siswa</p>
                    <p className="truncate text-lg font-bold text-gray-800">{student?.name || "-"}</p>
                    <p className="text-sm text-gray-500">NIS {student?.nis || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid w-full gap-3 sm:grid-cols-2">
                <Button onClick={copyNis} variant="outline">
                  <Copy size={16} />
                  Salin NIS
                </Button>
                <Button onClick={refreshQr} className="bg-primary hover:bg-primary-light">
                  <RefreshCw size={16} />
                  Refresh QR
                </Button>
              </div>

              {qrCodeUrl ? (
                <p className="mt-4 text-center text-xs text-gray-400">
                  QR berisi identitas siswa dan akan dibaca langsung oleh guru.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-800">Status Sesi Guru</h3>

              {session ? (
                <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle size={18} />
                    <span className="font-medium">Guru sedang membuka sesi absensi</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Tunjukkan QR Anda sebelum pukul{" "}
                    {new Date(session.expires_at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    .
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
                  <div className="flex items-center gap-2 text-warning">
                    <Clock size={18} />
                    <span className="font-medium">Belum ada sesi absensi aktif</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Tunggu guru memulai sesi, lalu tunjukkan QR Anda saat diminta.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Keyboard size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Input Kode Absen Guru</h3>
                  <p className="text-sm text-gray-500">
                    Jika diminta guru, Anda juga bisa memasukkan kode absen secara manual.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="manual-code">Kode Absen</Label>
                  <Input
                    id="manual-code"
                    placeholder="Contoh: AB12CD"
                    value={manualCode}
                    onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                  />
                </div>

                <Button
                  onClick={handleManualAttendance}
                  disabled={isSubmittingManual || !manualCode.trim()}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle size={16} />
                  {isSubmittingManual ? "Menyimpan..." : "Kirim Absensi Manual"}
                </Button>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-800">Riwayat Absensi</h3>

              {records.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <Clock size={48} className="mx-auto mb-3 opacity-50" />
                  <p>Belum ada riwayat absensi</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {records.map((record) => (
                    <div key={record.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            record.status === "present"
                              ? "bg-success/10 text-success"
                              : record.status === "late"
                              ? "bg-warning/10 text-warning"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          <CheckCircle size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {record.status === "present"
                              ? "Hadir"
                              : record.status === "late"
                              ? "Terlambat"
                              : "Alpha"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(record.recorded_at).toLocaleString("id-ID")}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">
                        {record.source === "manual" ? "Manual guru" : "QR siswa"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
