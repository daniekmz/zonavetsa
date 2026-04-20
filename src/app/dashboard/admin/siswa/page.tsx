"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Edit2,
  Trash2,
  Download,
  Plus,
  UserPlus,
  Upload,
  Key,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { ImportSiswaModal } from "@/components/import-siswa-modal";
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
import type { Student, Class } from "@/types";
import * as XLSX from "xlsx";

export default function AdminSiswaPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    nis: "",
    name: "",
    class_id: "",
    email: "",
    phone: "",
    password: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [studentsRes, classesRes] = await Promise.all([
      supabase.from("students").select("*").order("name"),
      supabase.from("classes").select("*").order("name"),
    ]);

    if (studentsRes.data) setStudents(studentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setIsLoading(false);
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.includes(searchTerm);
    const matchesClass = !classFilter || s.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  const openModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        nis: student.nis,
        name: student.name,
        class_id: student.class_id || "",
        email: student.email || "",
        phone: student.phone || "",
        password: "",
      });
    } else {
      setEditingStudent(null);
      setFormData({
        nis: "",
        name: "",
        class_id: "",
        email: "",
        phone: "",
        password: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const supabase = createClient();

    if (editingStudent) {
      const { error } = await supabase
        .from("students")
        .update({
          nis: formData.nis,
          name: formData.name,
          class_id: formData.class_id || null,
          email: formData.email || null,
          phone: formData.phone || null,
        })
        .eq("nis", editingStudent.nis);

      if (error) {
        toast("Gagal mengupdate siswa", "error");
      } else {
        toast("Siswa berhasil diupdate", "success");
        loadData();
        setIsModalOpen(false);
      }
    } else {
      if (!formData.password) {
        toast("Password wajib diisi", "error");
        return;
      }

      const { error } = await supabase.from("students").insert({
        nis: formData.nis,
        name: formData.name,
        class_id: formData.class_id || null,
        email: formData.email || null,
        phone: formData.phone || null,
        password: formData.password,
      });

      if (error) {
        toast("Gagal menambah siswa", "error");
      } else {
        toast("Siswa berhasil ditambahkan", "success");
        loadData();
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`Hapus siswa "${student.name}"?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("students").delete().eq("nis", student.nis);

    if (error) {
      toast("Gagal menghapus siswa", "error");
    } else {
      toast("Siswa berhasil dihapus", "success");
      loadData();
    }
  };

  const handleResetPassword = async (student: Student) => {
    if (!confirm(`Reset password siswa "${student.name}"?`)) return;

    try {
      const response = await fetch(`/api/siswa/${student.nis}/reset-password`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        toast(data.error || "Gagal reset password", "error");
        return;
      }

      toast(`Password berhasil di-reset ke: ${student.nis}@smkvetsa`, "success");
    } catch {
      toast("Terjadi kesalahan", "error");
    }
  };

  const handleExport = () => {
    const data = filteredStudents.map((s) => ({
      NIS: s.nis,
      Nama: s.name,
      Kelas: classes.find((c) => c.id === s.class_id)?.name || "-",
      Email: s.email || "",
      Telepon: s.phone || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");
    XLSX.writeFile(wb, "data-siswa.xlsx");
    toast("Data berhasil diexport", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Data Siswa</h2>
          <p className="text-gray-500">Kelola data siswa</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsImportModalOpen(true)} variant="outline">
            <Upload size={18} />
            Import Excel
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download size={18} />
            Export
          </Button>
          <Button onClick={() => openModal()} className="bg-success hover:bg-success/90">
            <Plus size={18} />
            Tambah Siswa
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cari nama atau NIS..."
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
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">Memuat...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-gray-500">Tidak ada data siswa</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Foto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">NIS</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Nama</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Kelas</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Telepon</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStudents.map((student) => (
                  <tr key={student.nis} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Avatar src={student.avatar_url} name={student.name} size="md" />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">{student.nis}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{student.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {classes.find((c) => c.id === student.class_id)?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{student.email || "-"}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{student.phone || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openModal(student)} className="p-2 hover:bg-gray-100 rounded-lg text-info">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleResetPassword(student)} className="p-2 hover:bg-gray-100 rounded-lg text-warning" title="Reset Password">
                          <Key size={16} />
                        </button>
                        <button onClick={() => handleDelete(student)} className="p-2 hover:bg-gray-100 rounded-lg text-danger">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? "Edit Siswa" : "Tambah Siswa Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>NIS</Label>
                <Input
                  value={formData.nis}
                  onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                  placeholder="2024001"
                />
              </div>
              <div className="space-y-2">
                <Label>Kelas</Label>
                <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ahmad Fauzi"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="ahmad@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081234567890"
                />
              </div>
            </div>
            {!editingStudent && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="******"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} className="bg-success hover:bg-success/90">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportSiswaModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={() => loadData()}
      />
    </div>
  );
}