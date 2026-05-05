/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [NEW] Manajemen User (Admin)
   Menampilkan daftar gabungan Guru dan Siswa dengan tab filtering.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
"use client";

import { useEffect, useState } from "react";
import { Search, UserCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type UserData = {
  id: string;
  name: string;
  role: "guru" | "siswa";
  identifier: string; // NIS atau Kode Guru
  meta: string; // Kelas atau Mata Pelajaran
};

export default function ManajemenUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "guru" | "siswa">("all");

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      const supabase = createClient();
      
      const [teachersRes, studentsRes] = await Promise.all([
        supabase.from("teachers").select("id, name, kode_guru, subject"),
        supabase.from("students").select("id, name, nis, class_id")
      ]);

      const combined: UserData[] = [
        ...((teachersRes.data || []).map(t => ({
          id: t.id,
          name: t.name,
          role: "guru" as const,
          identifier: t.kode_guru,
          meta: t.subject || "Guru"
        }))),
        ...((studentsRes.data || []).map(s => ({
          id: s.id,
          name: s.name,
          role: "siswa" as const,
          identifier: s.nis,
          meta: `Kelas ${s.class_id || "-"}`
        })))
      ];

      setUsers(combined);
      setIsLoading(false);
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                          u.identifier.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy dark:text-white">Manajemen User</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola data guru dan siswa dalam satu tampilan terpadu.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-card dark:bg-card dark:border-slate-800">
        
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit dark:bg-slate-900">
            {(["all", "guru", "siswa"] as const).map(role => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterRole === role 
                    ? "bg-white dark:bg-slate-900 text-navy shadow-sm dark:bg-slate-800 dark:text-white" 
                    : "text-slate-500 dark:text-slate-400 hover:text-navy dark:hover:text-white"
                }`}
              >
                {role === "all" ? "Semua User" : role === "guru" ? "Guru" : "Siswa"}
              </button>
            ))}
          </div>
          
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input 
              placeholder="Cari nama atau ID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* List */}
        <div className="divide-y border-t dark:divide-slate-800 dark:border-slate-800">
          {isLoading ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">Memuat data user...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400">Tidak ada user ditemukan.</div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    user.role === "guru" ? "bg-navy-50 text-navy" : "bg-teal-50 text-teal"
                  }`}>
                    {user.role === "guru" ? <Users size={20} /> : <UserCheck size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-navy dark:text-white">{user.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.identifier} • {user.meta}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`badge ${user.role === "guru" ? "badge-navy" : "badge-teal"}`}>
                    {user.role.toUpperCase()}
                  </span>
                  <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400">Edit</Button>
                </div>
              </div>
            ))
          )}
        </div>
        
      </div>
    </div>
  );
}
