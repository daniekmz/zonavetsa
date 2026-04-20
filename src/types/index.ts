export type UserRole = "siswa" | "guru" | "admin";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar_url?: string;
  created_at: string;
}

export interface Profile {
  username: string;
  role: UserRole;
  name: string;
  password?: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  kode_guru: string;
  nip?: string;
  name: string;
  email?: string;
  phone?: string;
  subject?: string;
  avatar_url?: string;
  password?: string;
  created_at: string;
  id?: string;
}

export interface Class {
  id: string;
  name: string;
  walikelas_kode?: string;
  created_at: string;
}

export interface Student {
  nis: string;
  name: string;
  absen?: number;
  class_id?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  password?: string;
  last_teacher_kode?: string;
  last_class_id?: string;
  points?: number;
  level?: number;
  achievements?: string[];
  created_at: string;
  id?: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  mime_type?: string;
  size?: number;
  path?: string;
  parent_id?: string;
  class_id?: string;
  creator_kode?: string;
  creator_role?: UserRole;
  description?: string;
  created_at: string;
  updated_at: string;
  creator_id?: string;
}

export interface Exam {
  id: string;
  title: string;
  description?: string;
  teacher_kode: string;
  class_id: string;
  duration_minutes?: number;
  status: "draft" | "published" | "archived";
  created_at: string;
  published_at?: string;
  start_time?: string;
  end_time?: string;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_results?: boolean;
  passing_score?: number;
  instructions?: string;
}

export interface ExamQuestion {
  id: string;
  exam_id: string;
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  correct_answer?: string;
  is_essay: boolean;
  is_true_false?: boolean;
  points?: number;
  explanation?: string;
  order_index: number;
}

export interface ExamSession {
  id: string;
  exam_id: string;
  student_nis: string;
  started_at: string;
  submitted_at?: string;
  is_completed: boolean;
  time_remaining?: number;
}

export interface ExamAnswer {
  id: string;
  session_id: string;
  question_id: string;
  answer?: string;
  is_correct?: boolean;
  points_earned?: number;
  graded_at?: string;
  graded_by?: string;
}

export interface ExamScore {
  id: string;
  exam_id: string;
  student_nis: string;
  score?: number;
  total_points?: number;
  earned_points?: number;
  answers?: Record<string, string>;
  submitted_at?: string;
  created_at: string;
}

export interface AttendanceSession {
  id: string;
  teacher_kode: string;
  class_id: string;
  code: string;
  duration_minutes: number;
  started_at?: string;
  expires_at: string;
  status: "active" | "expired" | "cancelled";
  closed_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_nis: string;
  recorded_at: string;
  status: "present" | "late" | "absent";
  source?: "qr" | "manual" | "system";
  notes?: string | null;
}

export interface ActivityLog {
  id: string;
  user_kode: string;
  user_role: UserRole;
  action: string;
  details?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  teacher_kode: string;
  class_id: string;
  due_date?: string;
  status: "active" | "closed";
  created_at: string;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_nis: string;
  file_url?: string;
  notes?: string;
  submitted_at: string;
  graded: boolean;
  grade?: string;
  feedback?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  author_kode?: string;
  author_role?: "admin" | "guru";
  author_name?: string;
  target_roles?: string[];
  target_classes?: string[];
  is_pinned?: boolean;
  is_active?: boolean;
  created_at: string;
  expires_at?: string;
}

export type NotificationType = "attendance" | "exam" | "file" | "assignment" | "system" | "profile" | "login";
export type NotificationPriority = "high" | "medium" | "low";

export interface Notification {
  id: string;
  user_kode: string;
  user_role: UserRole;
  sender_kode?: string;
  sender_role?: UserRole | "system";
  sender_name?: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface Major {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  skills?: string[];
  is_active: boolean;
  created_at: string;
}

export interface SchoolStat {
  id: string;
  key: string;
  value: number;
  updated_at: string;
}

export interface PortfolioItem {
  id: string;
  student_nis: string;
  title: string;
  description?: string;
  image_url: string;
  visibility_scope: "class" | "global";
  uploader_name?: string;
  uploader_class_id?: string | null;
  uploader_class_name?: string | null;
  likes: number;
  comments: number;
  created_at: string;
  updated_at?: string;
}

export interface PortfolioLike {
  id: string;
  portfolio_id: string;
  liker_role: UserRole;
  liker_nis?: string | null;
  liker_kode?: string | null;
  liker_name: string;
  liker_class_id?: string | null;
  liker_class_name?: string | null;
  created_at: string;
}

export interface PortfolioComment {
  id: string;
  portfolio_id: string;
  commenter_role: UserRole;
  commenter_nis?: string | null;
  commenter_kode?: string | null;
  commenter_name: string;
  commenter_class_id?: string | null;
  commenter_class_name?: string | null;
  comment_text: string;
  created_at: string;
}
