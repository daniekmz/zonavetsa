"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Megaphone, Pin, RefreshCw, UserSquare2 } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Announcement, Student } from "@/types";

interface StudentSession {
  student: Student;
  selected: boolean;
}

export default function PengumumanPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  const visibleAnnouncements = useMemo(() => {
    if (!student) return [];

    const studentClassId = student.last_class_id || student.class_id || "";
    const now = Date.now();

    return announcements
      .filter((item) => item.is_active !== false)
      .filter((item) => !item.expires_at || new Date(item.expires_at).getTime() >= now)
      .filter((item) => !item.target_roles?.length || item.target_roles.includes("siswa"))
      .filter((item) => !item.target_classes?.length || (studentClassId ? item.target_classes.includes(studentClassId) : false))
      .sort((a, b) => {
        if ((a.is_pinned ? 1 : 0) !== (b.is_pinned ? 1 : 0)) {
          return (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [announcements, student]);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      setAnnouncements([]);
      setStudent(null);
      setIsLoading(false);
      return;
    }

    const parsed = JSON.parse(sessionData) as StudentSession;
    setStudent(parsed.student);

    const supabase = createClient();
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements((data || []) as Announcement[]);
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-navy dark:text-white">Pengumuman</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Informasi terbaru dari guru dan admin sekolah yang ditujukan untuk siswa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAnnouncements()}
            className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw size={15} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm animate-pulse">
              <div className="h-5 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="mt-3 h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="mt-4 h-16 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
          ))}
        </div>
      ) : visibleAnnouncements.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center">
          <Megaphone size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="font-semibold text-slate-700 dark:text-slate-200">Belum ada pengumuman</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Pengumuman dari guru dan admin akan muncul di sini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleAnnouncements.map((item) => (
            <article
              key={item.id}
              className={`relative rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-card transition-shadow hover:shadow-panel dark:border-slate-800 ${
                item.is_pinned ? "border-amber-200 ring-1 ring-amber-500/20 dark:border-amber-500/30" : "border-gray-100"
              }`}
            >
              {item.is_pinned ? (
                <div className="absolute right-4 top-4 text-amber">
                  <Pin size={18} className="fill-amber/20" />
                </div>
              ) : null}

              <div className="mb-3 flex items-start gap-4">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    item.is_pinned ? "bg-amber-50 text-amber" : "bg-navy-50 text-navy"
                  }`}
                >
                  <Megaphone size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="pr-8 text-lg font-bold text-navy dark:text-white">{item.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 text-teal">
                      <UserSquare2 size={13} />
                      {item.author_name || (item.author_role === "admin" ? "Admin" : "Guru")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={13} />
                      {new Date(item.created_at).toLocaleString("id-ID")}
                    </span>
                    {item.target_classes?.length ? (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">
                        {item.target_classes.length === 1 ? "Kelas Tertentu" : `${item.target_classes.length} Kelas`}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">Semua Kelas</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">{item.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
