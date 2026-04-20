"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building, BookOpen, Save, Plus, Edit2, Trash2, Users, GraduationCap, ShieldCheck, Lock, History, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { logSettingsUpdate } from "@/lib/activity-logger";
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
import type { Major, Profile, SchoolStat } from "@/types";

type TabType = "classes" | "jurusan" | "stats" | "school" | "security" | "changelog";

interface ChangelogItem {
  version: string;
  date: string;
  category: "Fitur Baru" | "Peningkatan" | "Perbaikan";
  title: string;
  details: string[];
}

const WEB_CHANGELOG: ChangelogItem[] = [
  {
    version: "v2.6.0",
    date: "20 April 2026",
    category: "Peningkatan",
    title: "Sidebar Siswa dan Alur Pemilihan Guru",
    details: [
      "Menu 'Ganti Guru' diposisikan paling atas pada sidebar siswa agar akses lebih cepat.",
      "Setelah login, siswa sekarang selalu diarahkan ke halaman pemilihan guru.",
      "Sesi siswa diperbarui agar status selected aktif setelah pilihan guru disimpan.",
    ],
  },
  {
    version: "v2.5.0",
    date: "20 April 2026",
    category: "Peningkatan",
    title: "SEO Metadata, Sitemap, dan Verifikasi Google",
    details: [
      "Meta tags Open Graph dan Twitter diperbarui agar link web menampilkan gambar dan deskripsi saat dibagikan.",
      "Ditambahkan OG image dan Twitter image ukuran 1200x630 untuk kompatibilitas WhatsApp, Telegram, Facebook, LinkedIn, dan X.",
      "Sitemap XML ditambahkan untuk mendukung indexing Google Search Console.",
      "Google site verification diperbarui dengan token terbaru.",
      "Domain canonical untuk metadata, sitemap, dan robots diselaraskan ke domain produksi.",
    ],
  },
  {
    version: "v2.4.0",
    date: "20 April 2026",
    category: "Peningkatan",
    title: "Galeri Karya, Preview HTML5, dan Download File",
    details: [
      "Preview HTML5 diperbaiki untuk mode upload dan detail karya (siswa dan guru).",
      "File HTML single-file (index.html berisi HTML+CSS+JS) kini tampil sebagai web preview, bukan teks mentah.",
      "Ditambahkan fitur unduh file pada galeri karya siswa dan guru, baik dari kartu maupun dialog detail.",
    ],
  },
  {
    version: "v2.3.0",
    date: "20 April 2026",
    category: "Fitur Baru",
    title: "Pengaturan Admin: Keamanan dan Changelog",
    details: [
      "Tab Changelog ditambahkan di Pengaturan Admin untuk melihat riwayat update web.",
      "Tab Keamanan ditambahkan dengan fitur ganti password admin panel.",
      "Sidebar admin menambahkan shortcut khusus menuju Changelog Web.",
    ],
  },
  {
    date: "19 April 2026",
    category: "Fitur Baru",
    version: "v2.2.0",
    title: "Galeri Karya Publik (Siswa & Guru)",
    details: [
      "E-Portofolio disatukan menjadi Galeri Karya dengan scope publikasi Kelas dan Global.",
      "Feed galeri tampil pada dashboard siswa dan guru dengan metadata uploader.",
      "Like dan komentar terstruktur ditambahkan untuk interaksi karya.",
    ],
  },
  {
    date: "18 April 2026",
    category: "Peningkatan",
    version: "v2.1.0",
    title: "Moderasi Guru dan Integrasi Peringkat",
    details: [
      "Guru dapat melakukan moderasi dan hapus karya yang tidak sesuai.",
      "Aktivitas galeri dihubungkan ke sistem poin siswa.",
      "Menu peringkat menampilkan breakdown poin dari aktivitas galeri karya.",
    ],
  },
  {
    version: "v2.0.0",
    date: "17 April 2026",
    category: "Fitur Baru",
    title: "AI Tutor, Analitik Guru, dan PWA",
    details: [
      "Integrasi asisten AI pembelajaran untuk siswa dan guru melalui endpoint API AI.",
      "Dashboard analitik guru ditambahkan untuk monitoring performa kelas.",
      "Aplikasi dioptimalkan sebagai PWA agar dapat diinstal di perangkat.",
    ],
  },
  {
    version: "v1.4.0",
    date: "16 April 2026",
    category: "Peningkatan",
    title: "Keamanan Ujian Anti-Curang",
    details: [
      "Deteksi perpindahan tab/fokus saat ujian ditingkatkan.",
      "Perlindungan ujian dengan blokir context menu dan shortcut copy-paste.",
      "Dukungan randomisasi soal dan opsi jawaban.",
    ],
  },
  {
    version: "v1.3.0",
    date: "16 April 2026",
    category: "Fitur Baru",
    title: "Gamifikasi dan Leaderboard",
    details: [
      "Sistem poin dan level siswa ditambahkan.",
      "Halaman peringkat/leaderboard siswa dirilis.",
      "Stat siswa di sidebar dibuat lebih realtime mengikuti progres.",
    ],
  },
  {
    version: "v1.2.0",
    date: "15 April 2026",
    category: "Peningkatan",
    title: "UI Modern dan Struktur Dashboard",
    details: [
      "Pembaruan tema, komponen, dan layout dashboard menjadi lebih modern.",
      "Pengalaman penggunaan mobile dan desktop dirapikan.",
      "Navigasi per role (admin, guru, siswa) diperjelas.",
    ],
  },
  {
    version: "v1.1.0",
    date: "15 April 2026",
    category: "Perbaikan",
    title: "Stabilisasi Data dan Type Safety",
    details: [
      "Perbaikan berbagai issue type safety dan validasi form.",
      "Sinkronisasi struktur data antar halaman dashboard diperkuat.",
      "Perbaikan handling sesi login dan update profil.",
    ],
  },
  {
    version: "v1.0.0",
    date: "14 April 2026",
    category: "Fitur Baru",
    title: "Rilis Awal ZonaVetsa Web",
    details: [
      "Rilis awal platform dengan role Admin, Guru, dan Siswa.",
      "Fitur dasar manajemen file, tugas, ujian, absensi, profil, dan aktivitas tersedia.",
      "Fondasi dashboard dan autentikasi role-based mulai diterapkan.",
    ],
  },
];

