"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Search, Edit2, Trash2, Plus } from "lucide-react";
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
import type { Class, Teacher } from "@/types";

export default function AdminKelasPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    walikelas_kode: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [classesRes, teachersRes] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("teachers").select("*").order("name"),
    ]);

    if (classesRes.data) setClasses(classesRes.data);
    if (teachersRes.data) setTeachers(teachersRes.data);
    setIsLoading(false);
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (cls?: Class) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        name: cls.name,
        walikelas_kode: cls.walikelas_kode || "",
      });
    } else {
      setEditingClass(null);
      setFormData({ name: "", walikelas_kode: "" });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const supabase = createClient();

    if (editingClass) {
      const { error } = await supabase
        .from("classes")
        .update({
          name: formData.name,
          walikelas_kode: formData.walikelas_kode || null,
        })
        .eq("id", editingClass.id);

      if (error) {
        toast("Gagal mengupdate kelas", "error");
      } else {
        toast("Kelas berhasil diupdate", "success");
        loadData();
        setIsModalOpen(false);
      }
    } else {
      const { error } = await supabase.from("classes").insert({
        name: formData.name,
        walikelas_kode: formData.walikelas_kode || null,
      });

      if (error) {
        toast("Gagal menambah kelas", "error");
      } else {
        toast("Kelas berhasil ditambahkan", "success");
        loadData();
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = async (cls: Class) => {
    if (!confirm(`Hapus kelas "${cls.name}"?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("classes").delete().eq("id", cls.id);

    if (error) {
      toast("Gagal menghapus kelas", "error");
    } else {
      toast("Kelas berhasil dihapus", "success");
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Data Kelas</h2>
          <p className="text-gray-500">Kelola data kelas</p>
        </div>
        <Button onClick={() => openModal()} className="bg-primary hover:bg-primary-light">
          <Plus size={18} />
          Tambah Kelas
        </Button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari kelas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12">Memuat...</div>
        ) : filteredClasses.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">Tidak ada data kelas</div>
        ) : (
          filteredClasses.map((cls) => {
            const walikelas = teachers.find((t) => t.kode_guru === cls.walikelas_kode);
            return (
              <div
                key={cls.id}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
                    <GraduationCap size={24} className="text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openModal(cls)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-info"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cls)}
                      className="p-2 hover:bg-gray-100 rounded-lg text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-gray-800">{cls.name}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Walikelas: {walikelas?.name || "-"}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? "Edit Kelas" : "Tambah Kelas Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Kelas</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="X TKJ 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Walikelas</Label>
              <Select
                value={formData.walikelas_kode}
                onValueChange={(v) => setFormData({ ...formData, walikelas_kode: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Walikelas" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.kode_guru} value={teacher.kode_guru}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} className="bg-primary hover:bg-primary-light">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}