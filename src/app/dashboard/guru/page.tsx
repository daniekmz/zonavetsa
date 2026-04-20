"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Upload,
  FolderPlus,
  FolderOpen,
  FileText,
  Download,
  Trash2,
  RefreshCw,
  Grid,
  List,
  ChevronRight,
  Home,
  User,
  Search,
  SortAsc,
  Calendar,
  MoreVertical,
  Folder,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { Avatar } from "@/components/avatar";
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
import type { FileItem, Class } from "@/types";
import { formatFileSize, formatDate } from "@/lib/utils";

interface ClassWithStats extends Class {
  fileCount?: number;
  folderCount?: number;
  lastUpdated?: string;
}

function canTeacherManageFile(file: FileItem, teacherKode: string) {
  if (file.creator_role === "siswa") return true;
  if (file.creator_role === "guru" && file.creator_kode === teacherKode) return true;
  return false;
}

function extractStoragePathFromPublicUrl(url?: string) {
  if (!url) return null;
  const marker = "/storage/v1/object/public/files/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;
  const objectPath = url.slice(markerIndex + marker.length).split("?")[0];
  return objectPath || null;
}

export default function GuruFileManagerPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [classes, setClasses] = useState<ClassWithStats[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Beranda" },
  ]);
  const [teacherAvatar, setTeacherAvatar] = useState<string | null>(null);
  
  // UI Enhancements
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [classFiles, setClassFiles] = useState<Record<string, FileItem[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClasses();
    loadTeacherProfile();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadFiles();
    }
  }, [selectedClassId, currentPath]);

  const loadClasses = async () => {
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return;

    const { data: allClasses } = await supabase
      .from("classes")
      .select("*")
      .order("name");

    const classIds = (allClasses || []).map((classItem: Class) => classItem.id);
    const classesWithStats: ClassWithStats[] = [];
    
    for (const cid of classIds) {
      const { kode_guru } = JSON.parse(sessionData);
      const { data: filesData } = await supabase
        .from("files")
        .select("id, type, created_at, creator_role, creator_kode")
        .eq("class_id", cid);

      const manageableFiles = (filesData || []).filter((file: FileItem) =>
        canTeacherManageFile(file, kode_guru)
      );
      const folderCount = manageableFiles.filter((f: any) => f.type === "folder").length || 0;
      const fileCount = manageableFiles.filter((f: any) => f.type === "file").length || 0;
      const lastFile = manageableFiles.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];
      
      const cls = (allClasses || []).find((classItem: Class) => classItem.id === cid) as Class;
      classesWithStats.push({
        ...cls,
        id: cid,
        fileCount: fileCount + folderCount,
        folderCount,
        lastUpdated: lastFile?.created_at,
      });
    }
    
    setClasses(classesWithStats);
  };

  const loadTeacherProfile = async () => {
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return;
    
    const { kode_guru } = JSON.parse(sessionData);
    const { data } = await supabase
      .from("teachers")
      .select("avatar_url")
      .eq("kode_guru", kode_guru)
      .single();
    
    if (data?.avatar_url) {
      setTeacherAvatar(data.avatar_url);
    }
  };

  const loadFilesForClass = async (classId: string, parentId: string | null = null) => {
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return [];
    const { kode_guru } = JSON.parse(sessionData);
    
    let query = supabase
      .from("files")
      .select("*")
      .eq("class_id", classId)
      .order("type", { ascending: false })
      .order("name");

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data } = await query;
    return ((data || []) as FileItem[]).filter((file) => canTeacherManageFile(file, kode_guru));
  };

  const loadFiles = async (parentId: string | null = null) => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    
    if (!sessionData || !selectedClassId) {
      setFiles([]);
      setIsLoading(false);
      return;
    }
    
    const { kode_guru } = JSON.parse(sessionData);

    let query = supabase
      .from("files")
      .select("*")
      .eq("class_id", selectedClassId)
      .order("type", { ascending: false })
      .order("name");

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data, error } = await query;

    if (data) {
      const manageableFiles = (data as FileItem[]).filter((file) =>
        canTeacherManageFile(file, kode_guru)
      );
      setFiles(manageableFiles);
    }
    setIsLoading(false);
  };

  const toggleClassExpand = async (classId: string) => {
    const newExpanded = new Set(expandedClasses);
    
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
      // Load files for this class if not loaded
      if (!classFiles[classId]) {
        const filesData = await loadFilesForClass(classId);
        setClassFiles(prev => ({ ...prev, [classId]: filesData }));
      }
    }
    
    setExpandedClasses(newExpanded);
  };

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    setCurrentPath([]);
    setBreadcrumbs([{ id: null, name: "Beranda" }]);
  };

  const sortedFiles = useMemo(() => {
    let sorted = [...files];
    
    // Filter by search
    if (searchTerm) {
      sorted = sorted.filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort
    sorted.sort((a, b) => {
      if (sortBy === "name") {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (sortBy === "date") {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortAsc ? dateA - dateB : dateB - dateA;
      } else if (sortBy === "size") {
        return sortAsc ? (a.size || 0) - (b.size || 0) : (b.size || 0) - (a.size || 0);
      }
      return 0;
    });
    
    return sorted;
  }, [files, searchTerm, sortBy, sortAsc]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast("Nama folder wajib diisi", "error");
      return;
    }

    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData || !selectedClassId) {
      toast("Pilih kelas terlebih dahulu", "error");
      return;
    }

    const { kode_guru } = JSON.parse(sessionData);

    const { error } = await supabase.from("files").insert({
      name: newFolderName.trim(),
      type: "folder",
      class_id: selectedClassId,
      creator_kode: kode_guru,
      creator_role: "guru",
      parent_id: currentPath.length > 0 ? currentPath[currentPath.length - 1] : null,
    });

    if (error) {
      toast("Gagal membuat folder", "error");
    } else {
      toast("Folder berhasil dibuat", "success");
      loadFiles(currentPath.length > 0 ? currentPath[currentPath.length - 1] : null);
      setNewFolderName("");
      setShowNewFolderModal(false);
    }
  };
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClassId) return;

    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return;
    
    const teacherSession = JSON.parse(sessionData);
    const teacherKode = teacherSession.kode_guru;
    const teacherName = teacherSession.name || teacherSession.nama_guru || "Guru";
    
    toast(`Mengupload ${file.name}...`, "info");

    // 1. Upload to Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${selectedClassId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("files")
      .upload(filePath, file);

    if (uploadError) {
      toast("Gagal upload file ke storage", "error");
      return;
    }

    // 2. Save to Database
    const { data: publicUrlData } = supabase.storage
      .from("files")
      .getPublicUrl(filePath);

    const { error: dbError } = await supabase.from("files").insert({
      name: file.name,
      type: "file",
      mime_type: file.type,
      size: file.size,
      path: publicUrlData.publicUrl,
      class_id: selectedClassId,
      creator_kode: teacherKode,
      creator_role: "guru",
      parent_id: currentPath.length > 0 ? currentPath[currentPath.length - 1] : null,
    });

    if (dbError) {
      toast("Gagal mencatat file di database", "error");
    } else {
      toast("File berhasil diupload", "success");
      loadFiles(currentPath.length > 0 ? currentPath[currentPath.length - 1] : null);
      
      // 3. Notify Students
      const { data: students } = await supabase
        .from("students")
        .select("nis")
        .eq("last_class_id", selectedClassId);
      
      if (students && students.length > 0) {
        const nisList = students.map((student: { nis: string }) => student.nis);
        const { notifyFileUpload } = await import("@/lib/notifications");
        const folderName = breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 1].name : undefined;
        const className = classes.find((cls) => cls.id === selectedClassId)?.name;
        await notifyFileUpload(
          file.name,
          teacherKode,
          teacherName,
          "guru",
          nisList,
          "siswa",
          folderName,
          className
        );
      }
      
      loadClasses();
    }
  };

  const handleFileClick = (file: FileItem) => {
    if (file.type === "folder") {
      const newBreadcrumb = { id: file.id, name: file.name };
      setBreadcrumbs([...breadcrumbs, newBreadcrumb]);
      setCurrentPath([...currentPath, file.id]);
      loadFiles(file.id);
    } else if (file.path) {
      window.open(file.path, "_blank");
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    
    const newPath = newBreadcrumbs.slice(1).map((b) => b.id).filter((p): p is string => p !== null);
    setCurrentPath(newPath);
    
    loadFiles(newPath.length > 0 ? newPath[newPath.length - 1] : null);
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Hapus "${file.name}"?`)) return;

    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) {
      toast("Sesi guru tidak ditemukan", "error");
      return;
    }
    const { kode_guru } = JSON.parse(sessionData);

    if (!canTeacherManageFile(file, kode_guru)) {
      toast("Anda tidak punya izin menghapus file ini", "error");
      return;
    }

    if (file.type === "file" && file.path) {
      const storagePath = extractStoragePathFromPublicUrl(file.path);
      if (storagePath) {
        const { error: storageError } = await supabase.storage.from("files").remove([storagePath]);
        if (storageError) {
          console.error("Storage delete failed:", storageError);
        }
      }
    }

    const { error } = await supabase.from("files").delete().eq("id", file.id);

    if (error) {
      toast("Gagal menghapus", "error");
    } else {
      toast("Berhasil dihapus", "success");
      loadFiles(currentPath.length > 0 ? currentPath[currentPath.length - 1] : null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar src={teacherAvatar} name="Guru" size="md" className="ring-2 ring-primary" />
          <div>
            <h2 className="text-2xl font-bold text-primary">File Manager</h2>
            <p className="text-gray-500">
              Pilih kelas terlebih dahulu, lalu buat folder atau upload materi ke kelas tersebut
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowNewFolderModal(true)} variant="outline" disabled={!selectedClassId}>
            <FolderPlus size={18} />
            Folder Baru
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button onClick={handleUploadClick} disabled={!selectedClassId}>
            <Upload size={18} />
            Upload File
          </Button>
        </div>
      </div>

      {/* Search & Sort Bar */}
      {selectedClassId && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[220px]">
              <Select value={selectedClassId} onValueChange={handleSelectClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Cari file..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "name" | "date" | "size")}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Urutkan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nama</SelectItem>
                <SelectItem value="date">Tanggal</SelectItem>
                <SelectItem value="size">Ukuran</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortAsc(!sortAsc)}>
              {sortAsc ? <SortAsc size={18} /> : <SortAsc size={18} className="rotate-180" />}
            </Button>
          </div>
        </div>
      )}

      {/* Classes Dashboard */}
      {!selectedClassId ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-700">Kelas Anda</h3>
          {classes.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm">
              <Folder size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Belum Ada Kelas
              </h3>
              <p className="text-gray-500">
                Anda belum memiliki kelas dengan materi
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => handleSelectClass(cls.id!)}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 border-2 border-transparent hover:border-primary group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                      <FolderOpen size={24} className="text-secondary" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleClassExpand(cls.id!);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      {expandedClasses.has(cls.id!) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-1">{cls.name}</h4>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{cls.fileCount || 0} file</span>
                    {cls.lastUpdated && (
                      <span>{formatDate(cls.lastUpdated)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <button
              onClick={() => {
                setSelectedClassId("");
                setCurrentPath([]);
                setBreadcrumbs([{ id: null, name: "Beranda" }]);
              }}
              className="text-gray-500 hover:text-primary"
            >
              Daftar Kelas
            </button>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="text-primary font-medium">
              {classes.find(c => c.id === selectedClassId)?.name}
            </span>
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

          {/* Files */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
                </div>
              ))}
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm">
              <FolderOpen size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {searchTerm ? "Tidak Ditemukan" : "Folder Kosong"}
              </h3>
              <p className="text-gray-500">
                {searchTerm ? `Tidak ada file bernama "${searchTerm}"` : "Upload file atau buat folder baru untuk memulai"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {sortedFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => handleFileClick(file)}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all hover:-translate-y-1 border-2 border-transparent hover:border-primary group"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    {file.type === "folder" ? (
                      <FolderOpen size={24} className="text-secondary" />
                    ) : (
                      <FileText size={24} className="text-primary" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-800 text-center truncate">
                    {file.name}
                  </p>
                  {file.type === "file" && (
                    <p className="text-xs text-gray-500 text-center mt-1">
                      {file.size ? formatFileSize(file.size) : ""}
                    </p>
                  )}
                  <div className="flex justify-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file);
                      }}
                      className="p-1.5 bg-danger/10 text-danger rounded hover:bg-danger/20"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* New Folder Modal */}
      <Dialog open={showNewFolderModal} onOpenChange={setShowNewFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Folder Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Nama folder"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolderModal(false)}>Batal</Button>
            <Button onClick={handleCreateFolder} className="bg-success hover:bg-success/90">Buat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