export default function AdminSettingsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("school");
  const [classes, setClasses] = useState<any[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [stats, setStats] = useState<SchoolStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemName, setItemName] = useState("");
  
  // Major modal
  const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [majorForm, setMajorForm] = useState({
    name: "",
    description: "",
    icon: "BookOpen",
    skills: "",
  });

  // School settings
  const [schoolName, setSchoolName] = useState("SMK Veteran 1 Sukoharjo");
  const [schoolAddress, setSchoolAddress] = useState("Jl. Veteran No. 1, Sukoharjo");
  const [academicYear, setAcademicYear] = useState("2024/2025");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (!requestedTab) return;
    const tabList: TabType[] = ["school", "jurusan", "stats", "classes", "security", "changelog"];
    if (tabList.includes(requestedTab as TabType)) {
      setActiveTab(requestedTab as TabType);
    }
  }, [searchParams]);

  const loadAllData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    
    const [classesRes, majorsRes, statsRes] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("majors").select("*").order("name"),
      supabase.from("school_stats").select("*"),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (majorsRes.data) setMajors(majorsRes.data);
    if (statsRes.data) setStats(statsRes.data);
    
    setIsLoading(false);
  };

  const getStatValue = (key: string) => {
    const stat = stats.find(s => s.key === key);
    return stat?.value || 0;
  };

  // ==================== CLASSES ====================
  const handleSaveClass = async () => {
    if (!itemName.trim()) {
      toast("Nama wajib diisi", "error");
      return;
    }

    const supabase = createClient();

    if (editingItem) {
      const { error } = await supabase.from("classes").update({ name: itemName }).eq("id", editingItem.id);
      if (error) toast("Gagal mengupdate", "error");
      else { toast("Berhasil diupdate", "success"); loadAllData(); }
    } else {
      const { error } = await supabase.from("classes").insert({ name: itemName });
      if (error) toast("Gagal menambah", "error");
      else { toast("Berhasil ditambahkan", "success"); loadAllData(); }
    }

    setIsModalOpen(false);
    setItemName("");
    setEditingItem(null);
  };

  const handleDeleteClass = async (cls: any) => {
    if (!confirm(`Hapus kelas "${cls.name}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("classes").delete().eq("id", cls.id);
    if (error) toast("Gagal menghapus", "error");
    else { toast("Berhasil dihapus", "success"); loadAllData(); }
  };

  // ==================== MAJORS ====================
  const handleSaveMajor = async () => {
    if (!majorForm.name.trim()) {
      toast("Nama wajib diisi", "error");
      return;
    }

    const supabase = createClient();
    const skillsArray = majorForm.skills.split(",").map(s => s.trim()).filter(s => s);

    if (editingMajor) {
      const { error } = await supabase.from("majors").update({
        name: majorForm.name,
        description: majorForm.description,
        icon: majorForm.icon,
        skills: skillsArray,
      }).eq("id", editingMajor.id);
      
      if (error) toast("Gagal mengupdate", "error");
      else { toast("Berhasil diupdate", "success"); loadAllData(); }
    } else {
      const { error } = await supabase.from("majors").insert({
        name: majorForm.name,
        description: majorForm.description,
        icon: majorForm.icon,
        skills: skillsArray,
        is_active: true,
      });
      
      if (error) toast("Gagal menambah", "error");
      else { toast("Berhasil ditambahkan", "success"); loadAllData(); }
    }

    setIsMajorModalOpen(false);
    setMajorForm({ name: "", description: "", icon: "BookOpen", skills: "" });
    setEditingMajor(null);
  };

  const handleDeleteMajor = async (major: Major) => {
    if (!confirm(`Hapus jurusan "${major.name}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("majors").delete().eq("id", major.id);
    if (error) toast("Gagal menghapus", "error");
    else { toast("Berhasil dihapus", "success"); loadAllData(); }
  };

  // ==================== STATS ====================
  const updateStat = async (key: string, value: number) => {
    const supabase = createClient();
    
    // First try to update
    const { data: existing, error: selectError } = await supabase
      .from("school_stats")
      .select("id")
      .eq("key", key)
      .single();

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from("school_stats")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
      
      if (error) {
        toast("Gagal mengupdate", "error");
        return;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from("school_stats")
        .insert({ key, value });
      
      if (error) {
        toast("Gagal mengupdate", "error");
        return;
      }
    }
    
    toast("Berhasil diupdate", "success");
    loadAllData();
  };

  const getAdminSession = () => {
    const sessionRaw = sessionStorage.getItem("adminSession");
    if (!sessionRaw) return null;
    try {
      return JSON.parse(sessionRaw) as Profile;
    } catch {
      return null;
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleChangeAdminPassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      toast("Semua field password wajib diisi", "error");
      return;
    }

    if (newPassword.length < 6) {
      toast("Password baru minimal 6 karakter", "error");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast("Konfirmasi password baru tidak sama", "error");
      return;
    }

    if (newPassword === currentPassword) {
      toast("Password baru harus berbeda dari password lama", "error");
      return;
    }

    const adminSession = getAdminSession();
    if (!adminSession?.username) {
      toast("Sesi admin tidak ditemukan, silakan login ulang", "error");
      return;
    }

    setIsChangingPassword(true);
    const supabase = createClient();

    try {
      const { data: adminRow, error: adminError } = await supabase
        .from("profiles")
        .select("username, name, password, role")
        .eq("username", adminSession.username)
        .eq("role", "admin")
        .single();

      if (adminError || !adminRow) {
        toast("Data admin tidak ditemukan", "error");
        return;
      }

      if (adminRow.password !== currentPassword) {
        toast("Password lama tidak sesuai", "error");
        return;
      }

      const updatedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ password: newPassword, updated_at: updatedAt })
        .eq("username", adminSession.username)
        .eq("role", "admin");

      if (updateError) {
        toast("Gagal mengganti password", "error");
        return;
      }

      const nextSession = { ...adminSession, password: newPassword, updated_at: updatedAt };
      sessionStorage.setItem("adminSession", JSON.stringify(nextSession));
      await logSettingsUpdate(adminSession.username, "admin", "password_admin");
      resetPasswordForm();
      toast("Password admin berhasil diperbarui", "success");
    } catch (error) {
      console.error("Change admin password failed:", error);
      toast("Terjadi kesalahan saat ganti password", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const tabs = [
    { id: "school" as TabType, label: "Sekolah", icon: Building },
    { id: "jurusan" as TabType, label: "Jurusan", icon: GraduationCap },
    { id: "stats" as TabType, label: "Statistik", icon: Users },
    { id: "classes" as TabType, label: "Kelas", icon: BookOpen },
    { id: "security" as TabType, label: "Keamanan", icon: Lock },
    { id: "changelog" as TabType, label: "Changelog", icon: History },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Pengaturan</h2>
        <p className="text-gray-500">Kelola data sekolah</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-white"
                : "text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : (
        <>
          {/* SCHOOL TAB */}
          {activeTab === "school" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm space-y-4 max-w-xl">
              <h3 className="font-semibold text-lg">Informasi Sekolah</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nama Sekolah</Label>
                  <Input
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Nama sekolah"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alamat</Label>
                  <Input
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="Alamat sekolah"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tahun Ajaran</Label>
                  <Input
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    placeholder="2024/2025"
                  />
                </div>
              </div>
              <Button className="bg-success">
                <Save size={16} className="mr-2" />
                Simpan
              </Button>
            </div>
          )}

          {/* JURUSAN TAB */}
          {activeTab === "jurusan" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Data Jurusan</h3>
                <Button onClick={() => { setEditingMajor(null); setMajorForm({ name: "", description: "", icon: "BookOpen", skills: "" }); setIsMajorModalOpen(true); }} className="bg-success">
                  <Plus size={16} /> Tambah Jurusan
                </Button>
              </div>

              {majors.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center shadow-sm">
                  <GraduationCap size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Belum ada jurusan</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {majors.map((major) => (
                    <div key={major.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-lg">{major.name}</h4>
                        <p className="text-sm text-gray-500">{major.description}</p>
                        {major.skills && major.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {major.skills.map((skill, idx) => (
                              <span key={idx} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingMajor(major); setMajorForm({ name: major.name, description: major.description || "", icon: major.icon || "BookOpen", skills: major.skills?.join(", ") || "" }); setIsMajorModalOpen(true); }}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteMajor(major)} className="text-red-500">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STATS TAB */}
          {activeTab === "stats" && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm max-w-xl">
              <h3 className="font-semibold text-lg mb-4">Statistik Sekolah</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium">Jumlah Siswa</p>
                    <p className="text-sm text-gray-500">Total siswa yang terdaftar</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateStat("students", getStatValue("students") - 10)}>-</Button>
                    <span className="text-2xl font-bold w-16 text-center">{getStatValue("students")}</span>
                    <Button variant="outline" size="sm" onClick={() => updateStat("students", getStatValue("students") + 10)}>+</Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium">Jumlah Guru</p>
                    <p className="text-sm text-gray-500">Total guru yang terdaftar</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateStat("guru", Math.max(0, getStatValue("guru") - 1))}>-</Button>
                    <span className="text-2xl font-bold w-16 text-center">{getStatValue("guru")}</span>
                    <Button variant="outline" size="sm" onClick={() => updateStat("guru", getStatValue("guru") + 1)}>+</Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium">Jumlah Karyawan</p>
                    <p className="text-sm text-gray-500">Total karyawan(non-guru)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateStat("karyawan", Math.max(0, getStatValue("karyawan") - 1))}>-</Button>
                    <span className="text-2xl font-bold w-16 text-center">{getStatValue("karyawan")}</span>
                    <Button variant="outline" size="sm" onClick={() => updateStat("karyawan", getStatValue("karyawan") + 1)}>+</Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div>
                    <p className="font-medium">Jumlah Jurusan</p>
                    <p className="text-sm text-gray-500">Total jurusan yang aktif</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateStat("jurusan", Math.max(0, getStatValue("jurusan") - 1))}>-</Button>
                    <span className="text-2xl font-bold w-16 text-center">{getStatValue("jurusan") || majors.filter(m => m.is_active).length}</span>
                    <Button variant="outline" size="sm" onClick={() => updateStat("jurusan", getStatValue("jurusan") + 1)}>+</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === "security" && (
            <div className="space-y-4 max-w-2xl">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Gunakan password yang kuat dan jangan dibagikan ke pihak lain. Perubahan password akan langsung aktif untuk login berikutnya.
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Ganti Password Admin</h3>
                    <p className="text-sm text-gray-500">Perbarui kredensial login admin panel.</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current-admin-password">Password Lama</Label>
                  <Input
                    id="current-admin-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password lama"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-admin-password">Password Baru</Label>
                  <Input
                    id="new-admin-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-admin-password">Konfirmasi Password Baru</Label>
                  <Input
                    id="confirm-admin-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleChangeAdminPassword} disabled={isChangingPassword} className="bg-success">
                    {isChangingPassword ? "Menyimpan..." : "Simpan Password Baru"}
                  </Button>
                  <Button variant="outline" onClick={resetPasswordForm} disabled={isChangingPassword}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* CHANGELOG TAB */}
          {activeTab === "changelog" && (
            <div className="space-y-4 max-w-4xl">
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                Riwayat pembaruan fitur web ZonaVetsa untuk admin panel, guru, dan siswa.
              </div>
              <div className="grid gap-4">
                {WEB_CHANGELOG.map((entry) => (
                  <div key={`${entry.version}-${entry.title}`} className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          <Sparkles size={12} />
                          {entry.version}
                        </span>
                        <span className="text-xs text-gray-500">{entry.date}</span>
                      </div>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-200">
                        {entry.category}
                      </span>
                    </div>
                    <h4 className="mt-3 text-base font-bold text-slate-800 dark:text-white">{entry.title}</h4>
                    <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-slate-300">
                      {entry.details.map((detail, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="mt-1 text-primary">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLASSES TAB */}
          {activeTab === "classes" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Data Kelas</h3>
                <Button onClick={() => { setEditingItem(null); setItemName(""); setIsModalOpen(true); }} className="bg-success">
                  <Plus size={16} /> Tambah Kelas
                </Button>
              </div>

              {classes.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-12 text-center shadow-sm">
                  <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Belum ada kelas</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {classes.map((cls) => (
                    <div key={cls.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex justify-between items-center">
                      <div>
                        <h4 className="font-bold">{cls.name}</h4>
                        <p className="text-sm text-gray-500">Kelas</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingItem(cls); setItemName(cls.name); setIsModalOpen(true); }}>
                          <Edit2 size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClass(cls)} className="text-red-500">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Class Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Kelas</Label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="Contoh: X TKJ 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={handleSaveClass} className="bg-success">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Major Modal */}
      <Dialog open={isMajorModalOpen} onOpenChange={setIsMajorModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingMajor ? "Edit Jurusan" : "Tambah Jurusan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nama Jurusan</Label>
              <Input
                value={majorForm.name}
                onChange={(e) => setMajorForm({ ...majorForm, name: e.target.value })}
                placeholder="Contoh: Teknik Komputer & Jaringan"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <textarea
                value={majorForm.description}
                onChange={(e) => setMajorForm({ ...majorForm, description: e.target.value })}
                placeholder="Deskripsi singkat..."
                className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={majorForm.icon} onValueChange={(v) => setMajorForm({ ...majorForm, icon: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BookOpen">BookOpen</SelectItem>
                  <SelectItem value="MonitorPlay">MonitorPlay</SelectItem>
                  <SelectItem value="Cpu">Cpu</SelectItem>
                  <SelectItem value="Car">Car</SelectItem>
                  <SelectItem value="Tractor">Tractor</SelectItem>
                  <SelectItem value="Network">Network</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Skills (pisahkan dengan koma)</Label>
              <Input
                value={majorForm.skills}
                onChange={(e) => setMajorForm({ ...majorForm, skills: e.target.value })}
                placeholder="Networking, Server Admin, Cyber Security"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMajorModalOpen(false)}>Batal</Button>
            <Button onClick={handleSaveMajor} className="bg-success">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
