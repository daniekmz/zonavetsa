"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Briefcase,
  FileImage,
  FileText,
  ExternalLink,
  Copy,
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
import {
  buildPortfolioPublicUrl,
  getPortfolioPrimaryUrl,
  isHtmlPortfolioFile,
  slugifyPortfolioSegment,
} from "@/lib/portfolio-links";
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

  const buildUniqueHtmlSlug = async (
    supabase: ReturnType<typeof createClient>,
    uploaderName: string,
    fallbackCode: string
  ) => {
    const baseSlug = slugifyPortfolioSegment(uploaderName) || `siswa-${fallbackCode}`;
    const { data, error } = await supabase
      .from("portofolios")
      .select("public_slug")
      .ilike("public_slug", `${baseSlug}%`);

    if (error) throw error;

    const existingSlugs = new Set(
      ((data || []) as { public_slug?: string | null }[])
        .map((item) => item.public_slug || "")
        .filter(Boolean)
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let counter = 2;
    let candidate = `${baseSlug}_${counter}`;
    while (existingSlugs.has(candidate)) {
      counter += 1;
      candidate = `${baseSlug}_${counter}`;
    }

    return candidate;
  };

  const handleCopyPublicLink = async (item: PortfolioFeedItem) => {
    if (!item.public_slug) {
      toast("Link publik belum tersedia untuk karya ini", "error");
      return;
    }

    try {
      const publicUrl = buildPortfolioPublicUrl(item.public_slug);
      if (!publicUrl) throw new Error("Public URL unavailable");
      await navigator.clipboard.writeText(publicUrl);
      toast("Link karya berhasil disalin", "success");
    } catch (error) {
      console.error("Copy public link failed:", error);
      toast("Gagal menyalin link karya", "error");
    }
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
      const extension = (selectedFile.name.split(".").pop() || "file").toLowerCase();
      const loweredName = selectedFile.name.toLowerCase();
      const isHtmlFile = selectedFile.type === "text/html" || loweredName.endsWith(".html") || loweredName.endsWith(".htm");
      const publicSlug = isHtmlFile ? await buildUniqueHtmlSlug(supabase, student.name, student.nis) : null;
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
      const { data: insertedPortfolio, error: insertError } = await supabase
        .from("portofolios")
        .insert({
          student_nis: student.nis,
          title: title.trim(),
          description: description.trim(),
          image_url: publicUrlData.publicUrl,
          public_slug: publicSlug,
          visibility_scope: uploadScope,
          uploader_name: student.name,
          uploader_class_id: student.last_class_id || student.class_id || null,
          uploader_class_name: viewerClassName,
          likes: 0,
          comments: 0,
        })
        .select("id, public_slug")
        .single();
      if (insertError) throw insertError;

      await notifyPortfolioUpload(student.last_teacher_kode, student.nis, student.name, title.trim());
      if (isHtmlFile && insertedPortfolio?.public_slug) {
        const publicUrl = buildPortfolioPublicUrl(insertedPortfolio.public_slug);
        if (publicUrl) {
          try {
            await navigator.clipboard.writeText(publicUrl);
            toast("Karya HTML berhasil diupload. Link publik langsung disalin.", "success");
          } catch (error) {
            console.error("Auto copy public link failed:", error);
            toast("Karya HTML berhasil diupload", "success");
          }
        } else {
          toast("Karya HTML berhasil diupload", "success");
        }
      } else {
        toast("Karya berhasil diupload", "success");
      }
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
    <div className="space-y-4">
      <div className="mx-auto max-w-2xl lg:max-w-none">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">Galeri Karya</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Upload karya kamu, lalu tampilkan ke kelas atau seluruh pengguna.</p>
            </div>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary/90">
            <Plus size={18} />
            Upload Karya Baru
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl lg:max-w-none">
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
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
      </div>

      {isLoading ? (
        <div className="mx-auto max-w-2xl lg:max-w-none grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm animate-pulse">
              <div className="flex items-center gap-3 p-4 pb-2">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
                  <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-slate-700" />
                </div>
              </div>
              <div className="h-56 bg-gray-200 dark:bg-slate-700 mx-4 rounded-xl" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-2/3 rounded bg-gray-200 dark:bg-slate-700" />
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mx-auto max-w-2xl lg:max-w-none rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-20 text-center">
          <FileImage size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">Belum Ada Karya</h3>
          <p className="mx-auto mt-2 max-w-sm text-slate-500 dark:text-slate-400">Upload sertifikat, hasil projek, atau dokumentasi tugas agar bisa dilihat publik.</p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-6 bg-primary hover:bg-primary/90">
            <Upload size={16} className="mr-2" />
            Mulai Upload
          </Button>
        </div>
      ) : (
        <>
          <div className="mx-auto max-w-2xl lg:max-w-none grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-shadow duration-200 hover:shadow-md">
                {/* Post Header */}
                <div className="flex items-center gap-3 px-4 pt-4 pb-2 sm:px-5">
                  <Avatar src={item.uploader_avatar} name={item.uploader_name || item.student_nis} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{item.uploader_name || item.student_nis}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{item.uploader_class_name || "-"}</span>
                      <span>·</span>
                      <span>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 shrink-0">
                    {item.visibility_scope === "global" ? <><Globe size={11} /> Global</> : <><Users size={11} /> Kelas</>}
                  </span>
                </div>

                {/* Post Body */}
                <div className="px-4 pb-3 sm:px-5">
                  <h3 className="break-words text-[15px] font-bold text-slate-800 dark:text-slate-100 sm:text-base">{item.title}</h3>
                  <p className="mt-1 break-words text-sm leading-relaxed text-slate-500 dark:text-slate-400 line-clamp-3">{item.description || "Tanpa deskripsi"}</p>
                </div>

                {/* Media Preview */}
                <div className="relative mx-4 mb-3 overflow-hidden rounded-xl bg-gray-100 dark:bg-slate-800 sm:mx-5 cursor-pointer" onClick={() => setSelectedDetailItem(item)}>
                  {getPortfolioFileKind(item.image_url) === "image" ? (
                    <img src={item.image_url} alt={item.title} className="w-full max-h-[400px] object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                      <FileText size={40} className="text-primary" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {getPortfolioFileKind(item.image_url) === "html" ? "Preview HTML5 tersedia" : "File non-gambar"}
                      </p>
                      <span className="text-xs text-primary font-medium">Klik untuk lihat detail</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-slate-800 px-2 sm:px-3">
                  <div className="flex items-center">
                    <button
                      type="button"
                      disabled={isLikeLoadingId === item.id}
                      onClick={() => void handleToggleLike(item)}
                      className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[48px] ${
                        item.liked_by_me
                          ? "text-primary font-bold"
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <ThumbsUp size={18} className={item.liked_by_me ? "fill-primary" : ""} />
                      <span>{item.like_count > 0 ? item.like_count : "Suka"}</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[48px]"
                      onClick={() => document.getElementById(`comment-input-siswa-${item.id}`)?.focus()}
                    >
                      <MessageSquare size={18} />
                      <span>{item.comment_count > 0 ? item.comment_count : "Komentar"}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <a
                      href={getPortfolioPrimaryUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-lg p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px]"
                      title={isHtmlPortfolioFile(item.image_url) && item.public_slug ? "Buka Link" : "Buka File"}
                    >
                      <ExternalLink size={18} />
                    </a>
                    {isHtmlPortfolioFile(item.image_url) && item.public_slug && (
                      <button type="button" onClick={() => void handleCopyPublicLink(item)} className="flex items-center justify-center rounded-lg p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px]" title="Copy Link">
                        <Copy size={18} />
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isDownloadLoadingId === item.id}
                      onClick={() => void handleDownloadFile(item)}
                      className="flex items-center justify-center rounded-lg p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px]"
                      title="Unduh File"
                    >
                      <Download size={18} />
                    </button>
                    {item.student_nis === viewerNis && (
                      <button
                        type="button"
                        disabled={isDeleteLoadingId === item.id}
                        onClick={() => void handleDeletePortfolio(item)}
                        className="flex items-center justify-center rounded-lg p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] min-w-[44px]"
                        title="Hapus Karya"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                {item.comments_list.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-3 sm:px-5 space-y-3">
                    {item.comments_list.slice(0, 4).map((comment) => (
                      <div key={comment.id} className="flex items-start gap-2.5">
                        <Avatar src={comment.avatar_url} name={comment.commenter_name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="rounded-2xl bg-gray-50 dark:bg-slate-800 px-3.5 py-2.5">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {comment.commenter_name}
                              <span className="ml-1.5 font-normal text-slate-400">{comment.commenter_class_name || (comment.commenter_role === "guru" ? "Guru" : "")}</span>
                            </p>
                            {editingCommentId === comment.id ? (
                              <div className="mt-1.5 space-y-2">
                                <Input value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)} placeholder="Ubah komentar..." className="text-sm" />
                                <div className="flex items-center gap-2">
                                  <button type="button" disabled={isCommentActionLoadingId === comment.id} onClick={() => void handleUpdateComment(comment)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 min-h-[36px]">Simpan</button>
                                  <button type="button" onClick={cancelEditComment} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 min-h-[36px]">Batal</button>
                                </div>
                              </div>
                            ) : (
                              <p className="break-words text-sm text-slate-600 dark:text-slate-300 mt-0.5">{comment.comment_text}</p>
                            )}
                          </div>
                          {comment.commenter_role === "siswa" && comment.commenter_nis === viewerNis && editingCommentId !== comment.id && (
                            <div className="mt-1 flex items-center gap-3 pl-3">
                              <button type="button" onClick={() => startEditComment(comment)} className="text-xs font-medium text-slate-400 hover:text-primary transition-colors min-h-[32px]">Edit</button>
                              <button type="button" disabled={isCommentActionLoadingId === comment.id} onClick={() => void handleDeleteComment(comment)} className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors min-h-[32px]">Hapus</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {item.comments_list.length > 4 && (
                      <button type="button" onClick={() => setSelectedDetailItem(item)} className="text-xs font-medium text-primary hover:underline pl-10 min-h-[32px]">
                        Lihat semua {item.comments_list.length} komentar
                      </button>
                    )}
                  </div>
                )}

                {/* Comment Input */}
                <div className="flex items-center gap-2 border-t border-gray-100 dark:border-slate-800 px-4 py-3 sm:px-5">
                  <Avatar name="S" size="sm" />
                  <div className="relative flex-1">
                    <input
                      id={`comment-input-siswa-${item.id}`}
                      value={commentDrafts[item.id] || ""}
                      onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleAddComment(item.id); } }}
                      placeholder="Tambahkan komentar..."
                      className="w-full rounded-full border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 pr-12 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all min-h-[44px]"
                    />
                    {(commentDrafts[item.id] || "").trim() && (
                      <button
                        type="button"
                        disabled={isCommentLoadingId === item.id}
                        onClick={() => void handleAddComment(item.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full bg-primary p-1.5 text-white hover:bg-primary/90 transition-colors min-h-[32px] min-w-[32px]"
                      >
                        <Send size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Floating Action Button for mobile upload */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95 sm:hidden"
            aria-label="Upload Karya Baru"
          >
            <Plus size={24} />
          </button>
        </>
      )}

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-xl overflow-hidden p-0 sm:max-h-[88vh] max-h-[92dvh]">
          <div className="flex max-h-[92dvh] flex-col sm:max-h-[88vh]">
            <DialogHeader className="border-b border-gray-100 dark:border-slate-800 px-5 pb-4 pt-5 sm:px-6">
              <DialogTitle>Upload Karya Galeri</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
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
                    className="min-h-[110px] w-full rounded-lg border border-gray-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 px-4 py-3 text-sm font-medium transition-all duration-300 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cakupan Publikasi</Label>
                  <div className="flex flex-wrap gap-2">
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
                  {selectedFile && (selectedFile.name.toLowerCase().endsWith(".html") || selectedFile.name.toLowerCase().endsWith(".htm")) ? (
                    <p className="text-xs text-blue-600">File HTML akan mendapat link publik langsung yang bisa dibuka dan di-copy setelah upload.</p>
                  ) : null}
                </div>

                {previewUrl && (
                  <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800">
                    <img src={previewUrl} alt="Preview karya" className="h-56 w-full object-cover" />
                  </div>
                )}
                {htmlPreviewDoc && (
                  <div className="space-y-2 overflow-hidden rounded-2xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-medium text-blue-700">Preview HTML5 (single file)</p>
                    <iframe
                      title="Preview HTML upload"
                      srcDoc={htmlPreviewDoc}
                      className="h-64 w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-pointer-lock allow-presentation"
                    />
                  </div>
                )}
                {selectedFile && !previewUrl && !htmlPreviewDoc && (
                  <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    <p className="font-semibold text-slate-700 dark:text-slate-200">{selectedFile.name}</p>
                    <p>Ukuran: {formatFileSize(selectedFile.size)}</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-4 sm:px-6">
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
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedDetailItem} onOpenChange={(open) => !open && setSelectedDetailItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="break-words text-left text-xl">{selectedDetailItem?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDetailItem && (
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800">
                <PortfolioFilePreview url={selectedDetailItem.image_url} title={selectedDetailItem.title} />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Deskripsi</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {selectedDetailItem?.description || "Tanpa deskripsi"}
              </p>
            </div>
            <a
              href={selectedDetailItem ? getPortfolioPrimaryUrl(selectedDetailItem) : "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <ExternalLink size={14} className="mr-2" />
              {selectedDetailItem && isHtmlPortfolioFile(selectedDetailItem.image_url) && selectedDetailItem.public_slug ? "Buka Link Publik" : "Buka File"}
            </a>
            {selectedDetailItem && isHtmlPortfolioFile(selectedDetailItem.image_url) && selectedDetailItem.public_slug ? (
              <Button type="button" variant="outline" onClick={() => void handleCopyPublicLink(selectedDetailItem)}>
                <Copy size={14} className="mr-2" />
                Copy Link
              </Button>
            ) : null}
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
