"use client";

import { createClient } from "@/lib/supabase";
import type { UserRole } from "@/types";

export type LogAction = 
  | "login" | "logout" 
  | "create" | "update" | "delete" 
  | "exam_create" | "exam_start" | "exam_submit" | "exam_publish" | "time_up_exam"
  | "file_upload" | "file_download" | "file_delete"
  | "grade_create" | "grade_update"
  | "settings_update"
  | "profile_update"
  | "absensi";

interface LogParams {
  action: LogAction;
  details?: string;
  metadata?: Record<string, any>;
}

export async function logActivity(
  userKode: string,
  userRole: UserRole,
  params: LogParams
) {
  const supabase = createClient();
  
  const logData = {
    user_kode: userKode,
    user_role: userRole,
    action: params.action,
    details: params.details || null,
    metadata: params.metadata || null,
    ip_address: null, // Will be captured server-side if needed
    user_agent: typeof window !== "undefined" ? navigator.userAgent : null,
  };

  const { error } = await supabase
    .from("activity_logs")
    .insert(logData);

  if (error) {
    console.error("Failed to log activity:", error);
  }
}

// Login activity helper
export async function logLogin(userKode: string, userRole: UserRole) {
  await logActivity(userKode, userRole, {
    action: "login",
    details: `User logged in as ${userRole}`,
  });
}

// Logout activity helper
export async function logLogout(userKode: string, userRole: UserRole) {
  await logActivity(userKode, userRole, {
    action: "logout",
    details: `User logged out`,
  });
}

// CRUD operation helpers
export async function logCreate(userKode: string, userRole: UserRole, entity: string, entityId: string) {
  await logActivity(userKode, userRole, {
    action: "create",
    details: `Created ${entity}`,
    metadata: { entity, entity_id: entityId },
  });
}

export async function logUpdate(userKode: string, userRole: UserRole, entity: string, entityId: string, changes?: string[]) {
  await logActivity(userKode, userRole, {
    action: "update",
    details: `Updated ${entity}`,
    metadata: { entity, entity_id: entityId, changes },
  });
}

export async function logDelete(userKode: string, userRole: UserRole, entity: string, entityId: string) {
  await logActivity(userKode, userRole, {
    action: "delete",
    details: `Deleted ${entity}`,
    metadata: { entity, entity_id: entityId },
  });
}

// Exam-specific helpers
export async function logExamCreate(userKode: string, userRole: UserRole, examTitle: string, examId: string) {
  await logActivity(userKode, userRole, {
    action: "exam_create",
    details: `Created exam: ${examTitle}`,
    metadata: { exam_id: examId },
  });
}

export async function logExamPublish(userKode: string, userRole: UserRole, examTitle: string, examId: string) {
  await logActivity(userKode, userRole, {
    action: "exam_publish",
    details: `Published exam: ${examTitle}`,
    metadata: { exam_id: examId },
  });
}

export async function logExamSubmit(userKode: string, userRole: UserRole, examTitle: string, examId: string, score?: number) {
  await logActivity(userKode, userRole, {
    action: "exam_submit",
    details: `Submitted exam: ${examTitle}${score !== undefined ? ` (Score: ${score})` : ""}`,
    metadata: { exam_id: examId, score },
  });
}

// File operation helpers
export async function logFileUpload(userKode: string, userRole: UserRole, fileName: string, fileId: string) {
  await logActivity(userKode, userRole, {
    action: "file_upload",
    details: `Uploaded file: ${fileName}`,
    metadata: { file_id: fileId, file_name: fileName },
  });
}

export async function logFileDownload(userKode: string, userRole: UserRole, fileName: string, fileId: string) {
  await logActivity(userKode, userRole, {
    action: "file_download",
    details: `Downloaded file: ${fileName}`,
    metadata: { file_id: fileId, file_name: fileName },
  });
}

export async function logFileDelete(userKode: string, userRole: UserRole, fileName: string, fileId: string) {
  await logActivity(userKode, userRole, {
    action: "file_delete",
    details: `Deleted file: ${fileName}`,
    metadata: { file_id: fileId, file_name: fileName },
  });
}

// Grade operation helpers
export async function logGradeCreate(userKode: string, userRole: UserRole, studentNis: string, examId: string, score: number) {
  await logActivity(userKode, userRole, {
    action: "grade_create",
    details: `Posted grade for student ${studentNis}`,
    metadata: { student_nis: studentNis, exam_id: examId, score },
  });
}

// Settings update helper
export async function logSettingsUpdate(userKode: string, userRole: UserRole, settingName: string) {
  await logActivity(userKode, userRole, {
    action: "settings_update",
    details: `Updated settings: ${settingName}`,
    metadata: { setting_name: settingName },
  });
}

// Profile update helper
export async function logProfileUpdate(userKode: string, userRole: UserRole, field: string) {
  await logActivity(userKode, userRole, {
    action: "profile_update",
    details: `Updated profile: ${field}`,
    metadata: { field },
  });
}