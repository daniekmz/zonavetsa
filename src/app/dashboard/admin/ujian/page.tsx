"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Plus, Search, Edit2, Trash2, Eye, EyeOff, Calendar, Clock, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
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
import type { Exam, Class } from "@/types";

export default function AdminUjianPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    class_id: "",
    duration_minutes: 90,
    status: "draft",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [examsRes, classesRes] = await Promise.all([
      supabase.from("exams").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("*").order("name"),
    ]);

    if (examsRes.data) setExams(examsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setIsLoading(false);
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openModal = (exam?: Exam) => {
    if (exam) {
      setEditingExam(exam);
      setFormData({
        title: exam.title,
        description: exam.description || "",
        class_id: exam.class_id,
        duration_minutes: exam.duration_minutes || 90,
        status: exam.status,
      });
    } else {
      setEditingExam(null);
      setFormData({
        title: "",
        description: "",
        class_id: "",
        duration_minutes: 90,
        status: "draft",
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.class_id) {
      toast("Judul dan kelas wajib diisi", "error");
      return;
    }

    const supabase = createClient();

    if (editingExam) {
      const { error } = await supabase
        .from("exams")
        .update({
          title: formData.title,
          description: formData.description,
          class_id: formData.class_id,
          duration_minutes: formData.duration_minutes,
          status: formData.status,
        })
        .eq("id", editingExam.id);

      if (error) {
        toast("Gagal mengupdate", "error");
      } else {
        toast("Berhasil diupdate", "success");
        loadData();
        setIsModalOpen(false);
      }
    } else {
      const { error } = await supabase.from("exams").insert({
        title: formData.title,
        description: formData.description,
        class_id: formData.class_id,
        duration_minutes: formData.duration_minutes,
        status: formData.status,
      });

      if (error) {
        toast("Gagal membuat ujian", "error");
      } else {
        toast("Ujian berhasil dibuat", "success");
        loadData();
        setIsModalOpen(false);
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
    await supabase.from("exams").update({ status: newStatus }).eq("id", exam.id);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Data Ujian</h2>
          <p className="text-gray-500">Kelola data ujian sekolah</p>
        </div>
        <Button onClick={() => openModal()} className="bg-success hover:bg-success/90">
          <Plus size={18} />
          Ujian Baru
        </Button>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari ujian..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Exams Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : filteredExams.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-50" />
          <p>Tidak ada ujian</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Judul</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Kelas</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Durasi</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{exam.title}</p>
                      <p className="text-xs text-gray-500">{exam.description || "-"}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {classes.find((c) => c.id === exam.class_id)?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {exam.duration_minutes} menit
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          exam.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {exam.status === "published" ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleStatus(exam)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                          title={exam.status === "published" ? "Unpublish" : "Publish"}
                        >
                          {exam.status === "published" ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          onClick={() => openModal(exam)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-info"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(exam)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-danger"
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
        </div>
      )}

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExam ? "Edit Ujian" : "Ujian Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Ujian</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Ulangan Harian Bab 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi ujian (opsional)"
              />
            </div>
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select
                value={formData.class_id}
                onValueChange={(v) => setFormData({ ...formData, class_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Durasi (menit)</Label>
              <Input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 90 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} className="bg-success hover:bg-success/90">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}