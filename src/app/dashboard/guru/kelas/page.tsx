"use client";

import { useState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  Key,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
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
import type { Class } from "@/types";

type PresenceEntry = {
  role?: string;
  nis?: string;
};

export default function GuruKelasPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadClasses();
    const cleanup = subscribeToPresence();
    return cleanup;
  }, []);

  const subscribeToPresence = () => {
    const supabase = createClient();
    supabase
      .getChannels()
      .filter((existingChannel: any) => existingChannel?.topic === "realtime:online-users")
      .forEach((existingChannel: any) => {
        supabase.removeChannel(existingChannel);
      });

    const channel = supabase.channel("online-users");

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineNis = new Set<string>();
        
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.role === "siswa") onlineNis.add(p.nis);
          });
        });
        
        setOnlineUsers(onlineNis);
      })
      .on("presence", { event: "join" }, ({ newPresences }: { newPresences: PresenceEntry[] }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          newPresences.forEach((p) => {
            if (p.role === "siswa" && p.nis) next.add(p.nis);
          });
          return next;
        });
      })
      .on("presence", { event: "leave" }, ({ leftPresences }: { leftPresences: PresenceEntry[] }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          leftPresences.forEach((p) => {
            if (p.role === "siswa" && p.nis) next.delete(p.nis);
          });
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadClasses = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return;

    const { data } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    if (data) {
      setClasses(data);
    }
    setIsLoading(false);
  };

  const loadStudents = async (classId: string) => {
    const supabase = createClient();

    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("class_id", classId)
      .order("absen");

    if (data) {
      setStudents(data);
    }
  };

  const selectClass = (cls: Class) => {
    setSelectedClass(cls);
    loadStudents(cls.id);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.includes(searchTerm)
  );

  const handleResetPassword = async (student: any) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Kelola Kelas</h2>
        <p className="text-gray-500">Pilih kelas untuk melihat siswa</p>
      </div>

      {/* Class Cards */}
      <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            onClick={() => selectClass(cls)}
            className={`bg-white rounded-xl p-6 shadow-sm cursor-pointer transition-all hover:-translate-y-1 hover:shadow-md ${
              selectedClass?.id === cls.id
                ? "border-2 border-primary"
                : "border-2 border-transparent"
            }`}
          >
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
              <Users size={24} className="text-primary" />
            </div>
            <h3 className="font-bold text-center text-gray-800">{cls.name}</h3>
            <p className="text-sm text-gray-500 text-center mt-1">
              Klik untuk melihat siswa
            </p>
          </div>
        ))}
      </div>

      {/* Student List */}
      {selectedClass && (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-gray-800">
                Siswa - {selectedClass.name}
              </h3>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-600 rounded-full border border-green-100 animate-pulse">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs font-bold">
                  {filteredStudents.filter(s => onlineUsers.has(s.nis)).length} Online Saat Ini
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsImportModalOpen(true)} size="sm" variant="outline">
                <Upload size={16} />
                Import
              </Button>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Cari nama atau NIS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users size={48} className="mx-auto mb-3 opacity-50" />
              <p>Tidak ada siswa ditemukan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      NIS
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Telepon
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student, index) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {student.absen || index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {student.nis}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 relative">
                        <div className="flex items-center gap-2">
                          {student.name}
                          {onlineUsers.has(student.nis) && (
                            <div className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500 status-pulse"></span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {student.email || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {student.phone || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleResetPassword(student)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-warning"
                          title="Reset Password"
                        >
                          <Key size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ImportSiswaModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={() => selectedClass && loadStudents(selectedClass.id)}
      />
    </div>
  );
}
