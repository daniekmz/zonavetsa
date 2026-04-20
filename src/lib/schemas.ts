import { z } from "zod";

export const loginSiswaSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const selectGuruSchema = z.object({
  teacherId: z.string().min(1, "Pilih guru terlebih dahulu"),
  classId: z.string().min(1, "Pilih kelas terlebih dahulu"),
});

export const loginGuruSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const loginAdminSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const guruSchema = z.object({
  kode_guru: z.string().min(1, "Kode guru wajib diisi"),
  nip: z.string().optional(),
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  subject: z.string().optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
});

export const siswaSchema = z.object({
  nis: z.string().min(1, "NIS wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  absen: z.number().optional(),
  class_id: z.string().min(1, "Kelas wajib dipilih"),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
});

export const classSchema = z.object({
  name: z.string().min(1, "Nama kelas wajib diisi"),
  walikelas_id: z.string().optional(),
});

export const examSchema = z.object({
  title: z.string().min(1, "Judul ujian wajib diisi"),
  description: z.string().optional(),
  class_id: z.string().min(1, "Kelas wajib dipilih"),
  duration_minutes: z.number().min(1, "Durasi minimal 1 menit").default(90),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const attendanceSessionSchema = z.object({
  class_id: z.string().min(1, "Kelas wajib dipilih"),
  duration_minutes: z.number().min(5, "Minimal 5 menit").max(120, "Maksimal 120 menit").default(30),
});

export type LoginSiswaInput = z.infer<typeof loginSiswaSchema>;
export type SelectGuruInput = z.infer<typeof selectGuruSchema>;
export type LoginGuruInput = z.infer<typeof loginGuruSchema>;
export type LoginAdminInput = z.infer<typeof loginAdminSchema>;
export type GuruInput = z.infer<typeof guruSchema>;
export type SiswaInput = z.infer<typeof siswaSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type ExamInput = z.infer<typeof examSchema>;
export type AttendanceSessionInput = z.infer<typeof attendanceSessionSchema>;