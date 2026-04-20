"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ExternalLink,
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <Briefcase size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-primary">Galeri Karya Siswa</h2>
              <p className="text-gray-500">Pantau karya publik siswa, termasuk interaksi like dan komentar.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cari judul karya atau nama siswa..."
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
              <SelectValue placeholder="Semua publikasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="class">Kelas</SelectItem>
              <SelectItem value="global">Global</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="overflow-hidden rounded-2xl bg-white shadow-sm animate-pulse">
              <div className="h-52 bg-gray-200"></div>
              <div className="space-y-3 p-5">
                <div className="h-5 w-2/3 rounded bg-gray-200"></div>
                <div className="h-4 w-1/2 rounded bg-gray-200"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-20 text-center">
          <FileImage size={48} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700">Belum Ada Upload Karya</h3>
          <p className="mx-auto mt-2 max-w-md text-gray-500">Karya siswa akan muncul di sini saat sudah dipublikasikan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:shadow-lg"
            >
              <div className="relative h-52 overflow-hidden bg-gray-100">
                {getPortfolioFileKind(item.image_url) === "image" ? (
                  <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
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

              <div className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <Avatar src={item.uploader_avatar} name={item.uploader_name || item.student_nis} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-800">{item.uploader_name || item.student_nis}</p>
                    <p className="text-xs text-gray-500">{item.uploader_class_name || "-"}</p>
                  </div>
                </div>

                <div>
                  <h3 className="break-words text-base font-bold text-primary sm:text-lg">{item.title}</h3>
                  <p className="mt-1 break-words text-sm leading-relaxed text-gray-500">{item.description || "Tanpa deskripsi"}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setSelectedDetailItem(item)}>
                    Lihat Detail
                  </Button>
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
                  <Button
                    variant={item.liked_by_me ? "default" : "outline"}
                    size="sm"
                    disabled={isLikeLoadingId === item.id}
                    onClick={() => void handleToggleLike(item)}
                  >
                    <ThumbsUp size={14} className="mr-2" />
                    {item.like_count}
                  </Button>
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-500">
                    <MessageSquare size={14} /> {item.comment_count}
                  </span>
                </div>

                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="max-h-36 space-y-2 overflow-auto pr-1">
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
                                <Input
                                  value={editingCommentText}
                                  onChange={(event) => setEditingCommentText(event.target.value)}
                                  placeholder="Ubah komentar..."
                                />
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    disabled={isCommentActionLoadingId === comment.id}
                                    onClick={() => void handleUpdateComment(comment)}
                                  >
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
                            {comment.commenter_role === "guru" && comment.commenter_kode === teacherKode && (
                              <div className="mt-2 flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => startEditComment(comment)}>
                                  <Pencil size={12} className="mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isCommentActionLoadingId === comment.id}
                                  onClick={() => void handleDeleteComment(comment)}
                                >
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
                      onChange={(event) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      placeholder="Tulis komentar..."
                    />
                    <Button
                      size="icon"
                      disabled={isCommentLoadingId === item.id}
                      onClick={() => void handleAddComment(item.id)}
                    >
                      <Send size={15} />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="text-xs text-gray-400">
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isDownloadLoadingId === item.id}
                      onClick={() => void handleDownloadFile(item)}
                    >
                      <Download size={14} className="mr-1" />
                      {isDownloadLoadingId === item.id ? "Mengunduh..." : "Unduh"}
                    </Button>
                    <a
                      href={item.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center rounded-lg bg-secondary/10 px-3 py-2 text-xs font-semibold text-secondary transition hover:bg-secondary hover:text-white"
                    >
                      <ExternalLink size={14} className="mr-2" />
                      Buka File
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isDeleteLoadingId === item.id}
                      onClick={() => void handleDeletePortfolio(item)}
                      className="text-danger hover:text-danger"
                    >
                      <Trash2 size={14} className="mr-1" />
                      Hapus
                    </Button>
                  </div>
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

