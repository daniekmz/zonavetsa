"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ExternalLink,
  Copy,
  Download,
  FileImage,
  FileText,
  MessageSquare,
  Search,
  ThumbsUp,
  Send,
  Globe,
  Users,
  Trash2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/avatar";
import { PortfolioFilePreview, getFileNameFromUrl, getPortfolioFileKind } from "@/components/portfolio-file-preview";
import { toast } from "@/components/ui/toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildPortfolioPublicUrl, getPortfolioPrimaryUrl, isHtmlPortfolioFile } from "@/lib/portfolio-links";
import type {
  Class,
  PortfolioComment,
  PortfolioItem,
  PortfolioLike,
  Teacher,
} from "@/types";

interface PortfolioWithStudent extends PortfolioItem {
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  uploader_avatar?: string | null;
  comments_list: (PortfolioComment & { avatar_url?: string | null })[];
}

export default function GuruPortofolioPage() {
  const [items, setItems] = useState<PortfolioWithStudent[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [scopeFilter, setScopeFilter] = useState<"all" | "class" | "global">("all");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [isLikeLoadingId, setIsLikeLoadingId] = useState<string | null>(null);
  const [isCommentLoadingId, setIsCommentLoadingId] = useState<string | null>(null);
  const [isDeleteLoadingId, setIsDeleteLoadingId] = useState<string | null>(null);
  const [isDownloadLoadingId, setIsDownloadLoadingId] = useState<string | null>(null);
  const [isCommentActionLoadingId, setIsCommentActionLoadingId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [teacherKode, setTeacherKode] = useState<string | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<PortfolioWithStudent | null>(null);

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

  useEffect(() => {
    void loadPortfolios();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.uploader_name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = classFilter === "all" || item.uploader_class_id === classFilter;
      const matchesScope = scopeFilter === "all" || item.visibility_scope === scopeFilter;
      return matchesSearch && matchesClass && matchesScope;
    });
  }, [classFilter, items, scopeFilter, searchTerm]);

  const extractStoragePathFromPublicUrl = (url?: string) => {
    if (!url) return null;
    const marker = "/storage/v1/object/public/files/";
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return null;
    const objectPath = url.slice(markerIndex + marker.length).split("?")[0];
    return objectPath || null;
  };

  const loadPortfolios = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [{ data: classesData }, { data: portfolioData, error: portfolioError }] = await Promise.all([
      supabase.from("classes").select("*").order("name"),
      supabase.from("portofolios").select("*").order("created_at", { ascending: false }),
    ]);

    const allClasses = (classesData || []) as Class[];
    const classMap = new Map(allClasses.map((cls) => [cls.id, cls.name]));
    setClasses(allClasses);

    if (portfolioError || !portfolioData) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const allItems = portfolioData as PortfolioItem[];
    const portfolioIds = allItems.map((item) => item.id);

    let likesData: PortfolioLike[] = [];
    let commentsData: PortfolioComment[] = [];

    if (portfolioIds.length > 0) {
      const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
        supabase.from("portfolio_likes").select("*").in("portfolio_id", portfolioIds),
        supabase
          .from("portfolio_comments")
          .select("*")
          .in("portfolio_id", portfolioIds)
          .order("created_at", { ascending: false }),
      ]);

      likesData = (likeRows || []) as PortfolioLike[];
      commentsData = (commentRows || []) as PortfolioComment[];
    }

    const sessionData = sessionStorage.getItem("guruSession");
    const teacher = sessionData ? (JSON.parse(sessionData) as Teacher) : null;
    setTeacherKode(teacher?.kode_guru || null);

    const relatedStudentNis = new Set<string>();
    const relatedTeacherKode = new Set<string>();

    allItems.forEach((item) => {
      relatedStudentNis.add(item.student_nis);
    });

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
        {
          name: student.name,
          avatar_url: normalizeAvatarUrl(supabase, student.avatar_url),
        },
      ])
    );

    const teacherMap = new Map(
      ((teacherRows || []) as { kode_guru: string; name: string; avatar_url?: string | null }[]).map((teacher) => [
        teacher.kode_guru,
        {
          name: teacher.name,
          avatar_url: normalizeAvatarUrl(supabase, teacher.avatar_url),
        },
      ])
    );

    const likesByPortfolio = new Map<string, PortfolioLike[]>();
    likesData.forEach((like) => {
      const existing = likesByPortfolio.get(like.portfolio_id) || [];
      existing.push(like);
      likesByPortfolio.set(like.portfolio_id, existing);
    });

    const commentsByPortfolio = new Map<string, PortfolioComment[]>();
    commentsData.forEach((comment) => {
      const existing = commentsByPortfolio.get(comment.portfolio_id) || [];
      existing.push(comment);
      commentsByPortfolio.set(comment.portfolio_id, existing);
    });

    const mappedItems = allItems.map((item) => {
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
          const teacherData = teacherMap.get(comment.commenter_kode);
          return {
            ...comment,
            commenter_name: teacherData?.name || comment.commenter_name,
            avatar_url: teacherData?.avatar_url || null,
          };
        }
        return {
          ...comment,
          avatar_url: null,
        };
      });
      const likedByMe = !!teacher && likes.some((like) => like.liker_role === "guru" && like.liker_kode === teacher.kode_guru);
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
        liked_by_me: likedByMe,
        comments_list: comments,
      };
    });

    setItems(mappedItems);
    setIsLoading(false);
  };

  const handleCopyPublicLink = async (item: PortfolioWithStudent) => {
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

  const handleToggleLike = async (item: PortfolioWithStudent) => {
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) {
      toast("Sesi guru tidak ditemukan", "error");
      return;
    }

    const teacher: Teacher = JSON.parse(sessionData);
    const supabase = createClient();
    setIsLikeLoadingId(item.id);

    try {
      if (item.liked_by_me) {
        const { error } = await supabase
          .from("portfolio_likes")
          .delete()
          .eq("portfolio_id", item.id)
          .eq("liker_role", "guru")
          .eq("liker_kode", teacher.kode_guru);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("portfolio_likes").insert({
          portfolio_id: item.id,
          liker_role: "guru",
          liker_kode: teacher.kode_guru,
          liker_name: teacher.name,
          liker_class_name: "Guru",
        });

        if (error) throw error;
      }

      await loadPortfolios();
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

    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) {
      toast("Sesi guru tidak ditemukan", "error");
      return;
    }

    const teacher: Teacher = JSON.parse(sessionData);
    const supabase = createClient();

    setIsCommentLoadingId(itemId);

    try {
      const { error } = await supabase.from("portfolio_comments").insert({
        portfolio_id: itemId,
        commenter_role: "guru",
        commenter_kode: teacher.kode_guru,
        commenter_name: teacher.name,
        commenter_class_name: "Guru",
        comment_text: text,
      });

      if (error) throw error;

      setCommentDrafts((prev) => ({ ...prev, [itemId]: "" }));
      await loadPortfolios();
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
    const text = editingCommentText.trim();
    if (!text) {
      toast("Komentar tidak boleh kosong", "error");
      return;
    }

    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) {
      toast("Sesi guru tidak ditemukan", "error");
      return;
    }

    const teacher: Teacher = JSON.parse(sessionData);
    const supabase = createClient();
    setIsCommentActionLoadingId(comment.id);

    try {
      const { error } = await supabase
        .from("portfolio_comments")
        .update({ comment_text: text })
        .eq("id", comment.id)
        .eq("commenter_role", "guru")
        .eq("commenter_kode", teacher.kode_guru);
      if (error) throw error;

      cancelEditComment();
      toast("Komentar berhasil diperbarui", "success");
      await loadPortfolios();
    } catch (error) {
      console.error("Update comment failed:", error);
      toast("Gagal mengubah komentar", "error");
    } finally {
      setIsCommentActionLoadingId(null);
    }
  };

  const handleDeleteComment = async (comment: PortfolioComment) => {
    if (!confirm("Hapus komentar ini?")) return;

    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) {
      toast("Sesi guru tidak ditemukan", "error");
      return;
    }

    const teacher: Teacher = JSON.parse(sessionData);
    const supabase = createClient();
    setIsCommentActionLoadingId(comment.id);

    try {
      const { error } = await supabase
        .from("portfolio_comments")
        .delete()
        .eq("id", comment.id)
        .eq("commenter_role", "guru")
        .eq("commenter_kode", teacher.kode_guru);
      if (error) throw error;

      if (editingCommentId === comment.id) cancelEditComment();
      toast("Komentar berhasil dihapus", "success");
      await loadPortfolios();
    } catch (error) {
      console.error("Delete comment failed:", error);
      toast("Gagal menghapus komentar", "error");
    } finally {
      setIsCommentActionLoadingId(null);
    }
  };

  const handleDeletePortfolio = async (item: PortfolioWithStudent) => {
    if (!confirm(`Hapus karya "${item.title}" dari galeri?`)) return;

    const supabase = createClient();
    setIsDeleteLoadingId(item.id);

    try {
      const storagePath = extractStoragePathFromPublicUrl(item.image_url);
      if (storagePath) {
        const { error: storageError } = await supabase.storage.from("files").remove([storagePath]);
        if (storageError) {
          console.error("Delete image from storage failed:", storageError);
        }
      }

      const { error } = await supabase.from("portofolios").delete().eq("id", item.id);
      if (error) throw error;

      toast("Karya berhasil dihapus", "success");
      await loadPortfolios();
    } catch (error) {
      console.error("Delete portfolio failed:", error);
      toast("Gagal menghapus karya", "error");
    } finally {
      setIsDeleteLoadingId(null);
    }
  };

  const handleDownloadFile = async (item: PortfolioWithStudent) => {
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

  return (
    <div className="space-y-4">
      <div className="mx-auto max-w-2xl lg:max-w-none">
        <div className="rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary shrink-0">
              <Briefcase size={24} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-primary">Galeri Karya Siswa</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">Pantau karya publik siswa, termasuk interaksi like dan komentar.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_140px]">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari judul atau nama siswa..."
                className="pl-10"
              />
            </div>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Semua kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua kelas</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as "all" | "class" | "global")}>
              <SelectTrigger>
                <SelectValue placeholder="Semua" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="class">Kelas</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="mx-auto max-w-2xl lg:max-w-none grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-sm animate-pulse">
              <div className="flex items-center gap-3 p-4 pb-2">
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-700"></div>
                  <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-slate-700"></div>
                </div>
              </div>
              <div className="h-56 bg-gray-200 dark:bg-slate-700 mx-4 rounded-xl"></div>
              <div className="space-y-3 p-4">
                <div className="h-5 w-2/3 rounded bg-gray-200 dark:bg-slate-700"></div>
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-slate-700"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mx-auto max-w-2xl lg:max-w-none rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-20 text-center">
          <FileImage size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Belum Ada Upload Karya</h3>
          <p className="mx-auto mt-2 max-w-md text-slate-500 dark:text-slate-400">Karya siswa akan muncul di sini saat sudah dipublikasikan.</p>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl lg:max-w-none grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              {/* Post Header - Avatar + Name + Date + Scope badge */}
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

              {/* Post Body - Title + Description */}
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

              {/* Action Buttons Row - Like + Comment + Links */}
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
                    onClick={() => document.getElementById(`comment-input-guru-${item.id}`)?.focus()}
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
                  <button
                    type="button"
                    disabled={isDeleteLoadingId === item.id}
                    onClick={() => void handleDeletePortfolio(item)}
                    className="flex items-center justify-center rounded-lg p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px] min-w-[44px]"
                    title="Hapus Karya"
                  >
                    <Trash2 size={18} />
                  </button>
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
                        {comment.commenter_role === "guru" && comment.commenter_kode === teacherKode && editingCommentId !== comment.id && (
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
                <Avatar name="G" size="sm" />
                <div className="relative flex-1">
                  <input
                    id={`comment-input-guru-${item.id}`}
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
      )}

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

