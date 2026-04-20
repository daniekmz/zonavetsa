"use client";

import { create } from "zustand";
import { createClient } from "@/lib/supabase";
import type { Notification } from "@/types";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: (userKode: string, userRole: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: (userKode: string, userRole: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  createNotification: (
    data: Omit<Notification, "id" | "created_at" | "is_read">
  ) => Promise<void>;
  sendToMultiple: (
    userKodes: string[],
    userRole: string,
    data: Omit<
      Notification,
      "id" | "created_at" | "is_read" | "user_kode" | "user_role"
    >
  ) => Promise<void>;
}

function getRoleLabel(role?: string) {
  if (role === "guru") return "Guru";
  if (role === "siswa") return "Siswa";
  if (role === "admin") return "Admin";
  return "Sistem";
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (userKode: string, userRole: string) => {
    set({ isLoading: true });
    const supabase = createClient();

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_kode", userKode)
      .eq("user_role", userRole)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      const unread = data.filter((item: Notification) => !item.is_read).length;
      set({ notifications: data, unreadCount: unread });
    }
    set({ isLoading: false });
  },

  markAsRead: async (id: string) => {
    const supabase = createClient();
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);

    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.id === id ? { ...item, is_read: true } : item
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: async (userKode: string, userRole: string) => {
    const supabase = createClient();
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_kode", userKode)
      .eq("user_role", userRole)
      .eq("is_read", false);

    set((state) => ({
      notifications: state.notifications.map((item) => ({
        ...item,
        is_read: true,
      })),
      unreadCount: 0,
    }));
  },

  deleteNotification: async (id: string) => {
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);

    set((state) => {
      const removed = state.notifications.find((item) => item.id === id);
      const nextNotifications = state.notifications.filter((item) => item.id !== id);
      const unreadDelta = removed && !removed.is_read ? 1 : 0;

      return {
        notifications: nextNotifications,
        unreadCount: Math.max(0, state.unreadCount - unreadDelta),
      };
    });
  },

  createNotification: async (data) => {
    const supabase = createClient();
    await supabase.from("notifications").insert(data);
  },

  sendToMultiple: async (userKodes, userRole, data) => {
    const supabase = createClient();
    const notifications = userKodes.map((kode) => ({
      ...data,
      user_kode: kode,
      user_role: userRole,
    }));
    await supabase.from("notifications").insert(notifications);
  },
}));

export async function notifyAttendance(
  studentNis: string,
  studentName: string,
  status: "success" | "failed" | "already",
  teacherKode: string,
  teacherName: string,
  className?: string,
  notifyTeacher = false
) {
  const store = useNotificationStore.getState();

  if (status === "success") {
    await store.createNotification({
      user_kode: studentNis,
      user_role: "siswa",
      sender_kode: teacherKode,
      sender_role: "guru",
      sender_name: teacherName,
      type: "attendance",
      priority: "high",
      title: "Absensi Berhasil",
      message: `Kehadiran Anda berhasil dicatat oleh ${teacherName}${className ? ` untuk kelas ${className}` : ""}.`,
      link: "/dashboard/siswa/absensi",
    });

    if (notifyTeacher && teacherKode) {
      await store.createNotification({
        user_kode: teacherKode,
        user_role: "guru",
        sender_kode: studentNis,
        sender_role: "siswa",
        sender_name: studentName,
        type: "attendance",
        priority: "medium",
        title: "Siswa Check-in",
        message: `${studentName} berhasil melakukan absensi${className ? ` pada kelas ${className}` : ""}.`,
        link: "/dashboard/guru/qr-absen",
      });
    }
  } else if (status === "failed") {
    await store.createNotification({
      user_kode: studentNis,
      user_role: "siswa",
      sender_kode: teacherKode,
      sender_role: "guru",
      sender_name: teacherName,
      type: "attendance",
      priority: "high",
      title: "Absensi Gagal",
      message: `Absensi dari ${teacherName} tidak dapat diproses karena QR Code tidak valid atau sudah kedaluwarsa.`,
      link: "/dashboard/siswa/absensi",
    });
  }
}

export async function notifyNewAttendanceSession(
  classId: string,
  className: string,
  teacherKode: string,
  teacherName: string,
  sessionCode: string
) {
  const supabase = createClient();
  const store = useNotificationStore.getState();

  const { data: students } = await supabase
    .from("students")
    .select("nis")
    .eq("class_id", classId);

  if (students && students.length > 0) {
    const nisList = students.map((student: { nis: string }) => student.nis);
    await store.sendToMultiple(nisList, "siswa", {
      sender_kode: teacherKode,
      sender_role: "guru",
      sender_name: teacherName,
      type: "attendance",
      priority: "high",
      title: "Absensi Dimulai",
      message: `${teacherName} membuka sesi absensi untuk kelas ${className}. Tunjukkan QR siswa Anda ke guru untuk discan.${sessionCode ? ` Kode sesi: ${sessionCode}.` : ""}`,
      link: "/dashboard/siswa/absensi",
    });
  }
}

