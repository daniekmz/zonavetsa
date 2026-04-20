import { create } from "zustand";
import { createClient } from "@/lib/supabase";
import type { User, UserRole } from "@/types";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loginSiswa: (nis: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginGuru: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  selectGuru: (teacherId: string, classId: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  loginSiswa: async (nis: string, password: string) => {
    set({ isLoading: true, error: null });
    const supabase = createClient();

    try {
      const { data: student, error } = await supabase
        .from("students")
        .select("*")
        .eq("nis", nis)
        .single();

      if (error || !student) {
        return { success: false, error: "NIS tidak ditemukan" };
      }

      if (student.password_hash !== password) {
        return { success: false, error: "Password salah" };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", student.user_id || student.id)
        .single();

      const user: User = {
        id: student.id,
        email: student.email || "",
        role: "siswa",
        name: student.name,
        avatar_url: student.avatar_url,
        created_at: student.created_at,
      };

      set({ user, role: "siswa", isLoading: false });

      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "studentSession",
          JSON.stringify({ student, selected: false })
        );
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: "Terjadi kesalahan" };
    } finally {
      set({ isLoading: false });
    }
  },

  loginGuru: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    const supabase = createClient();

    try {
      const { data: teacher, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("kode_guru", username)
        .single();

      if (error || !teacher) {
        return { success: false, error: "Kode guru tidak ditemukan" };
      }

      if (teacher.password_hash !== password) {
        return { success: false, error: "Password salah" };
      }

      const user: User = {
        id: teacher.id,
        email: teacher.email || "",
        role: "guru",
        name: teacher.name,
        avatar_url: teacher.avatar_url,
        created_at: teacher.created_at,
      };

      set({ user, role: "guru", isLoading: false });

      if (typeof window !== "undefined") {
        sessionStorage.setItem("guruSession", JSON.stringify(teacher));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: "Terjadi kesalahan" };
    } finally {
      set({ isLoading: false });
    }
  },

  loginAdmin: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    const supabase = createClient();

    try {
      const { data: admin, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", username)
        .eq("role", "admin")
        .single();

      if (error || !admin) {
        return { success: false, error: "Username admin tidak ditemukan" };
      }

      if (admin.password_hash !== password) {
        return { success: false, error: "Password salah" };
      }

      const user: User = {
        id: admin.id,
        email: admin.email || "",
        role: "admin",
        name: admin.name,
        avatar_url: admin.avatar_url,
        created_at: admin.created_at,
      };

      set({ user, role: "admin", isLoading: false });

      if (typeof window !== "undefined") {
        sessionStorage.setItem("adminSession", JSON.stringify(admin));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: "Terjadi kesalahan" };
    } finally {
      set({ isLoading: false });
    }
  },

  selectGuru: async (teacherId: string, classId: string) => {
    const supabase = createClient();
    const { user } = get();

    if (!user) return { success: false, error: "User not found" };

    try {
      await supabase
        .from("students")
        .update({
          last_teacher_id: teacherId,
          last_class_id: classId,
        })
        .eq("id", user.id);

      const sessionData = sessionStorage.getItem("studentSession");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.student.last_teacher_id = teacherId;
        parsed.student.last_class_id = classId;
        parsed.selected = true;
        sessionStorage.setItem("studentSession", JSON.stringify(parsed));
      }

      return { success: true };
    } catch (err) {
      return { success: false, error: "Failed to select guru" };
    }
  },

  logout: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    sessionStorage.clear();
    set({ user: null, role: null, error: null });
  },

  checkSession: async () => {
    set({ isLoading: true });
    const supabase = createClient();

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          set({
            user: {
              id: profile.id,
              email: profile.email || "",
              role: profile.role,
              name: profile.name,
              avatar_url: profile.avatar_url,
              created_at: profile.created_at,
            },
            role: profile.role,
          });
        }
      }
    } catch (err) {
      console.error("Session check failed:", err);
    } finally {
      set({ isLoading: false });
    }
  },
}));