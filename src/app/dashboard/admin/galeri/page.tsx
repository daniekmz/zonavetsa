"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, Globe, MessageSquare, Search, ThumbsUp, Trash2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/avatar";
import { toast } from "@/components/ui/toast";
import type { PortfolioItem } from "@/types";

interface PortfolioAdminItem extends PortfolioItem {
  like_count: number;
  comment_count: number;
}

export default function AdminGaleriPage() {
  const [items, setItems] = useState<PortfolioAdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteLoadingId, setIsDeleteLoadingId] = useState<string | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => {
      return (
        item.title.toLowerCase().includes(keyword) ||
        (item.uploader_name || "").toLowerCase().includes(keyword) ||
        (item.uploader_class_name || "").toLowerCase().includes(keyword)
      );
    });
  }, [items, searchTerm]);

  const extractStoragePathFromPublicUrl = (url?: string) => {
    if (!url) return null;
    const marker = "/storage/v1/object/public/files/";
    const markerIndex = url.indexOf(marker);
    if (markerIndex === -1) return null;
    const objectPath = url.slice(markerIndex + marker.length).split("?")[0];
    return objectPath || null;
  };

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data: portfolios, error } = await supabase
      .from("portofolios")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !portfolios) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    const portfolioIds = (portfolios as PortfolioItem[]).map((item) => item.id);
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from("portfolio_likes").select("portfolio_id").in("portfolio_id", portfolioIds),
      supabase.from("portfolio_comments").select("portfolio_id").in("portfolio_id", portfolioIds),
    ]);

    const likeMap = new Map<string, number>();
    const commentMap = new Map<string, number>();

    (likesRes.data || []).forEach((row: { portfolio_id: string }) => {
      likeMap.set(row.portfolio_id, (likeMap.get(row.portfolio_id) || 0) + 1);
    });

    (commentsRes.data || []).forEach((row: { portfolio_id: string }) => {
      commentMap.set(row.portfolio_id, (commentMap.get(row.portfolio_id) || 0) + 1);
    });

    const mapped = (portfolios as PortfolioItem[]).map((item) => ({
      ...item,
      like_count: likeMap.get(item.id) || 0,
      comment_count: commentMap.get(item.id) || 0,
    }));

    setItems(mapped);
    setIsLoading(false);
  };

  const handleDelete = async (item: PortfolioAdminItem) => {
    if (!confirm(`Hapus karya "${item.title}"?`)) return;

    const supabase = createClient();
    setIsDeleteLoadingId(item.id);

    try {
      const storagePath = extractStoragePathFromPublicUrl(item.image_url);
      if (storagePath) {
        await supabase.storage.from("files").remove([storagePath]);
      }

      const { error } = await supabase.from("portofolios").delete().eq("id", item.id);
      if (error) throw error;

      toast("Karya berhasil dihapus", "success");
      await loadData();
    } catch (error) {
      console.error("Delete gallery item failed:", error);
      toast("Gagal menghapus karya", "error");
    } finally {
      setIsDeleteLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Briefcase size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-primary">Monitoring Galeri Karya</h2>
            <p className="text-gray-500">Admin dapat memantau dan mengelola seluruh karya publik siswa.</p>
          </div>
        </div>

        <div className="mt-5 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari judul karya, nama uploader, atau kelas..."
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl bg-white p-8 text-center">Memuat data galeri...</div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 text-center text-gray-500">
          Belum ada karya galeri.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredItems.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="relative h-52 overflow-hidden bg-gray-100">
                <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
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
                  <Avatar src={null} name={item.uploader_name || item.student_nis} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-800">{item.uploader_name || item.student_nis}</p>
                    <p className="text-xs text-gray-500">{item.uploader_class_name || "-"}</p>
                  </div>
                </div>

                <div>
                  <h3 className="line-clamp-1 text-lg font-bold text-primary">{item.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-gray-500">{item.description || "Tanpa deskripsi"}</p>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-3 text-gray-500">
                    <span className="flex items-center gap-1 text-xs font-medium">
                      <ThumbsUp size={14} /> {item.like_count}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium">
                      <MessageSquare size={14} /> {item.comment_count}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDeleteLoadingId === item.id}
                    onClick={() => void handleDelete(item)}
                    className="text-danger hover:text-danger"
                  >
                    <Trash2 size={14} className="mr-1" />
                    Hapus
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

