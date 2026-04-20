"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, BookOpen, User, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase";
import type { Teacher } from "@/types";

export default function GantiGuruPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherKode, setSelectedTeacherKode] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      router.push("/login/siswa");
      return;
    }

    const { student } = JSON.parse(sessionData);

    const { data: teachersData } = await supabase
      .from("teachers")
      .select("*")
      .order("name");

    if (teachersData) setTeachers(teachersData);

    // Pre-fill if already selected in database
    if (student.last_teacher_kode) {
      setSelectedTeacherKode(student.last_teacher_kode);
    }

    setIsDataLoaded(true);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedTeacherKode) return;

    setIsLoading(true);
    setError("");
    setSuccess(false);

    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      router.push("/login/siswa");
      return;
    }

    const { student } = JSON.parse(sessionData);

    try {
      const { error: updateError } = await supabase
        .from("students")
        .update({
          last_teacher_kode: selectedTeacherKode,
        })
        .eq("nis", student.nis);

      if (updateError) throw updateError;

      // Update session
      const updatedSession = {
        ...JSON.parse(sessionData),
        student: {
          ...student,
          last_teacher_kode: selectedTeacherKode,
        },
        selected: true,
      };
      sessionStorage.setItem("studentSession", JSON.stringify(updatedSession));

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard/siswa");
      }, 1500);
    } catch (err) {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary border border-secondary/20 shadow-inner">
          <User size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ganti Guru Pengajar</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Sesuaikan guru mata pelajaran utama Anda</p>
        </div>
      </div>

      {/* Main Card */}
              <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/90 shadow-xl shadow-slate-200/50 dark:shadow-primary/5 transition-all">
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/5 dark:bg-white/5 flex items-center justify-center text-primary dark:text-white">
                <BookOpen size={18} />
              </div>
              <Label htmlFor="teacher" className="text-base font-bold text-slate-800 dark:text-slate-200"> Pilih Guru Mata Pelajaran </Label>
            </div>
            
            <Select
              value={selectedTeacherKode}
              onValueChange={setSelectedTeacherKode}
            >
                  <SelectTrigger className="h-14 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:ring-2 focus:ring-secondary/20 transition-all rounded-2xl">
                <SelectValue placeholder="-- Ketuk untuk memilih guru --" />
              </SelectTrigger>
                  <SelectContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-800/90 max-h-72">
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.kode_guru} value={teacher.kode_guru} className="focus:bg-secondary/10 focus:text-secondary cursor-pointer py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm tracking-tight">{teacher.name}</span>
                      {teacher.subject && (
                        <span className="text-[10px] text-slate-400 dark:text-white/30 uppercase font-bold mt-0.5">
                          Mata Pelajaran: {teacher.subject}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-slate-400 dark:text-white/30 font-medium italic ml-1">
              * Perubahan guru pengajar akan langsung sinkron dengan materi dan tugas yang Anda terima.
            </p>
          </div>

          {error && (
            <div className="bg-danger/5 dark:bg-danger/10 border border-danger/20 rounded-2xl p-4 animate-shake">
              <p className="text-danger text-xs font-bold text-center">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 animate-bounce">
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 size={18} className="text-green-500" />
                <p className="text-green-500 text-sm font-bold">Guru pengajar berhasil diperbarui!</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleSave}
            variant="secondary"
            className="w-full h-14 text-base font-black rounded-2xl shadow-lg shadow-secondary/20 hover:shadow-secondary/40 transition-all active:scale-[0.98] disabled:opacity-50"
            disabled={isLoading || !selectedTeacherKode || success}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Menyimpan Perubahan...
              </span>
            ) : "Simpan Pilihan Guru"}
          </Button>

          {/* Info Box */}
          <div className="bg-secondary/5 dark:bg-secondary/10 rounded-2xl p-6 border border-secondary/10">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center text-secondary shrink-0">
                <GraduationCap size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-secondary text-sm font-bold tracking-tight">Informasi Penting</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
                  Anda dapat mengganti guru pengajar kapan saja tanpa konfirmasi admin. Pastikan guru yang Anda pilih adalah guru yang sedang mengampu mata pelajaran di kelas Anda.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
