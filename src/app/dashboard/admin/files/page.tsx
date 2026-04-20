"use client";

import { useEffect, useState } from "react";
import { FolderOpen, File, Plus, Search, Edit2, Trash2, Download, Upload, MoreVertical, FileText, User } from "lucide-react";
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

interface FileItemWithCreator extends FileItem {
  creator_name?: string;
  creator_avatar?: string;
}

export default function AdminFilesPage() {
  const [files, setFiles] = useState<FileItemWithCreator[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Root" },
  ]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderClass, setFolderClass] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string | "all">("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [filesRes, classesRes, teachersRes, studentsRes] = await Promise.all([
      supabase.from("files").select("*").order("type", { ascending: false }).order("name"),
      supabase.from("classes").select("*").order("name"),
      supabase.from("teachers").select("kode_guru, name, avatar_url"),
      supabase.from("students").select("nis, name, avatar_url"),
    ]);

    const teachers = teachersRes.data || [];
    const students = studentsRes.data || [];

    // Map creator info to files
    const filesWithCreator = (filesRes.data || []).map((file: FileItem) => {
      let creator_name = "Unknown";
      let creator_avatar = undefined;

      if (file.creator_role === "guru") {
        const teacher = teachers.find((t: { kode_guru: string; name: string; avatar_url?: string | null }) => t.kode_guru === file.creator_kode);
        if (teacher) {
          creator_name = teacher.name;
          creator_avatar = teacher.avatar_url || undefined;
        }
      } else if (file.creator_role === "siswa") {
        const student = students.find((s: { nis: string; name: string; avatar_url?: string | null }) => s.nis === file.creator_kode);
        if (student) {
          creator_name = student.name;
          creator_avatar = student.avatar_url || undefined;
        }
      } else if (file.creator_role === "admin") {
        creator_name = "Admin";
      }

      return { ...file, creator_name, creator_avatar };
    });

    setFiles(filesWithCreator);
    if (classesRes.data) setClasses(classesRes.data);
    setIsLoading(false);
  };

  const rootFiles = currentFolder
    ? files.filter((f) => f.parent_id === currentFolder)
    : files.filter((f) => !f.parent_id);

  const filteredByClass = selectedClass === "all"
    ? rootFiles
    : rootFiles.filter((f) => f.class_id === selectedClass);

  const filteredFiles = filteredByClass.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const navigateToFolder = (folder: FileItem) => {
    if (folder.type === "folder") {
      setCurrentFolder(folder.id);
      setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(newBreadcrumbs[index].id);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast("Nama folder wajib diisi", "error");
      return;
    }

    if (!folderClass) {
      toast("Pilih kelas terlebih dahulu", "error");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("files").insert({
      name: newFolderName,
      type: "folder",
      parent_id: currentFolder,
      class_id: folderClass,
      creator_role: "admin",
    });

    if (error) {
      toast("Gagal membuat folder", "error");
    } else {
      toast("Folder berhasil dibuat", "success");
      loadData();
      setIsFolderModalOpen(false);
      setNewFolderName("");
      setFolderClass("");
    }
  };

  const handleDelete = async (file: FileItem) => {
    if (!confirm(`Hapus ${file.type === "folder" ? "folder" : "file"} "${file.name}"?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("files").delete().eq("id", file.id);

    if (error) {
      toast("Gagal menghapus", "error");
    } else {
      toast("Berhasil dihapus", "success");
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">File Manager</h2>
          <p className="text-gray-500">Kelola file pembelajaran</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsFolderModalOpen(true)} variant="outline">
            <FolderOpen size={18} />
            Folder Baru
          </Button>
          <Button onClick={() => setIsUploadModalOpen(true)} className="bg-success hover:bg-success/90">
            <Upload size={18} />
            Upload File
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-gray-400">/</span>}
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className={`hover:text-primary ${index === breadcrumbs.length - 1 ? "font-bold text-primary" : "text-gray-500"}`}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Semua Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative max-w-md flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari file..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Files Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-50" />
          <p>Tidak ada file</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => navigateToFolder(file)}
              className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                {file.type === "folder" ? (
                  <FolderOpen size={32} className="text-warning" />
                ) : (
                  <FileText size={32} className="text-primary" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="font-medium text-sm truncate">{file.name}</p>
              <p className="text-xs text-gray-500 truncate">{file.type}</p>
              {file.creator_name && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                  <Avatar src={file.creator_avatar} name={file.creator_name} size="sm" />
                  <span className="text-xs text-gray-500 truncate">{file.creator_name}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Folder Modal */}
      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buat Folder Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">Pilih Kelas</p>
              <Select value={folderClass} onValueChange={setFolderClass}>
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
            <Input
              placeholder="Nama folder"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFolderModalOpen(false)}>Batal</Button>
            <Button onClick={handleCreateFolder} className="bg-success hover:bg-success/90">Buat</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">Pilih Kelas</p>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
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
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
              <Upload size={32} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Klik untuk pilih file</p>
              <p className="text-xs text-gray-400 mt-1">atau drag and drop</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>Batal</Button>
            <Button className="bg-success hover:bg-success/90">Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}