export async function notifyExam(
  action: "published" | "started" | "ended" | "graded",
  examTitle: string,
  studentNisList: string[],
  teacherKode: string,
  teacherName: string,
  className?: string
) {
  const store = useNotificationStore.getState();
  const messages: Record<string, { title: string; message: string }> = {
    published: {
      title: "Ujian Baru Tersedia",
      message: `${teacherName} membagikan ujian "${examTitle}".`,
    },
    started: {
      title: "Ujian Dimulai",
      message: `${teacherName} memulai ujian "${examTitle}".`,
    },
    ended: {
      title: "Ujian Berakhir",
      message: `Waktu pengerjaan ujian "${examTitle}" telah berakhir.`,
    },
    graded: {
      title: "Nilai Ujian Diumumkan",
      message: `${teacherName} telah mempublikasikan nilai ujian "${examTitle}".`,
    },
  };

  const data = messages[action];
  await store.sendToMultiple(studentNisList, "siswa", {
    sender_kode: teacherKode,
    sender_role: "guru",
    sender_name: teacherName,
    type: "exam",
    priority: action === "published" ? "high" : "medium",
    title: data.title,
    message: `${data.message}${className ? ` Kelas: ${className}.` : ""}`.trim(),
    link: "/dashboard/siswa/ujian",
  });
}

export async function notifyFileUpload(
  fileName: string,
  senderKode: string,
  senderName: string,
  role: "guru" | "siswa",
  targetNisList: string[],
  targetRole: "siswa" | "guru",
  folderName?: string,
  className?: string
) {
  const store = useNotificationStore.getState();
  const roleLabel = getRoleLabel(role);
  const folderText = folderName ? ` di folder ${folderName}` : "";
  const classText = className ? ` untuk kelas ${className}` : "";

  await store.sendToMultiple(targetNisList, targetRole, {
    sender_kode: senderKode,
    sender_role: role,
    sender_name: senderName,
    type: "file",
    priority: "low",
    title: targetRole === "siswa" ? "Materi Baru dari Guru" : "File Baru dari Siswa",
    message:
      role === "guru"
        ? `${roleLabel} ${senderName} mengunggah file "${fileName}"${folderText}${classText}.`
        : `${roleLabel} ${senderName} mengunggah file "${fileName}"${folderText}.`,
    link: targetRole === "siswa" ? "/dashboard/siswa" : "/dashboard/guru",
  });
}

export async function notifyLoginAlert(
  userKode: string,
  userRole: "siswa" | "guru" | "admin",
  userName: string,
  adminKode?: string
) {
  const store = useNotificationStore.getState();

  if (adminKode) {
    await store.createNotification({
      user_kode: adminKode,
      user_role: "admin",
      sender_kode: userKode,
      sender_role: userRole,
      sender_name: userName,
      type: "login",
      priority: "medium",
      title: "Login Baru",
      message: `${userName} (${getRoleLabel(userRole)}) baru saja login.`,
      link: "/dashboard/admin/logs",
    });
  }
}

export async function notifyAssignment(
  action: "created" | "closed" | "graded",
  assignmentTitle: string,
  targetNisList: string[],
  teacherKode: string,
  teacherName: string,
  className?: string
) {
  const store = useNotificationStore.getState();
  const messages: Record<string, { title: string; message: string }> = {
    created: {
      title: "Tugas Baru",
      message: `${teacherName} memberikan tugas "${assignmentTitle}".`,
    },
    closed: {
      title: "Tugas Ditutup",
      message: `Batas pengumpulan tugas "${assignmentTitle}" telah berakhir.`,
    },
    graded: {
      title: "Tugas Dinilai",
      message: `${teacherName} telah menilai tugas "${assignmentTitle}".`,
    },
  };

  const data = messages[action];
  if (!data) return;

  await store.sendToMultiple(targetNisList, "siswa", {
    sender_kode: teacherKode,
    sender_role: "guru",
    sender_name: teacherName,
    type: "assignment",
    priority: action === "created" ? "medium" : "low",
    title: data.title,
    message: `${data.message}${className ? ` Kelas: ${className}.` : ""}`.trim(),
    link: "/dashboard/siswa/tugas",
  });
}

export async function notifyPortfolioUpload(
  teacherKode: string,
  studentNis: string,
  studentName: string,
  portfolioTitle: string
) {
  const store = useNotificationStore.getState();

  if (!teacherKode) return;

  await store.createNotification({
    user_kode: teacherKode,
    user_role: "guru",
    sender_kode: studentNis,
    sender_role: "siswa",
    sender_name: studentName,
    type: "file",
    priority: "medium",
    title: "Upload Karya Baru",
    message: `${studentName} mengunggah karya "${portfolioTitle}" ke Galeri Karya.`,
    link: "/dashboard/guru/portofolio",
  });
}
