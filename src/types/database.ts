export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "siswa" | "guru" | "admin";
          name: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: "siswa" | "guru" | "admin";
          name: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "siswa" | "guru" | "admin";
          name?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      teachers: {
        Row: {
          id: string;
          user_id: string | null;
          kode_guru: string;
          nip: string | null;
          name: string;
          email: string | null;
          phone: string | null;
          subject: string | null;
          avatar_url: string | null;
          password_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          kode_guru: string;
          nip?: string | null;
          name: string;
          email?: string | null;
          phone?: string | null;
          subject?: string | null;
          avatar_url?: string | null;
          password_hash?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          kode_guru?: string;
          nip?: string | null;
          name?: string;
          email?: string | null;
          phone?: string | null;
          subject?: string | null;
          avatar_url?: string | null;
          password_hash?: string | null;
        };
      };
      classes: {
        Row: {
          id: string;
          name: string;
          walikelas_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          walikelas_id?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          walikelas_id?: string | null;
        };
      };
      students: {
        Row: {
          id: string;
          user_id: string | null;
          nis: string;
          name: string;
          absen: number | null;
          class_id: string | null;
          email: string | null;
          phone: string | null;
          avatar_url: string | null;
          password_hash: string | null;
          last_teacher_id: string | null;
          last_class_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          nis: string;
          name: string;
          absen?: number | null;
          class_id?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          password_hash?: string | null;
          last_teacher_id?: string | null;
          last_class_id?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          nis?: string;
          name?: string;
          absen?: number | null;
          class_id?: string | null;
          email?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          password_hash?: string | null;
          last_teacher_id?: string | null;
          last_class_id?: string | null;
        };
      };
      files: {
        Row: {
          id: string;
          name: string;
          type: "folder" | "file";
          mime_type: string | null;
          size: number | null;
          path: string | null;
          parent_id: string | null;
          creator_id: string | null;
          creator_role: string | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: "folder" | "file";
          mime_type?: string | null;
          size?: number | null;
          path?: string | null;
          parent_id?: string | null;
          creator_id?: string | null;
          creator_role?: string | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: "folder" | "file";
          mime_type?: string | null;
          size?: number | null;
          path?: string | null;
          parent_id?: string | null;
          creator_id?: string | null;
          creator_role?: string | null;
          description?: string | null;
          updated_at?: string;
        };
      };
      exams: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          teacher_id: string;
          class_id: string;
          duration_minutes: number | null;
          status: "draft" | "published";
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          teacher_id: string;
          class_id: string;
          duration_minutes?: number | null;
          status?: "draft" | "published";
          created_at?: string;
          published_at?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          teacher_id?: string;
          class_id?: string;
          duration_minutes?: number | null;
          status?: "draft" | "published";
          published_at?: string | null;
        };
      };
      exam_questions: {
        Row: {
          id: string;
          exam_id: string;
          question_text: string;
          option_a: string | null;
          option_b: string | null;
          option_c: string | null;
          option_d: string | null;
          option_e: string | null;
          correct_answer: string | null;
          is_essay: boolean;
          order_index: number;
        };
        Insert: {
          id?: string;
          exam_id: string;
          question_text: string;
          option_a?: string | null;
          option_b?: string | null;
          option_c?: string | null;
          option_d?: string | null;
          option_e?: string | null;
          correct_answer?: string | null;
          is_essay?: boolean;
          order_index?: number;
        };
        Update: {
          question_text?: string;
          option_a?: string | null;
          option_b?: string | null;
          option_c?: string | null;
          option_d?: string | null;
          option_e?: string | null;
          correct_answer?: string | null;
          is_essay?: boolean;
          order_index?: number;
        };
      };
      exam_scores: {
        Row: {
          id: string;
          exam_id: string;
          student_id: string;
          score: number | null;
          answers: Json | null;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          student_id: string;
          score?: number | null;
          answers?: Json | null;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          score?: number | null;
          answers?: Json | null;
          submitted_at?: string | null;
        };
      };
      attendance_sessions: {
        Row: {
          id: string;
          teacher_kode: string | null;
          class_id: string;
          code: string;
          duration_minutes: number;
          started_at: string | null;
          expires_at: string;
          status: "active" | "expired" | "cancelled";
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_kode?: string | null;
          class_id: string;
          code: string;
          duration_minutes?: number;
          started_at?: string | null;
          expires_at: string;
          status?: "active" | "expired" | "cancelled";
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          teacher_kode?: string | null;
          class_id?: string;
          code?: string;
          duration_minutes?: number;
          started_at?: string | null;
          expires_at?: string;
          status?: "active" | "expired" | "cancelled";
          closed_at?: string | null;
          updated_at?: string;
        };
      };
      attendance_records: {
        Row: {
          id: string;
          session_id: string;
          student_nis: string;
          recorded_at: string;
          status: "present" | "late" | "absent";
          source: "qr" | "manual" | "system";
          notes: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_nis: string;
          recorded_at?: string;
          status?: "present" | "late" | "absent";
          source?: "qr" | "manual" | "system";
          notes?: string | null;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          student_nis?: string;
          recorded_at?: string;
          status?: "present" | "late" | "absent";
          source?: "qr" | "manual" | "system";
          notes?: string | null;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_kode: string;
          user_role: string;
          action: string;
          details: string | null;
          metadata: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_kode: string;
          user_role: string;
          action: string;
          details?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          user_kode?: string;
          user_role?: string;
          action?: string;
          details?: string | null;
          metadata?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
