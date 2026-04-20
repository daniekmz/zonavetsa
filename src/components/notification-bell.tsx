"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, FileText, QrCode, Upload, ClipboardList, User, Info, Trash2 } from "lucide-react";
import { useNotificationStore } from "@/lib/notifications";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Notification, NotificationType } from "@/types";
import { toast } from "@/components/ui/toast";

const typeIcons: Record<NotificationType, typeof FileText> = {
  attendance: QrCode,
  exam: ClipboardList,
  file: Upload,
  assignment: ClipboardList,
  system: Info,
  profile: User,
  login: User,
};

const priorityColors = {
  high: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
  medium: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
  low: "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-300",
};

const roleLabels: Record<string, string> = {
  guru: "Guru",
  siswa: "Siswa",
  admin: "Admin",
  system: "Sistem",
};

export function NotificationBell({ userKode, userRole }: { userKode: string; userRole: string }) {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications(userKode, userRole);
    
    // Subscribe to real-time notifications
    const supabase = createClient();
    const channel = supabase
      .channel(`user_notifications_${userKode}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_kode=eq.${userKode}`,
        },
        (payload: any) => {
          console.log("New notification received:", payload);
          // If the role also matches
          if (payload.new.user_role === userRole) {
            fetchNotifications(userKode, userRole);
            
            // Play a subtle sound or visual cue if needed
            // (Optional: add notification sound logic here)
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userKode, userRole]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".notification-dropdown")) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  const handleOpen = async () => {
    const nextOpen = !isOpen;
    if (nextOpen) {
      setIsLoading(true);
      await fetchNotifications(userKode, userRole);
      setIsLoading(false);
    }
    setIsOpen(nextOpen);
  };

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id);
    setIsOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userKode, userRole);
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId === id) return;

    setDeletingId(id);
    try {
      await deleteNotification(id);
      toast("Notifikasi berhasil dihapus", "success");
    } catch (error) {
      console.error("Delete notification error:", error);
      toast("Gagal menghapus notifikasi", "error");
    } finally {
      setDeletingId((current) => (current === id ? null : current));
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return date.toLocaleDateString("id-ID");
  };

  return (
    <div className="notification-dropdown relative">
      <button
        onClick={handleOpen}
        className={cn(
          "glass-tech relative rounded-2xl p-2.5 text-slate-600 transition-colors hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900/80"
        )}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-0.5 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 w-80 sm:w-96",
            "glass-panel rounded-[24px]",
            "overflow-hidden z-50"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/60 px-4 py-3 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-white">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-light"
              >
                <CheckCheck size={14} />
                Tandai dibaca
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-slate-500">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memuat...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>Tidak ada notifikasi</p>
              </div>
            ) : (
              notifications.slice(0, 20).map((notification) => {
                const Icon = typeIcons[notification.type] || Info;
                const senderLabel = notification.sender_role
                  ? roleLabels[notification.sender_role] || "Pengirim"
                  : "Pengirim";
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 pr-3 transition-colors",
                      "hover:bg-slate-50/90 dark:hover:bg-slate-900/70",
                      !notification.is_read && "bg-sky-50/80 dark:bg-sky-500/10"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                    >
                      <div
                        className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border", priorityColors[notification.priority])}
                      >
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {notification.sender_name && (
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary dark:text-secondary-light">
                            {senderLabel}: {notification.sender_name}
                          </p>
                        )}
                        <p className={cn("truncate text-sm font-medium", notification.is_read ? "text-slate-600 dark:text-slate-400" : "text-slate-800 dark:text-white")}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                            {notification.message}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-start gap-2 pt-1">
                      {!notification.is_read && (
                        <div className="mt-2 h-2 w-2 rounded-full bg-primary" />
                      )}
                      <button
                        type="button"
                        aria-label="Hapus notifikasi"
                        onClick={(e) => handleDeleteNotification(notification.id, e)}
                        disabled={deletingId === notification.id}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-white/80 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-slate-800"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-200/60 px-4 py-3 dark:border-slate-800">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full text-center text-sm font-semibold text-primary hover:text-primary-light"
              >
                Lihat semua notifikasi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
