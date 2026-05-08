"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpCircle, CheckCircle, AlertTriangle, Users, GraduationCap,
  Search, Download, Archive, ChevronRight, Loader2, History,
  CheckSquare, Square
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

const getGradeFromClassName = (name: string): number => {
  const n = name.toUpperCase().trim();
  if (n.startsWith("XII") || n.startsWith("12")) return 12;
  if (n.startsWith("XI") || n.startsWith("11")) return 11;
  if (n.startsWith("X") || n.startsWith("10")) return 10;
  return 0;
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
  
  // Selection states
  const [sourceClassId, setSourceClassId] = useState<string>("");
  const [targetAction, setTargetAction] = useState<"promote" | "graduate">("promote");
  const [targetTingkat, setTargetTingkat] = useState<string>("XI");
  const [targetJurusan, setTargetJurusan] = useState<string>("");
  const [targetRombel, setTargetRombel] = useState<string>("1");
  const [selectedStudentNis, setSelectedStudentNis] = useState<Set<string>>(new Set());

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

  const uniqueJurusans = useMemo(() => {
    const jurusans = new Set<string>();
    classes.forEach(c => {
      const parts = c.name.split(" ");
      if (parts.length >= 2) jurusans.add(parts[1]);
    });
    return Array.from(jurusans).sort();
  }, [classes]);

  const sourceClass = useMemo(() => classes.find(c => c.id === sourceClassId), [classes, sourceClassId]);
  const classStudents = useMemo(() => students.filter(s => s.class_id === sourceClassId), [students, sourceClassId]);

  // When source class changes, pre-fill targets and select all students
  useEffect(() => {
    if (sourceClass) {
      const parts = sourceClass.name.split(" ");
      if (parts.length >= 3) {
        const tingkat = parts[0];
        setTargetJurusan(parts[1]);
        setTargetRombel(parts[2]);
        
        if (tingkat === "X") setTargetTingkat("XI");
        else if (tingkat === "XI") setTargetTingkat("XII");
      }
      
      if (getGradeFromClassName(sourceClass.name) === 12) {
        setTargetAction("graduate");
      } else {
        setTargetAction("promote");
      }

      setSelectedStudentNis(new Set(classStudents.map(s => s.nis)));
    } else {
      setSelectedStudentNis(new Set());
    }
  }, [sourceClassId, sourceClass, classStudents]);

  const toggleStudent = (nis: string) => {
    setSelectedStudentNis(prev => {
      const next = new Set(prev);
      if (next.has(nis)) next.delete(nis); else next.add(nis);
      return next;
    });
  };

  const toggleAllStudents = () => {
    if (selectedStudentNis.size === classStudents.length) {
      setSelectedStudentNis(new Set());
    } else {
      setSelectedStudentNis(new Set(classStudents.map(s => s.nis)));
    }
  };

  const targetClassName = `${targetTingkat} ${targetJurusan} ${targetRombel}`;

  const executePromotion = async () => {
    if (selectedStudentNis.size === 0) { toast("Pilih minimal 1 siswa", "error"); return; }
    if (!sourceClass) return;

    const admin = sessionStorage.getItem("adminSession");
    if (!admin) { toast("Sesi admin tidak ditemukan", "error"); return; }
    const adminData = JSON.parse(admin);

    setIsExecuting(true);
    const supabase = createClient();

    try {
      const selectedStudents = classStudents.filter(s => selectedStudentNis.has(s.nis));
      const targetNameDisplay = targetAction === "graduate" ? "LULUS" : targetClassName;

      // 1. Create promotion record
      const { data: promoRecord, error: promoErr } = await supabase
        .from("class_promotions")
        .insert({
          academic_year: academicYear,
          promoted_by: adminData.username || adminData.name,
          total_promoted: targetAction === "promote" ? selectedStudents.length : 0,
          total_graduated: targetAction === "graduate" ? selectedStudents.length : 0,
          total_failed: 0,
          notes: `Kenaikan dari kelas ${sourceClass.name} ke ${targetNameDisplay} tahun ajaran ${academicYear}`,
          metadata: {
            fromClass: sourceClass.name,
            toClass: targetNameDisplay,
            studentCount: selectedStudents.length,
          },
        })
        .select()
        .single();

      if (promoErr) throw promoErr;

      // 2. Process students
      if (targetAction === "graduate") {
        // Archive
        const gradRecords = selectedStudents.map(s => ({
          student_nis: s.nis,
          student_name: s.name,
          last_class_id: sourceClass.id,
          last_class_name: sourceClass.name,
          academic_year: academicYear,
          promotion_id: promoRecord.id,
          points: s.points || 0,
          level: s.level || 1,
        }));
        await supabase.from("graduated_students").insert(gradRecords);
        await supabase
          .from("students")
          .update({
            status: "graduated",
            is_active: false,
            last_class_id: sourceClass.id,
            class_id: null,
            graduated_at: new Date().toISOString(),
            graduation_year: academicYear,
          })
          .in("nis", Array.from(selectedStudentNis));
      } else {
        // Promote
        let targetClass = classes.find(c => c.name === targetClassName);

        if (!targetClass) {
          const { data: newCls } = await supabase
            .from("classes")
            .insert({ name: targetClassName })
            .select()
            .single();
          if (newCls) targetClass = newCls;
        }

        if (!targetClass) throw new Error(`Gagal membuat kelas ${targetClassName}`);

        await supabase
          .from("students")
          .update({
            last_class_id: sourceClass.id,
            class_id: targetClass.id,
          })
          .in("nis", Array.from(selectedStudentNis));
      }

      toast(`Berhasil memproses ${selectedStudents.length} siswa`, "success");
      setShowConfirm(false);
      setSourceClassId("");
      await loadData();

    } catch (err: any) {
      console.error("Promotion error:", err);
      toast("Gagal melakukan proses: " + (err.message || ""), "error");
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
          Proses kenaikan kelas atau kelulusan siswa dengan pengaturan kelas, rombel, dan jurusan.
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
          <div className="grid gap-6 md:grid-cols-12">
            
            {/* Sidebar Konfigurasi */}
            <div className="md:col-span-4 space-y-4">
              <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">1</div>
                  Pilih Kelas Asal
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tahun Ajaran</Label>
                    <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="2025/2026" />
                  </div>
                  <div className="space-y-2">
                    <Label>Kelas Asal</Label>
                    <Select value={sourceClassId} onValueChange={setSourceClassId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kelas..." />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {sourceClass && (
                <div className="rounded-xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-left-4">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">2</div>
                    Tujuan Kenaikan
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Aksi</Label>
                      <Select value={targetAction} onValueChange={(v: any) => setTargetAction(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="promote">Naik/Pindah Kelas</SelectItem>
                          <SelectItem value="graduate">Lulus (Arsip Alumni)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {targetAction === "promote" && (
                      <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                        <div className="space-y-1">
                          <Label className="text-xs">Tingkat</Label>
                          <Select value={targetTingkat} onValueChange={setTargetTingkat}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="X">X</SelectItem>
                              <SelectItem value="XI">XI</SelectItem>
                              <SelectItem value="XII">XII</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Jurusan</Label>
                          <Select value={targetJurusan} onValueChange={setTargetJurusan}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {uniqueJurusans.map(j => (
                                <SelectItem key={j} value={j}>{j}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Rombel</Label>
                          <Select value={targetRombel} onValueChange={setTargetRombel}>
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["1","2","3","4","5","6","7"].map(r => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3 mt-2 text-center text-sm font-medium text-primary">
                          Target: {targetClassName}
                        </div>
                      </div>
                    )}

                    <Button 
                      onClick={() => setShowConfirm(true)} 
                      disabled={selectedStudentNis.size === 0} 
                      className="w-full bg-primary hover:bg-primary/90 mt-2"
                    >
                      Eksekusi ({selectedStudentNis.size} Siswa)
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Panel Daftar Siswa */}
            <div className="md:col-span-8">
              {!sourceClass ? (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-8 text-center">
                  <GraduationCap size={48} className="mb-3 opacity-40" />
                  <p>Pilih kelas asal terlebih dahulu untuk melihat daftar siswa.</p>
                </div>
              ) : (
                <div className="rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col h-full max-h-[600px] animate-in fade-in slide-in-from-right-4">
                  <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">3</div>
                        Pilih Siswa ({classStudents.length})
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">Pilih siswa yang akan diproses ke tahap selanjutnya.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={toggleAllStudents}>
                      {selectedStudentNis.size === classStudents.length ? (
                        <><Square size={16} className="mr-2" /> Deselect All</>
                      ) : (
                        <><CheckSquare size={16} className="mr-2" /> Select All</>
                      )}
                    </Button>
                  </div>

                  <div className="overflow-y-auto flex-1 p-2">
                    {classStudents.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">Tidak ada siswa aktif di kelas ini.</div>
                    ) : (
                      <div className="grid gap-1 sm:grid-cols-2">
                        {classStudents.map(student => {
                          const isSelected = selectedStudentNis.has(student.nis);
                          return (
                            <div 
                              key={student.nis} 
                              onClick={() => toggleStudent(student.nis)}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                isSelected 
                                  ? "border-primary bg-primary/5 shadow-sm" 
                                  : "border-slate-200 dark:border-slate-700 hover:border-primary/50"
                              }`}
                            >
                              <div className={`flex items-center justify-center w-5 h-5 rounded border ${
                                isSelected ? "bg-primary border-primary text-white" : "border-slate-300 dark:border-slate-600"
                              }`}>
                                {isSelected && <CheckCircle size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{student.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">NIS: {student.nis}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
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
                        {p.total_promoted > 0 && <span className="rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">{p.total_promoted} naik</span>}
                        {p.total_graduated > 0 && <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-3 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300">{p.total_graduated} lulus</span>}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-warning" />
              Konfirmasi Proses
            </DialogTitle>
            <DialogDescription>
              Pastikan pengaturan tujuan sudah benar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Memproses <strong>{selectedStudentNis.size}</strong> siswa dari kelas <strong>{sourceClass?.name}</strong>.
              </p>
              <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <p className="text-xs text-slate-500 mb-1">Tujuan:</p>
                <p className="font-bold text-primary text-lg">
                  {targetAction === "graduate" ? "Lulus (Arsip Alumni)" : `Kelas ${targetClassName}`}
                </p>
              </div>
            </div>

            {targetAction === "graduate" && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                <p className="text-sm text-warning font-medium">
                  ⚠️ Siswa yang diluluskan akan diarsipkan dan tidak bisa login lagi.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isExecuting}>Batal</Button>
            <Button onClick={executePromotion} disabled={isExecuting} className="bg-primary hover:bg-primary/90">
              {isExecuting ? <><Loader2 size={16} className="animate-spin" /> Memproses...</> : "Eksekusi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
