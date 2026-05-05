"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { ImportGuruModal } from "@/components/import-guru-modal";
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
import type { Teacher } from "@/types";
import * as XLSX from "xlsx";

export default function AdminGuruPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    kode_guru: "",
    name: "",
    nip: "",
    email: "",
    phone: "",
    subject: "",
    password: "",
  });

  useEffect(() => {
    loadTeachers();
  }, []);

  const loadTeachers = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const { data } = await supabase
      .from("teachers")
      .select("*")
      .order("name");

    if (data) {
      setTeachers(data);
    }
    setIsLoading(false);
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.kode_guru.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setFormData({
        kode_guru: teacher.kode_guru,
        name: teacher.name,
        nip: teacher.nip || "",
        email: teacher.email || "",
        phone: teacher.phone || "",
        subject: teacher.subject || "",
        password: "",
      });
    } else {
      setEditingTeacher(null);
      setFormData({
        kode_guru: "",
        name: "",
        nip: "",
        email: "",
        phone: "",
        subject: "",
        password: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const supabase = createClient();

    if (editingTeacher) {
      const { error } = await supabase
        .from("teachers")
        .update({
          kode_guru: formData.kode_guru,
          name: formData.name,
          nip: formData.nip || null,
          email: formData.email || null,
          phone: formData.phone || null,
          subject: formData.subject || null,
        })
        .eq("kode_guru", editingTeacher.kode_guru);

      if (error) {
        toast("Gagal mengupdate guru", "error");
      } else {
        toast("Guru berhasil diupdate", "success");
        loadTeachers();
        setIsModalOpen(false);
      }
    } else {
      if (!formData.password) {
        toast("Password wajib diisi", "error");
        return;
      }

      const { error } = await supabase.from("teachers").insert({
        kode_guru: formData.kode_guru,
        name: formData.name,
        nip: formData.nip || null,
        email: formData.email || null,
        phone: formData.phone || null,
        subject: formData.subject || null,
        password: formData.password,
      });

      if (error) {
        toast("Gagal menambah guru", "error");
      } else {
        toast("Guru berhasil ditambahkan", "success");
        loadTeachers();
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!confirm(`Hapus guru "${teacher.name}"?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("teachers").delete().eq("kode_guru", teacher.kode_guru);

    if (error) {
      toast("Gagal menghapus guru", "error");
    } else {
      toast("Guru berhasil dihapus", "success");
      loadTeachers();
    }
  };

  const handleExport = () => {
    const data = teachers.map((t) => ({
      "Kode Guru": t.kode_guru,
      "Nama": t.name,
      "NIP": t.nip || "",
      "Email": t.email || "",
      "Telepon": t.phone || "",
      "Mata Pelajaran": t.subject || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guru");
    XLSX.writeFile(wb, "data-guru.xlsx");
    toast("Data berhasil diexport", "success");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Data Guru</h2>
          <p className="text-slate-500 dark:text-slate-400">Kelola data guru</p>
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
          <Button onClick={() => openModal()} className="bg-primary hover:bg-primary-light">
            <Plus size={18} />
            Tambah Guru
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari guru..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">Memuat...</div>
        ) : filteredTeachers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">Tidak ada data guru</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Foto
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Kode
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Nama
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    NIP
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Telepon
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Mapel
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTeachers.map((teacher) => (
                  <tr key={teacher.kode_guru} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800">
                    <td className="px-4 py-3">
                      <Avatar src={teacher.avatar_url} name={teacher.name} size="md" />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      {teacher.kode_guru}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-100">
                      {teacher.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {teacher.nip || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {teacher.email || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {teacher.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                      {teacher.subject || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openModal(teacher)}
                          className="p-2 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg text-info"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(teacher)}
                          className="p-2 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-800 rounded-lg text-danger"
                        >
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
            <DialogTitle>
              {editingTeacher ? "Edit Guru" : "Tambah Guru Baru"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Guru</Label>
                <Input
                  value={formData.kode_guru}
                  onChange={(e) =>
                    setFormData({ ...formData, kode_guru: e.target.value })
                  }
                  placeholder="G001"
                />
              </div>
              <div className="space-y-2">
                <Label>NIP</Label>
                <Input
                  value={formData.nip}
                  onChange={(e) =>
                    setFormData({ ...formData, nip: e.target.value })
                  }
                  placeholder="123456789"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nama Lengkap</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Budi Santoso"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="budi@school.sch.id"
                />
              </div>
              <div className="space-y-2">
                <Label>Telepon</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="081234567890"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mata Pelajaran</Label>
              <Input
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Matematika"
              />
            </div>
            {!editingTeacher && (
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="******"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary-light">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportGuruModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={() => loadTeachers()}
      />
    </div>
  );
}
