"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpCircle, CheckCircle, AlertTriangle, Users, GraduationCap,
  Search, Download, Archive, ChevronRight, Loader2, XCircle, History,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as XLSX from "xlsx";
import type { Class, Student, ClassPromotion, GraduatedStudent } from "@/types";

type PromotionPreview = {
  fromClass: Class;
  toClassName: string | null; // null = graduated
  students: Student[];
  grade: number; // 10, 11, 12
};

const getGradeFromClassName = (name: string): number => {
  const n = name.toUpperCase().trim();
  if (n.startsWith("XII") || n.startsWith("12")) return 12;
  if (n.startsWith("XI") || n.startsWith("11")) return 11;
  if (n.startsWith("X") || n.startsWith("10")) return 10;
  return 0;
};

const getPromotedClassName = (name: string): string | null => {
  const grade = getGradeFromClassName(name);
  if (grade === 10) return name.replace(/^X(?!I)/i, "XI");
  if (grade === 11) return name.replace(/^XI/i, "XII");
  if (grade === 12) return null; // graduated
  return null;
};

const getCurrentAcademicYear = (): string => {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}/${year + 1}`;
};

export default function KenaikanKelasPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [promotions, setPromotions] = useState<ClassPromotion[]>([]);
  const [graduated, setGraduated] = useState<GraduatedStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [excludedNis, setExcludedNis] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("promote");
  const [searchGrad, setSearchGrad] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const [cRes, sRes, pRes, gRes] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("students").select("*").eq("status", "active").order("name"),
      supabase.from("class_promotions").select("*").order("promoted_at", { ascending: false }).limit(20),
      supabase.from("graduated_students").select("*").order("graduation_date", { ascending: false }).limit(100),
    ]);
    if (cRes.data) setClasses(cRes.data);
    if (sRes.data) setStudents(sRes.data);
    if (pRes.data) setPromotions(pRes.data);
    if (gRes.data) setGraduated(gRes.data);
    setIsLoading(false);
  };

  const previews = useMemo<PromotionPreview[]>(() => {
    const result: PromotionPreview[] = [];
    const classMap = new Map(classes.map(c => [c.id, c]));

    for (const cls of classes) {
      const grade = getGradeFromClassName(cls.name);
      if (grade < 10 || grade > 12) continue;

      const classStudents = students.filter(s => s.class_id === cls.id && !excludedNis.has(s.nis));
      if (classStudents.length === 0) continue;

      result.push({
        fromClass: cls,
        toClassName: getPromotedClassName(cls.name),
        students: classStudents,
        grade,
      });
    }

    return result.sort((a, b) => a.grade - b.grade || a.fromClass.name.localeCompare(b.fromClass.name));
  }, [classes, students, excludedNis]);

  const summary = useMemo(() => {
    let promote = 0, graduate = 0, excluded = 0;
    for (const p of previews) {
      if (p.grade === 12) graduate += p.students.length;
      else promote += p.students.length;
    }
    excluded = excludedNis.size;
    return { promote, graduate, excluded, total: promote + graduate };
  }, [previews, excludedNis]);

  const toggleExclude = (nis: string) => {
    setExcludedNis(prev => {
      const next = new Set(prev);
      if (next.has(nis)) next.delete(nis); else next.add(nis);
      return next;
    });
  };

  const executePromotion = async () => {
    if (summary.total === 0) { toast("Tidak ada siswa untuk dinaikkan", "error"); return; }

    const admin = sessionStorage.getItem("adminSession");
    if (!admin) { toast("Sesi admin tidak ditemukan", "error"); return; }
    const adminData = JSON.parse(admin);

    setIsExecuting(true);
    const supabase = createClient();

    try {
      // 1. Create promotion record
      const { data: promoRecord, error: promoErr } = await supabase
        .from("class_promotions")
        .insert({
          academic_year: academicYear,
          promoted_by: adminData.username || adminData.name,
          total_promoted: summary.promote,
          total_graduated: summary.graduate,
          total_failed: summary.excluded,
          notes: `Kenaikan kelas tahun ajaran ${academicYear}`,
          metadata: {
            previews: previews.map(p => ({
              from: p.fromClass.name,
              to: p.toClassName,
              count: p.students.length,
              grade: p.grade,
            })),
          },
        })
        .select()
        .single();

      if (promoErr) throw promoErr;

      // 2. Process each class group
      for (const preview of previews) {
        const studentNisList = preview.students.map(s => s.nis);

        if (preview.grade === 12) {
          // Archive to graduated_students
          const gradRecords = preview.students.map(s => ({
            student_nis: s.nis,
            student_name: s.name,
            last_class_id: preview.fromClass.id,
            last_class_name: preview.fromClass.name,
            academic_year: academicYear,
            promotion_id: promoRecord.id,
            points: s.points || 0,
            level: s.level || 1,
          }));

          await supabase.from("graduated_students").insert(gradRecords);

          // Update students: set graduated status
          await supabase
            .from("students")
            .update({
              status: "graduated",
              is_active: false,
              last_class_id: preview.fromClass.id,
              class_id: null,
              graduated_at: new Date().toISOString(),
              graduation_year: academicYear,
            })
            .in("nis", studentNisList);

        } else {
          // Find or ensure target class exists
          const targetName = preview.toClassName!;
          let targetClass = classes.find(c => c.name === targetName);

          if (!targetClass) {
            const { data: newCls } = await supabase
              .from("classes")
              .insert({ name: targetName })
              .select()
              .single();
            if (newCls) targetClass = newCls;
          }

          if (!targetClass) {
            toast(`Gagal membuat kelas ${targetName}`, "error");
            continue;
          }

          // Move students to next class
          await supabase
            .from("students")
            .update({
              last_class_id: preview.fromClass.id,
              class_id: targetClass.id,
            })
            .in("nis", studentNisList);
        }
      }

      toast(`Berhasil! ${summary.promote} siswa naik kelas, ${summary.graduate} siswa lulus`, "success");
      setShowConfirm(false);
      setExcludedNis(new Set());
      await loadData();

    } catch (err: any) {
      console.error("Promotion error:", err);
      toast("Gagal melakukan kenaikan kelas: " + (err.message || ""), "error");
    } finally {
      setIsExecuting(false);
    }
  };

  const exportGraduated = () => {
    if (graduated.length === 0) { toast("Tidak ada data alumni", "error"); return; }
    const data = graduated.map((g, i) => ({
      No: i + 1, NIS: g.student_nis, Nama: g.student_name,
      "Kelas Terakhir": g.last_class_name || "-",
      "Tahun Lulus": g.academic_year,
      "Tanggal Lulus": new Date(g.graduation_date).toLocaleDateString("id-ID"),
      Poin: g.points, Level: g.level,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alumni");
    XLSX.writeFile(wb, `arsip-kelulusan-${academicYear.replace("/", "-")}.xlsx`);
    toast("Berhasil export data alumni", "success");
  };

  const filteredGraduated = graduated.filter(g =>
    g.student_name.toLowerCase().includes(searchGrad.toLowerCase()) ||
    g.student_nis.includes(searchGrad)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Kenaikan Kelas</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Naikkan siswa kelas X→XI, XI→XII, dan arsipkan kelulusan kelas XII.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="promote"><ArrowUpCircle size={16} className="mr-1.5" />Kenaikan</TabsTrigger>
          <TabsTrigger value="graduated"><GraduationCap size={16} className="mr-1.5" />Arsip Alumni</TabsTrigger>
          <TabsTrigger value="history"><History size={16} className="mr-1.5" />Riwayat</TabsTrigger>
        </TabsList>

        {/* ━━ TAB: Kenaikan Kelas ━━ */}
        <TabsContent value="promote" className="space-y-6">
          {/* Settings */}
          <div className="rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Pengaturan Kenaikan</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tahun Ajaran</Label>
                <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2025/2026" />
              </div>
              <div className="flex items-end">
                <Button onClick={() => setShowConfirm(true)} disabled={summary.total === 0} className="w-full bg-primary hover:bg-primary/90">
                  <ArrowUpCircle size={18} />
                  Eksekusi Kenaikan Kelas
                </Button>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Siswa</p>
              <p className="mt-1 text-3xl font-bold text-primary">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-success/20 bg-success/10 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Naik Kelas</p>
              <p className="mt-1 text-3xl font-bold text-success">{summary.promote}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Lulus (XII)</p>
              <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{summary.graduate}</p>
            </div>
            <div className="rounded-2xl border border-danger/20 bg-danger/10 p-5">
              <p className="text-sm text-slate-500 dark:text-slate-400">Dikecualikan</p>
              <p className="mt-1 text-3xl font-bold text-danger">{summary.excluded}</p>
            </div>
          </div>

          {/* Preview per class */}
          {previews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
              <Users size={48} className="mx-auto mb-3 opacity-40" />
              <p>Tidak ada siswa aktif yang bisa dinaikkan.</p>
              <p className="text-sm mt-1">Pastikan data siswa sudah terisi dengan benar dan memiliki kelas X, XI, atau XII.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {previews.map(preview => (
                <div key={preview.fromClass.id} className="rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className={`flex items-center justify-between px-5 py-4 ${
                    preview.grade === 12
                      ? "bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-b border-amber-200 dark:border-amber-800"
                      : "bg-gradient-to-r from-primary/5 to-teal/5 border-b border-primary/10"
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                        preview.grade === 12 ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600" : "bg-primary/10 text-primary"
                      }`}>
                        {preview.grade === 12 ? <GraduationCap size={20} /> : <ArrowUpCircle size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 dark:text-slate-100">{preview.fromClass.name}</span>
                          <ChevronRight size={16} className="text-slate-400" />
                          <span className={`font-bold ${preview.grade === 12 ? "text-amber-600 dark:text-amber-400" : "text-success"}`}>
                            {preview.toClassName || "LULUS"}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {preview.students.length} siswa {preview.grade === 12 ? "akan diarsipkan sebagai alumni" : "akan naik kelas"}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      preview.grade === 12
                        ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                        : "bg-success/10 text-success"
                    }`}>
                      {preview.students.length}
                    </span>
                  </div>

                  {/* Student list */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto">
                    {preview.students.map(student => {
                      const isExcluded = excludedNis.has(student.nis);
                      return (
                        <div key={student.nis} className={`flex items-center justify-between px-5 py-3 transition-colors ${
                          isExcluded ? "bg-danger/5 opacity-60" : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                              isExcluded ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                            }`}>
                              {student.absen || "#"}
                            </div>
                            <div>
                              <p className={`font-medium ${isExcluded ? "line-through text-slate-400" : "text-slate-800 dark:text-slate-100"}`}>
                                {student.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">NIS: {student.nis}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExclude(student.nis)}
                            className={isExcluded ? "border-success text-success hover:bg-success/10" : "border-danger text-danger hover:bg-danger/10"}
                          >
                            {isExcluded ? <><CheckCircle size={14} /> Masukkan</> : <><XCircle size={14} /> Kecualikan</>}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ━━ TAB: Arsip Alumni ━━ */}
        <TabsContent value="graduated" className="space-y-6">
          <div className="rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Arsip Kelulusan</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Daftar siswa yang telah lulus dan diarsipkan.</p>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input placeholder="Cari nama/NIS..." value={searchGrad} onChange={e => setSearchGrad(e.target.value)} className="pl-9 w-60" />
                </div>
                <Button onClick={exportGraduated} variant="outline" disabled={graduated.length === 0}>
                  <Download size={16} /> Export
                </Button>
              </div>
            </div>
          </div>

          {filteredGraduated.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-12 text-center text-slate-500 dark:text-slate-400">
              <Archive size={48} className="mx-auto mb-3 opacity-40" />
              <p>Belum ada data alumni.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">NIS</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Nama</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Kelas Terakhir</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Tahun Lulus</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Poin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800">
                    {filteredGraduated.map((g, i) => (
                      <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <td className="px-4 py-3 text-sm text-slate-500">{i + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-primary">{g.student_nis}</td>
                        <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-100">{g.student_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{g.last_class_name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{g.academic_year}</td>
                        <td className="px-4 py-3 text-sm text-amber-600 dark:text-amber-400 font-medium">{g.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ━━ TAB: Riwayat ━━ */}
        <TabsContent value="history" className="space-y-6">
          <div className="rounded-xl bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Riwayat Kenaikan Kelas</h3>
            {promotions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <History size={48} className="mx-auto mb-3 opacity-40" />
                <p>Belum ada riwayat kenaikan kelas.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {promotions.map(p => (
                  <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">Tahun Ajaran {p.academic_year}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Oleh: {p.promoted_by} • {new Date(p.promoted_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">{p.total_promoted} naik</span>
                        <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300">{p.total_graduated} lulus</span>
                        {p.total_failed > 0 && (
                          <span className="rounded-full bg-danger/10 px-3 py-1 text-sm font-semibold text-danger">{p.total_failed} tidak naik</span>
                        )}
                      </div>
                    </div>
                    {p.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{p.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ━━ Confirmation Dialog ━━ */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning" />
              Konfirmasi Kenaikan Kelas
            </DialogTitle>
            <DialogDescription>
              Tindakan ini akan memindahkan siswa ke kelas berikutnya dan mengarsipkan lulusan kelas XII. Proses ini tidak dapat di-undo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
              <p className="text-sm font-semibold text-warning">Ringkasan Eksekusi:</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-300">
                <li>• <strong>{summary.promote}</strong> siswa akan naik kelas (X→XI, XI→XII)</li>
                <li>• <strong>{summary.graduate}</strong> siswa kelas XII akan diarsipkan sebagai alumni</li>
                {summary.excluded > 0 && (
                  <li>• <strong>{summary.excluded}</strong> siswa dikecualikan (tidak naik)</li>
                )}
                <li>• Tahun ajaran: <strong>{academicYear}</strong></li>
              </ul>
            </div>

            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <p className="text-sm text-danger font-medium">
                ⚠️ Pastikan data sudah benar sebelum melanjutkan. Siswa kelas XII yang diarsipkan akan diset status &quot;graduated&quot; dan tidak bisa login lagi.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isExecuting}>Batal</Button>
            <Button onClick={executePromotion} disabled={isExecuting} className="bg-primary hover:bg-primary/90">
              {isExecuting ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : <><ArrowUpCircle size={16} /> Konfirmasi & Eksekusi</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
