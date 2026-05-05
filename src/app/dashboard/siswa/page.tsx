"use client";

import { useState, useEffect } from "react";
import {
  FolderOpen,
  FileText,
  Download,
  RefreshCw,
  Grid,
  List,
  ChevronRight,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import type { FileItem } from "@/types";
import { formatFileSize } from "@/lib/utils";

export default function SiswaFileManagerPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Beranda" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [className, setClassName] = useState("");
  const [selectedTeacherName, setSelectedTeacherName] = useState("");

  useEffect(() => {
    // Pada load pertama / path berubah, panggil data file
    loadFiles(currentPath.length > 0 ? currentPath[currentPath.length - 1] : null);
  }, [currentPath]);

  const loadFiles = async (parentId: string | null = null) => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      setIsLoading(false);
      return;
    }

    const { student, selectedTeacherKode } = JSON.parse(sessionData);

    let classId = student.last_class_id || student.class_id;

    if (classId) {
      const { data: classData } = await supabase
        .from("classes")
        .select("name")
        .eq("id", classId)
        .single();
      if (classData) setClassName(classData.name);
    }

    if (selectedTeacherKode) {
      const { data: teacherData } = await supabase
        .from("teachers")
        .select("name, subject")
        .eq("kode_guru", selectedTeacherKode)
        .single();
      if (teacherData) {
        setSelectedTeacherName(teacherData.name);
      }
    }

    if (!classId) {
      setFiles([]);
      setIsLoading(false);
      return;
    }

    let query = supabase
      .from("files")
      .select("*")
      .eq("class_id", classId)
      .order("type", { ascending: false })
      .order("name", { ascending: true });

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data } = await query;

    if (data) {
      const filteredFiles = data.filter((file: FileItem) => {
        if (file.creator_role === "siswa") {
          return true;
        }

        if (!selectedTeacherKode) {
          return true;
        }

        return file.creator_kode === selectedTeacherKode;
      });

      setFiles(filteredFiles);
    }
    setIsLoading(false);
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === "folder") {
      setCurrentPath([...currentPath, file.id]);
      setBreadcrumbs([...breadcrumbs, { id: file.id, name: file.name }]);
    } else if (file.path) {
      window.open(file.path, "_blank");
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    const newPath = newBreadcrumbs.slice(1).map((b) => b.id).filter((p): p is string => p !== null);
    setCurrentPath(newPath);
  };

  const filteredFiles = searchTerm
    ? files.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : files;

  return (
    <div className="space-y-6">
      {/* ━━ Header ━━ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy dark:text-white">File Manager</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Materi ditampilkan sesuai kelas {className || "aktif"}
            {selectedTeacherName ? ` dan guru ${selectedTeacherName}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === "grid"
                ? "bg-navy text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
             aria-label="Grid view"
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode("list")}
             className={`p-2 rounded-lg transition-colors ${
              viewMode === "list"
                ? "bg-navy text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            }`}
            aria-label="List view"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => loadFiles(currentPath.length > 0 ? currentPath[currentPath.length - 1] : null)}
            className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            aria-label="Refresh files"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* ━━ Breadcrumb ━━ */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2 text-sm font-medium">
            {index > 0 && <ChevronRight size={14} className="text-slate-400" />}
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={`transition-colors hover:text-navy dark:hover:text-white ${
                index === breadcrumbs.length - 1
                  ? "text-navy dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* ━━ Search ━━ */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Cari materi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 border-slate-200 shadow-sm dark:border-slate-800 dark:bg-card"
        />
      </div>

      {/* ━━ File Grid/List ━━ */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse shadow-sm"
            >
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg mx-auto mb-3" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center shadow-card">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 dark:bg-slate-900 mb-4">
             <FolderOpen size={40} className="text-slate-300 dark:text-slate-500 dark:text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-navy dark:text-white mb-2">
            {searchTerm ? "Tidak Ditemukan" : "Belum Ada File"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchTerm ? `Tidak ada file materi bernama "${searchTerm}"` : "Materi dari guru akan secara otomatis muncul di sini."}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => handleFileClick(file)}
              className="bg-white dark:bg-card rounded-2xl p-4 shadow-card hover:shadow-panel cursor-pointer transition-all hover:-translate-y-1 border border-slate-200 hover:border-teal dark:border-slate-800 dark:hover:border-teal-500 group"
            >
              <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center mx-auto mb-3 text-teal">
                <FileText size={24} />
              </div>
              <p className="text-sm font-semibold text-navy dark:text-white text-center truncate px-2">
                {file.name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                {file.size ? formatFileSize(file.size) : ""}
              </p>
              {file.creator_role === "guru" && (
                <span className="flex w-fit mx-auto mt-3 px-2.5 py-1 bg-navy/5 text-navy dark:bg-teal/10 dark:text-teal font-bold text-[10px] rounded-full uppercase tracking-wider">
                  Materi Guru
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-900/50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nama File
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Ukuran
                </th>
                <th className="px-5 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-5 py-4 text-right text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {files.map((file) => (
                <tr
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex p-2 bg-teal/10 text-teal rounded-lg">
                        <FileText size={18} />
                      </div>
                      <span className="font-semibold text-navy dark:text-white">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {file.size ? formatFileSize(file.size) : "-"}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {new Date(file.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-navy hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-800 dark:hover:text-white rounded-lg transition-colors">
                      <Download size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
