"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Megaphone, Pin, Plus, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { notifyAnnouncementToStudents } from "@/lib/notifications";
import type { Announcement, Class, Teacher } from "@/types";

type ScopeType = "all" | "class";

const INITIAL_FORM = {
  title: "",
  content: "",
  scope: "all" as ScopeType,
  classId: "",
  isPinned: false,
  isActive: true,
  expiresAt: "",
};

export default function GuruPengumumanPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const myAnnouncements = useMemo(() => {
    return announcements
      .filter((item) => item.author_role === "guru" && item.author_kode === teacher?.kode_guru)
      .sort((a, b) => {
        if ((a.is_pinned ? 1 : 0) !== (b.is_pinned ? 1 : 0)) {
          return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [announcements, teacher]);

  const loadData = async () => {
    setIsLoading(true);
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) {
      setIsLoading(false);
      return;
    }

    const parsedTeacher = JSON.parse(sessionData) as Teacher;
    setTeacher(parsedTeacher);

    const supabase = createClient();
    const [{ data: classRows }, { data: announcementRows }] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
    ]);

    setClasses((classRows || []) as Class[]);
    setAnnouncements((announcementRows || []) as Announcement[]);
    setIsLoading(false);
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
  };

  const handleCreate = async () => {
    if (!teacher) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast("Judul dan isi pengumuman wajib diisi", "error");
      return;
    }
    if (form.scope === "class" && !form.classId) {
      toast("Pilih kelas tujuan terlebih dahulu", "error");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();

    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      author_kode: teacher.kode_guru,
      author_role: "guru" as const,
      author_name: teacher.name,
      target_roles: ["siswa"],
      target_classes: form.scope === "class" ? [form.classId] : [],
      is_pinned: form.isPinned,
      is_active: form.isActive,
      expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };

    const { error } = await supabase.from("announcements").insert(payload);
    if (error) {
      console.error(error);
      toast("Gagal membuat pengumuman", "error");
    } else {
      await notifyAnnouncementToStudents({
        announcementTitle: payload.title,
        announcementContent: payload.content,
        senderKode: teacher.kode_guru,
        senderRole: "guru",
        senderName: teacher.name,
        targetClassIds: payload.target_classes,
      });
      toast("Pengumuman guru berhasil dibuat", "success");
      resetForm();
      await loadData();
    }
    setIsSaving(false);
  };

  const handleDelete = async (item: Announcement) => {
    if (!confirm(`Hapus pengumuman "${item.title}"?`)) return;
    setDeleteId(item.id);
    const supabase = createClient();
    const { error } = await supabase.from("announcements").delete().eq("id", item.id);
    if (error) {
      console.error(error);
      toast("Gagal menghapus pengumuman", "error");
    } else {
      toast("Pengumuman berhasil dihapus", "success");
      await loadData();
    }
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-50 text-navy dark:bg-navy/20 dark:text-navy-200">
            <Megaphone size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-navy dark:text-white">Pengumuman Guru</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Buat pengumuman untuk siswa dari guru pengampu, baik untuk semua kelas maupun kelas tertentu.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={18} className="text-navy dark:text-navy-200" />
            <h3 className="text-lg font-bold text-navy dark:text-white">Buat Pengumuman Baru</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Judul</label>
              <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Contoh: Jadwal remedial minggu ini" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Isi Pengumuman</label>
              <textarea
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="Tulis isi pengumuman untuk siswa..."
                className="min-h-[180px] w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none transition focus:border-primary"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Target Siswa</label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant={form.scope === "all" ? "default" : "outline"} onClick={() => setForm((prev) => ({ ...prev, scope: "all", classId: "" }))}>
                    Semua Kelas
                  </Button>
                  <Button type="button" variant={form.scope === "class" ? "default" : "outline"} onClick={() => setForm((prev) => ({ ...prev, scope: "class" }))}>
                    Kelas Tertentu
                  </Button>
                </div>
                {form.scope === "class" ? (
                  <select
                    value={form.classId}
                    onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
                    className="h-11 w-full rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 text-sm text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Pilih kelas tujuan</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Masa Berlaku (opsional)</label>
                <Input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={form.isPinned ? "default" : "outline"} onClick={() => setForm((prev) => ({ ...prev, isPinned: !prev.isPinned }))}>
                <Pin size={14} className="mr-2" />
                {form.isPinned ? "Pinned" : "Pin Pengumuman"}
              </Button>
              <Button type="button" variant={form.isActive ? "default" : "outline"} onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}>
                {form.isActive ? "Aktif" : "Nonaktif"}
              </Button>
            </div>

            <Button type="button" onClick={() => void handleCreate()} disabled={isSaving} className="bg-navy hover:bg-navy-700 text-white">
              <Save size={16} className="mr-2" />
              {isSaving ? "Menyimpan..." : "Simpan Pengumuman"}
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-navy dark:text-white">Pengumuman Saya</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daftar pengumuman yang pernah Anda kirim ke siswa.</p>

          {isLoading ? (
            <div className="mt-5 space-y-3">
              {[1, 2].map((item) => (
                <div key={item} className="rounded-2xl bg-slate-50 dark:bg-slate-800 p-4 animate-pulse">
                  <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
                  <div className="mt-3 h-12 rounded bg-gray-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          ) : myAnnouncements.length === 0 ? (
            <div className="mt-5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 py-14 text-center">
              <Megaphone size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">Belum ada pengumuman guru</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {myAnnouncements.map((item) => (
                <article key={item.id} className="rounded-2xl border border-gray-100 dark:border-slate-800 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">{item.title}</h4>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={13} />
                          {new Date(item.created_at).toLocaleString("id-ID")}
                        </span>
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">
                          {item.target_classes?.length ? "Kelas Tertentu" : "Semua Kelas"}
                        </span>
                        {item.is_pinned ? <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1">Pinned</span> : null}
                        {item.is_active === false ? <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-1">Nonaktif</span> : null}
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" disabled={deleteId === item.id} onClick={() => void handleDelete(item)} className="text-danger hover:text-danger">
                      <Trash2 size={14} className="mr-1" />
                      Hapus
                    </Button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">{item.content}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
