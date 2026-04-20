"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Briefcase,
  FileImage,
  FileText,
  ExternalLink,
  Download,
  ThumbsUp,
  MessageSquare,
  Upload,
  Loader2,
  Globe,
  Users,
  Send,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/avatar";
import { PortfolioFilePreview, getFileNameFromUrl, getPortfolioFileKind } from "@/components/portfolio-file-preview";
import { toast } from "@/components/ui/toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notifyPortfolioUpload } from "@/lib/notifications";
import type { Class, PortfolioComment, PortfolioItem, PortfolioLike, Student } from "@/types";

interface StudentSession {
  student: Student;
  selected: boolean;
}

interface PortfolioFeedItem extends PortfolioItem {
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  uploader_avatar?: string | null;
  comments_list: (PortfolioComment & { avatar_url?: string | null })[];
}

type VisibilityFilter = "all" | "class" | "global";

export default function PortofolioPage() {
  const [items, setItems] = useState<PortfolioFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLikeLoadingId, setIsLikeLoadingId] = useState<string | null>(null);
  const [isCommentLoadingId, setIsCommentLoadingId] = useState<string | null>(null);
  const [isDeleteLoadingId, setIsDeleteLoadingId] = useState<string | null>(null);
  const [isDownloadLoadingId, setIsDownloadLoadingId] = useState<string | null>(null);
  const [isCommentActionLoadingId, setIsCommentActionLoadingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [htmlPreviewDoc, setHtmlPreviewDoc] = useState("");
  const [uploadScope, setUploadScope] = useState<"class" | "global">("class");
  const [viewerClassName, setViewerClassName] = useState("-");
  const [viewerClassId, setViewerClassId] = useState<string | null>(null);
  const [viewerNis, setViewerNis] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [selectedDetailItem, setSelectedDetailItem] = useState<PortfolioFeedItem | null>(null);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (visibilityFilter === "all") return true;
      return item.visibility_scope === visibilityFilter;
    });
  }, [items, visibilityFilter]);

  useEffect(() => {
    void loadPortofolios();
  }, []);

  const normalizeAvatarUrl = (supabase: ReturnType<typeof createClient>, avatarUrl?: string | null) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://") || avatarUrl.startsWith("data:")) {
      return avatarUrl;
    }
    const cleaned = avatarUrl.replace(/^\/+/, "");
    const marker = "avatars/";
    const objectPath = cleaned.includes(marker) ? cleaned.slice(cleaned.indexOf(marker)) : cleaned;
    const { data } = supabase.storage.from("avatars").getPublicUrl(objectPath);
    return data.publicUrl;
  };

  const extractStoragePathFromPublicUrl = (url?: string) => {
    if (!url) return null;
    const marker = "/storage/v1/object/public/files/";
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return null;
    return url.slice(markerIndex + marker.length).split("?")[0] || null;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
  };

  const handleDownloadFile = async (item: PortfolioFeedItem) => {
    setIsDownloadLoadingId(item.id);

    try {
      const response = await fetch(item.image_url);
      if (!response.ok) throw new Error("Failed to fetch file");

      const fileBlob = await response.blob();
      const objectUrl = URL.createObjectURL(fileBlob);
      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download = getFileNameFromUrl(item.image_url);
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      URL.revokeObjectURL(objectUrl);
      toast("File berhasil diunduh", "success");
    } catch (error) {
      console.error("Download file failed:", error);
      toast("Gagal mengunduh file", "error");
    } finally {
      setIsDownloadLoadingId(null);
    }
  };

  const resetForm = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setTitle("");
    setDescription("");
    setSelectedFile(null);
    setPreviewUrl("");
    setHtmlPreviewDoc("");
    setUploadScope("class");
  };

  const loadPortofolios = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");

    if (!sessionData) {
      setItems([]);
      setViewerNis(null);
      setIsLoading(false);
      return;
    }

    const session: StudentSession = JSON.parse(sessionData);
    const myNis = session.student.nis;
    const myClassId = session.student.last_class_id || session.student.class_id || null;
    setViewerNis(myNis);

    const [{ data: classesData }, { data: portfolioData, error: portfolioError }] = await Promise.all([
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("portofolios").select("*").order("created_at", { ascending: false }),
    ]);

    const classMap = new Map<string, string>();
    ((classesData || []) as Class[]).forEach((cls) => classMap.set(cls.id, cls.name));

    setViewerClassId(myClassId || null);
    setViewerClassName(myClassId ? classMap.get(myClassId) || "-" : "-");

    if (portfolioError || !portfolioData) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const visibleItems = (portfolioData as PortfolioItem[]).filter((item) => {
      if (item.student_nis === myNis) return true;
      if (item.visibility_scope === "global") return true;
      if (item.visibility_scope === "class" && myClassId && item.uploader_class_id === myClassId) return true;
      return false;
    });

    const portfolioIds = visibleItems.map((item) => item.id);
    let likesData: PortfolioLike[] = [];
    let commentsData: PortfolioComment[] = [];

    if (portfolioIds.length > 0) {
      const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
        supabase.from("portfolio_likes").select("*").in("portfolio_id", portfolioIds),
        supabase.from("portfolio_comments").select("*").in("portfolio_id", portfolioIds).order("created_at", { ascending: false }),
      ]);
      likesData = (likeRows || []) as PortfolioLike[];
      commentsData = (commentRows || []) as PortfolioComment[];
    }

    const relatedStudentNis = new Set<string>();
    const relatedTeacherKode = new Set<string>();

    visibleItems.forEach((item) => relatedStudentNis.add(item.student_nis));
    likesData.forEach((like) => {
      if (like.liker_role === "siswa" && like.liker_nis) relatedStudentNis.add(like.liker_nis);
      if (like.liker_role === "guru" && like.liker_kode) relatedTeacherKode.add(like.liker_kode);
    });
    commentsData.forEach((comment) => {
      if (comment.commenter_role === "siswa" && comment.commenter_nis) relatedStudentNis.add(comment.commenter_nis);
      if (comment.commenter_role === "guru" && comment.commenter_kode) relatedTeacherKode.add(comment.commenter_kode);
    });

    const [{ data: studentRows }, { data: teacherRows }] = await Promise.all([
      relatedStudentNis.size > 0
        ? supabase.from("students").select("nis, name, avatar_url").in("nis", Array.from(relatedStudentNis))
        : Promise.resolve({ data: [] as any[] }),
      relatedTeacherKode.size > 0
        ? supabase.from("teachers").select("kode_guru, name, avatar_url").in("kode_guru", Array.from(relatedTeacherKode))
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const studentMap = new Map(
      ((studentRows || []) as { nis: string; name: string; avatar_url?: string | null }[]).map((student) => [
        student.nis,
        { name: student.name, avatar_url: normalizeAvatarUrl(supabase, student.avatar_url) },
      ])
    );

    const teacherMap = new Map(
      ((teacherRows || []) as { kode_guru: string; name: string; avatar_url?: string | null }[]).map((teacher) => [
        teacher.kode_guru,
        { name: teacher.name, avatar_url: normalizeAvatarUrl(supabase, teacher.avatar_url) },
      ])
    );

    const likesByPortfolio = new Map<string, PortfolioLike[]>();
    likesData.forEach((like) => {
      const list = likesByPortfolio.get(like.portfolio_id) || [];
      list.push(like);
      likesByPortfolio.set(like.portfolio_id, list);
    });

    const commentsByPortfolio = new Map<string, PortfolioComment[]>();
    commentsData.forEach((comment) => {
      const list = commentsByPortfolio.get(comment.portfolio_id) || [];
      list.push(comment);
      commentsByPortfolio.set(comment.portfolio_id, list);
    });

    const mapped = visibleItems.map((item) => {
      const likes = likesByPortfolio.get(item.id) || [];
      const comments = (commentsByPortfolio.get(item.id) || []).map((comment) => {
        if (comment.commenter_role === "siswa" && comment.commenter_nis) {
          const student = studentMap.get(comment.commenter_nis);
          return {
            ...comment,
            commenter_name: student?.name || comment.commenter_name,
            avatar_url: student?.avatar_url || null,
          };
        }
        if (comment.commenter_role === "guru" && comment.commenter_kode) {
          const teacher = teacherMap.get(comment.commenter_kode);
          return {
            ...comment,
            commenter_name: teacher?.name || comment.commenter_name,
            avatar_url: teacher?.avatar_url || null,
          };
        }
        return { ...comment, avatar_url: null };
      });

      const uploader = studentMap.get(item.student_nis);

      return {
        ...item,
        uploader_name: uploader?.name || item.uploader_name || item.student_nis,
        uploader_avatar: uploader?.avatar_url || null,
        uploader_class_name:
          item.uploader_class_name ||
          (item.uploader_class_id ? classMap.get(item.uploader_class_id) || "-" : "-"),
        like_count: likes.length,
        comment_count: comments.length,
        liked_by_me: likes.some((like) => like.liker_role === "siswa" && like.liker_nis === myNis),
        comments_list: comments,
      };
    });

    setItems(mapped);
    setIsLoading(false);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast("Ukuran file maksimal 20MB", "error");
      event.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");

    const loweredName = file.name.toLowerCase();
    const isHtmlFile = file.type === "text/html" || loweredName.endsWith(".html") || loweredName.endsWith(".htm");
    if (isHtmlFile) {
      try {
        const htmlText = await file.text();
        setHtmlPreviewDoc(htmlText);
      } catch (error) {
        console.error("Read html file failed:", error);
        setHtmlPreviewDoc("");
        toast("Gagal membaca file HTML untuk preview", "error");
      }
      return;
    }

    setHtmlPreviewDoc("");
  };

  const handleUploadPortfolio = async () => {
    if (!title.trim() || !selectedFile) {
      toast("Judul dan file karya wajib diisi", "error");
      return;
    }

    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      toast("Sesi siswa tidak ditemukan", "error");
      return;
    }

    const session: StudentSession = JSON.parse(sessionData);
    const { student } = session;

    if (!student.last_teacher_kode) {
      toast("Silakan pilih guru pengajar terlebih dahulu", "error");
      return;
    }

    setIsUploading(true);
    const supabase = createClient();

    try {
      const extension = selectedFile.name.split(".").pop() || "file";
      const loweredName = selectedFile.name.toLowerCase();
      const isHtmlFile = selectedFile.type === "text/html" || loweredName.endsWith(".html") || loweredName.endsWith(".htm");
      const safeTitle = title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      const filePath = `portofolios/${student.nis}/${Date.now()}-${safeTitle || "karya"}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("files").upload(filePath, selectedFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: isHtmlFile ? "text/html; charset=utf-8" : selectedFile.type || undefined,
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("files").getPublicUrl(filePath);
      const { error: insertError } = await supabase.from("portofolios").insert({
        student_nis: student.nis,
        title: title.trim(),
        description: description.trim(),
        image_url: publicUrlData.publicUrl,
        visibility_scope: uploadScope,
        uploader_name: student.name,
        uploader_class_id: student.last_class_id || student.class_id || null,
        uploader_class_name: viewerClassName,
        likes: 0,
        comments: 0,
      });
      if (insertError) throw insertError;

      await notifyPortfolioUpload(student.last_teacher_kode, student.nis, student.name, title.trim());
      toast("Karya berhasil diupload", "success");
      setIsModalOpen(false);
      resetForm();
      await loadPortofolios();
    } catch (error) {
      console.error("Upload portfolio failed:", error);
      toast("Upload karya gagal", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleLike = async (item: PortfolioFeedItem) => {
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      toast("Sesi siswa tidak ditemukan", "error");
      return;
    }
    const session: StudentSession = JSON.parse(sessionData);
    const student = session.student;
    const supabase = createClient();
    setIsLikeLoadingId(item.id);

    try {
      if (item.liked_by_me) {
        const { error } = await supabase
          .from("portfolio_likes")
          .delete()
          .eq("portfolio_id", item.id)
          .eq("liker_role", "siswa")
          .eq("liker_nis", student.nis);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("portfolio_likes").insert({
          portfolio_id: item.id,
          liker_role: "siswa",
          liker_nis: student.nis,
          liker_name: student.name,
          liker_class_id: viewerClassId,
          liker_class_name: viewerClassName,
        });
        if (error) throw error;
      }
      await loadPortofolios();
    } catch (error) {
      console.error("Toggle like failed:", error);
      toast("Gagal memperbarui like", "error");
    } finally {
      setIsLikeLoadingId(null);
    }
  };

  const handleAddComment = async (itemId: string) => {
    const text = (commentDrafts[itemId] || "").trim();
    if (!text) {
      toast("Komentar tidak boleh kosong", "error");
      return;
    }

    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      toast("Sesi siswa tidak ditemukan", "error");
      return;
    }

    const session: StudentSession = JSON.parse(sessionData);
    const student = session.student;
    const supabase = createClient();
    setIsCommentLoadingId(itemId);

    try {
      const { error } = await supabase.from("portfolio_comments").insert({
        portfolio_id: itemId,
        commenter_role: "siswa",
        commenter_nis: student.nis,
        commenter_name: student.name,
        commenter_class_id: viewerClassId,
        commenter_class_name: viewerClassName,
        comment_text: text,
      });
      if (error) throw error;

      setCommentDrafts((prev) => ({ ...prev, [itemId]: "" }));
      await loadPortofolios();
    } catch (error) {
      console.error("Add comment failed:", error);
      toast("Gagal menambahkan komentar", "error");
    } finally {
      setIsCommentLoadingId(null);
    }
  };

  const startEditComment = (comment: PortfolioComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment_text);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleUpdateComment = async (comment: PortfolioComment) => {
    const nextText = editingCommentText.trim();
    if (!nextText) {
      toast("Komentar tidak boleh kosong", "error");
      return;
    }

    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      toast("Sesi siswa tidak ditemukan", "error");
      return;
    }

    const session: StudentSession = JSON.parse(sessionData);
    const supabase = createClient();
    setIsCommentActionLoadingId(comment.id);

    try {
      const { error } = await supabase
        .from("portfolio_comments")
        .update({ comment_text: nextText })
        .eq("id", comment.id)
        .eq("commenter_role", "siswa")
        .eq("commenter_nis", session.student.nis);
      if (error) throw error;

      cancelEditComment();
      toast("Komentar berhasil diperbarui", "success");
      await loadPortofolios();
    } catch (error) {
      console.error("Update comment failed:", error);
      toast("Gagal mengubah komentar", "error");
    } finally {
      setIsCommentActionLoadingId(null);
    }
  };

  const handleDeleteComment = async (comment: PortfolioComment) => {
    if (!confirm("Hapus komentar ini?")) return;

    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) {
      toast("Sesi siswa tidak ditemukan", "error");
      return;
    }

    const session: StudentSession = JSON.parse(sessionData);
    const supabase = createClient();
    setIsCommentActionLoadingId(comment.id);

    try {
      const { error } = await supabase
        .from("portfolio_comments")
        .delete()
        .eq("id", comment.id)
        .eq("commenter_role", "siswa")
        .eq("commenter_nis", session.student.nis);
      if (error) throw error;

      if (editingCommentId === comment.id) cancelEditComment();
      toast("Komentar berhasil dihapus", "success");
      await loadPortofolios();
    } catch (error) {
      console.error("Delete comment failed:", error);
      toast("Gagal menghapus komentar", "error");
    } finally {
      setIsCommentActionLoadingId(null);
    }
  };

  const handleDeletePortfolio = async (item: PortfolioFeedItem) => {
    if (!confirm(`Hapus karya "${item.title}"?`)) return;
    if (!viewerNis || item.student_nis !== viewerNis) {
      toast("Kamu hanya bisa menghapus karya milik sendiri", "error");
      return;
    }

    const supabase = createClient();
    setIsDeleteLoadingId(item.id);

    try {
      const storagePath = extractStoragePathFromPublicUrl(item.image_url);
      if (storagePath) {
        const { error: storageError } = await supabase.storage.from("files").remove([storagePath]);
        if (storageError) console.error("Delete file from storage failed:", storageError);
      }

      const { error } = await supabase.from("portofolios").delete().eq("id", item.id).eq("student_nis", viewerNis);
      if (error) throw error;

      toast("Karya berhasil dihapus", "success");
      await loadPortofolios();
    } catch (error) {
      console.error("Delete portfolio failed:", error);
      toast("Gagal menghapus karya", "error");
    } finally {
      setIsDeleteLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Briefcase size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Galeri Karya</h2>
            <p className="text-gray-500">Upload karya kamu, lalu tampilkan ke kelas atau seluruh pengguna.</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
          <Plus size={18} />
          Upload Karya Baru
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
        <Button variant={visibilityFilter === "all" ? "default" : "outline"} onClick={() => setVisibilityFilter("all")} className="h-9">
          Semua
        </Button>
        <Button variant={visibilityFilter === "class" ? "default" : "outline"} onClick={() => setVisibilityFilter("class")} className="h-9">
          <Users size={14} className="mr-2" />
          Kelas
        </Button>
        <Button variant={visibilityFilter === "global" ? "default" : "outline"} onClick={() => setVisibilityFilter("global")} className="h-9">
          <Globe size={14} className="mr-2" />
          Global
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="h-40 bg-gray-200" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 rounded bg-gray-200" />
                <div className="h-4 w-1/2 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-20 text-center">
          <FileImage size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-700">Belum Ada Karya</h3>
          <p className="mx-auto mt-2 max-w-sm text-gray-500">Upload sertifikat, hasil projek, atau dokumentasi tugas agar bisa dilihat publik.</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-6 bg-primary hover:bg-primary/90">
            <Upload size={16} className="mr-2" />
            Mulai Upload
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-lg">
              <div className="relative h-48 overflow-hidden bg-gray-100">
                {getPortfolioFileKind(item.image_url) === "image" ? (
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
                    <FileText size={44} className="text-primary" />
                    <p className="line-clamp-2 text-sm font-semibold text-gray-700">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      {getPortfolioFileKind(item.image_url) === "html" ? "Preview HTML5 tersedia" : "File non-gambar"}
                    </p>
                  </div>
                )}
                <div className="absolute left-3 top-3 inline-flex items-center rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                  {item.visibility_scope === "global" ? (
                    <>
                      <Globe size={12} className="mr-1" /> Global
                    </>
                  ) : (
                    <>
                      <Users size={12} className="mr-1" /> Kelas
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="mb-3 flex items-center gap-3">
                  <Avatar src={item.uploader_avatar} name={item.uploader_name || item.student_nis} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-800">{item.uploader_name || item.student_nis}</p>
                    <p className="truncate text-xs text-gray-500">{item.uploader_class_name || "-"}</p>
                  </div>
                </div>

                <h3 className="break-words text-base font-bold text-gray-800 sm:text-lg">{item.title}</h3>
                <p className="mb-3 mt-1 break-words text-sm leading-relaxed text-gray-600">{item.description || "Tanpa deskripsi"}</p>
                <div className="mb-4 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedDetailItem(item)}>
                    Lihat Detail
                  </Button>
                  <Button variant="outline" size="sm" disabled={isDownloadLoadingId === item.id} onClick={() => void handleDownloadFile(item)}>
                    <Download size={14} className="mr-2" />
                    {isDownloadLoadingId === item.id ? "Mengunduh..." : "Unduh"}
                  </Button>
                  <a
                    href={item.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Buka File
                  </a>
                </div>

                <div className="mb-4 flex items-center gap-2 border-t border-gray-100 pt-4">
                  <Button variant={item.liked_by_me ? "default" : "outline"} size="sm" disabled={isLikeLoadingId === item.id} onClick={() => void handleToggleLike(item)}>
                    <ThumbsUp size={14} className="mr-2" />
                    {item.like_count}
                  </Button>
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                    <MessageSquare size={14} /> {item.comment_count}
                  </span>
                </div>

                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="max-h-40 space-y-2 overflow-auto pr-1">
                    {item.comments_list.slice(0, 6).map((comment) => (
                      <div key={comment.id} className="rounded-lg bg-gray-50 px-3 py-2">
                        <div className="flex items-start gap-2">
                          <Avatar src={comment.avatar_url} name={comment.commenter_name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-700">
                              {comment.commenter_name} · {comment.commenter_class_name || (comment.commenter_role === "guru" ? "Guru" : "-")}
                            </p>
                            {editingCommentId === comment.id ? (
                              <div className="mt-1 space-y-2">
                                <Input value={editingCommentText} onChange={(event) => setEditingCommentText(event.target.value)} placeholder="Ubah komentar..." />
                                <div className="flex items-center gap-2">
                                  <Button size="sm" disabled={isCommentActionLoadingId === comment.id} onClick={() => void handleUpdateComment(comment)}>
                                    <Check size={13} className="mr-1" />
                                    Simpan
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={cancelEditComment}>
                                    <X size={13} className="mr-1" />
                                    Batal
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="break-words text-sm text-gray-600">{comment.comment_text}</p>
                            )}
                            {comment.commenter_role === "siswa" && comment.commenter_nis === viewerNis && (
                              <div className="mt-2 flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => startEditComment(comment)}>
                                  <Pencil size={12} className="mr-1" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" disabled={isCommentActionLoadingId === comment.id} onClick={() => void handleDeleteComment(comment)}>
                                  <Trash2 size={12} className="mr-1" />
                                  Hapus
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {item.comments_list.length === 0 && <p className="text-xs text-gray-400">Belum ada komentar.</p>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={commentDrafts[item.id] || ""}
                      onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))}
                      placeholder="Tulis komentar..."
                    />
                    <Button size="icon" disabled={isCommentLoadingId === item.id} onClick={() => void handleAddComment(item.id)}>
                      <Send size={15} />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-400">
                  <div>
                    {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                  {item.student_nis === viewerNis && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isDeleteLoadingId === item.id}
                      onClick={() => void handleDeletePortfolio(item)}
                      className="mt-2 text-danger hover:text-danger"
                    >
                      <Trash2 size={13} className="mr-1" />
                      Hapus Karya
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Upload Karya Galeri</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="portfolio-title">Judul Karya</Label>
              <Input id="portfolio-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Contoh: Desain Poster Hari Kartini" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-description">Deskripsi</Label>
              <textarea
                id="portfolio-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ceritakan singkat isi karya, tools, atau tujuan tugasnya"
                className="min-h-[110px] w-full rounded-lg border border-gray-200/50 bg-white/80 px-4 py-3 text-sm font-medium transition-all duration-300 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Cakupan Publikasi</Label>
              <div className="flex gap-2">
                <Button type="button" variant={uploadScope === "class" ? "default" : "outline"} onClick={() => setUploadScope("class")}>
                  <Users size={14} className="mr-2" />
                  Kelas
                </Button>
                <Button type="button" variant={uploadScope === "global" ? "default" : "outline"} onClick={() => setUploadScope("global")}>
                  <Globe size={14} className="mr-2" />
                  Global
                </Button>
              </div>
              <p className="text-xs text-gray-400">Kelas hanya terlihat oleh siswa satu kelas, Global terlihat semua pengguna.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio-file">File Karya</Label>
              <Input id="portfolio-file" type="file" onChange={handleFileChange} />
              <p className="text-xs text-gray-400">Bisa upload semua jenis file. Mendukung HTML5 1 file (HTML+CSS+JS). Maksimal 20MB.</p>
            </div>

            {previewUrl && (
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
                <img src={previewUrl} alt="Preview karya" className="h-56 w-full object-cover" />
              </div>
            )}
            {htmlPreviewDoc && (
              <div className="space-y-2 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-700">Preview HTML5 (single file)</p>
                <iframe
                  title="Preview HTML upload"
                  srcDoc={htmlPreviewDoc}
                  className="h-64 w-full rounded-lg border border-gray-200 bg-white"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-pointer-lock allow-presentation"
                />
              </div>
            )}
            {selectedFile && !previewUrl && !htmlPreviewDoc && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                <p className="font-semibold text-gray-700">{selectedFile.name}</p>
                <p>Ukuran: {formatFileSize(selectedFile.size)}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Batal
            </Button>
            <Button onClick={handleUploadPortfolio} disabled={isUploading} className="bg-primary hover:bg-primary/90">
              {isUploading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Mengupload...
                </>
              ) : (
                <>
                  <Upload size={16} className="mr-2" />
                  Upload Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDetailItem} onOpenChange={(open) => !open && setSelectedDetailItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="break-words text-left text-xl">{selectedDetailItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDetailItem && (
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                <PortfolioFilePreview url={selectedDetailItem.image_url} title={selectedDetailItem.title} />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-700">Deskripsi</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-600">
                {selectedDetailItem?.description || "Tanpa deskripsi"}
              </p>
            </div>
            <a
              href={selectedDetailItem?.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <ExternalLink size={14} className="mr-2" />
              Buka File
            </a>
            {selectedDetailItem && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleDownloadFile(selectedDetailItem)}
                disabled={isDownloadLoadingId === selectedDetailItem.id}
              >
                <Download size={14} className="mr-2" />
                {isDownloadLoadingId === selectedDetailItem.id ? "Mengunduh..." : "Unduh File"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
