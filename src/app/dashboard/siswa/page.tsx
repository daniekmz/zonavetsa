"use client";

import { useEffect, useState } from "react";
import {
  FolderOpen,
  FileText,
  Download,
  RefreshCw,
  Grid,
  List,
  ChevronRight,
  Home,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FileItem, Student } from "@/types";
import { formatFileSize } from "@/lib/utils";

interface StudentSession {
  student: Student;
  selected: boolean;
}

export default function StudentDashboardPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Beranda" },
  ]);
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [className, setClassName] = useState<string>("");
  const [selectedTeacherKode, setSelectedTeacherKode] = useState<string>("");
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadStudentInfo();
  }, []);

  useEffect(() => {
    if (studentClassId) {
      loadFiles();
    }
  }, [studentClassId, currentPath, selectedTeacherKode]);

  const loadStudentInfo = async () => {
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");
    
    if (!sessionData) return;
    
    const session: StudentSession = JSON.parse(sessionData);
    const { student } = session;
    const effectiveClassId = student.last_class_id || student.class_id;
    
    if (student.last_teacher_kode) {
      setSelectedTeacherKode(student.last_teacher_kode);
    }

    if (effectiveClassId) {
      const [classRes, teacherRes] = await Promise.all([
        supabase
          .from("classes")
          .select("id, name")
          .eq("id", effectiveClassId)
          .single(),
        student.last_teacher_kode
          ? supabase
              .from("teachers")
              .select("name")
              .eq("kode_guru", student.last_teacher_kode)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      if (classRes.data) {
        setStudentClassId(classRes.data.id);
        setClassName(classRes.data.name);
      }

      if (teacherRes.data?.name) {
        setSelectedTeacherName(teacherRes.data.name);
      }
    }
  };

  const loadFiles = async () => {
    if (!studentClassId) return;
    
    setIsLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("files")
      .select("*")
      .eq("class_id", studentClassId)
      .order("type", { ascending: false })
      .order("name");

    if (currentPath.length > 0) {
      query = query.eq("parent_id", currentPath[currentPath.length - 1]);
    } else {
      query = query.is("parent_id", null);
    }

    const { data } = await query;

    if (data) {
      const filteredFiles = (data as FileItem[]).filter((file) => {
        if (file.creator_role !== "guru") {
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">File Manager</h2>
          <p className="text-gray-500">
            Materi ditampilkan sesuai kelas {className || "aktif"}
            {selectedTeacherName ? ` dan guru ${selectedTeacherName}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg ${
              viewMode === "grid"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg ${
              viewMode === "list"
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            <List size={18} />
          </button>
          <button
            onClick={loadFiles}
            className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm flex-wrap">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight size={14} className="text-gray-400" />}
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={`hover:text-primary ${
                index === breadcrumbs.length - 1
                  ? "text-primary font-medium"
                  : "text-gray-500"
              }`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Cari file..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* File Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-pulse"
            >
              <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-lg mx-auto mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
          <FolderOpen size={64} className="mx-auto text-gray-300 dark:text-slate-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-100 mb-2">
            {searchTerm ? "Tidak Ditemukan" : "Belum Ada File"}
          </h3>
          <p className="text-gray-500 dark:text-slate-400">
            {searchTerm ? `Tidak ada file bernama "${searchTerm}"` : "Materi dari guru akan muncul di sini"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => handleFileClick(file)}
              className="bg-white dark:bg-slate-900/80 rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 border-2 border-transparent hover:border-primary dark:hover:border-cyan-400/40"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FileText size={24} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-gray-800 dark:text-slate-100 text-center truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 text-center mt-1">
                {file.size ? formatFileSize(file.size) : ""}
              </p>
              {file.creator_role === "guru" && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-info/10 text-info text-xs rounded">
                  Materi Guru
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Nama File
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Ukuran
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600 dark:text-slate-300">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {files.map((file) => (
                <tr
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="hover:bg-gray-50 dark:hover:bg-slate-800/70 cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText size={20} className="text-primary" />
                      <span className="font-medium text-gray-800 dark:text-slate-100">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                    {file.size ? formatFileSize(file.size) : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-slate-400">
                    {new Date(file.created_at).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg">
                      <Download size={16} />
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
