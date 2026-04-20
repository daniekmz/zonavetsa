"use client";

import type { Class, Student } from "@/types";
import { createClient } from "@/lib/supabase";

export interface LeaderboardBreakdown {
  examPoints: number;
  assignmentPoints: number;
  attendancePoints: number;
  activityPoints: number;
  bonusPoints: number;
  portfolioPoints: number;
}

export interface LeaderboardEntry extends Student {
  totalPoints: number;
  derivedLevel: number;
  className?: string;
  breakdown: LeaderboardBreakdown;
}

const ACTIVITY_POINT_MAP: Record<string, number> = {
  login: 1,
  exam_start: 2,
  exam_submit: 8,
  time_up_exam: 4,
  absensi: 3,
  file_upload: 2,
  file_download: 1,
  profile_update: 1,
};

export async function loadLeaderboardData(options?: { classId?: string }) {
  const supabase = createClient();
  const classesPromise = supabase.from("classes").select("*").order("name");

  let studentQuery = supabase
    .from("students")
    .select("id, nis, name, class_id, avatar_url, points, level, absen, created_at")
    .order("name");

  if (options?.classId) {
    studentQuery = studentQuery.eq("class_id", options.classId);
  }

  const [studentsRes, classesRes] = await Promise.all([studentQuery, classesPromise]);

  const students = (studentsRes.data || []) as Student[];
  const classes = (classesRes.data || []) as Class[];

  if (students.length === 0) {
    return { leaderboard: [] as LeaderboardEntry[], classes };
  }

  const nisList = students.map((student) => student.nis);

  const [examScoresRes, attendanceRes, submissionsRes, activityRes, portfoliosRes] = await Promise.all([
    supabase.from("exam_scores").select("student_nis, score, earned_points").in("student_nis", nisList),
    supabase.from("attendance_records").select("student_nis, status").in("student_nis", nisList),
    supabase.from("assignment_submissions").select("student_nis, graded, grade").in("student_nis", nisList),
    supabase.from("activity_logs").select("user_kode, action").eq("user_role", "siswa").in("user_kode", nisList),
    supabase.from("portofolios").select("id, student_nis").in("student_nis", nisList),
  ]);

  const classMap = new Map(classes.map((item) => [item.id, item.name]));
  const breakdownMap = new Map<string, LeaderboardBreakdown>();

  const ensureBreakdown = (nis: string) => {
    if (!breakdownMap.has(nis)) {
      breakdownMap.set(nis, {
        examPoints: 0,
        assignmentPoints: 0,
        attendancePoints: 0,
        activityPoints: 0,
        bonusPoints: 0,
        portfolioPoints: 0,
      });
    }

    return breakdownMap.get(nis)!;
  };

  (examScoresRes.data || []).forEach((item: { student_nis: string; score?: number | null; earned_points?: number | null }) => {
    const breakdown = ensureBreakdown(item.student_nis);
    breakdown.examPoints += Math.max(0, Math.round(item.score || 0));
    breakdown.bonusPoints += Math.max(0, Math.round((item.earned_points || 0) / 10));
  });

  (attendanceRes.data || []).forEach((item: { student_nis: string; status?: string | null }) => {
    const breakdown = ensureBreakdown(item.student_nis);
    if (item.status === "present") {
      breakdown.attendancePoints += 10;
    } else if (item.status === "late") {
      breakdown.attendancePoints += 6;
    } else {
      breakdown.attendancePoints += 1;
    }
  });

  (submissionsRes.data || []).forEach((item: { student_nis: string; graded?: boolean | null; grade?: string | null }) => {
    const breakdown = ensureBreakdown(item.student_nis);
    breakdown.assignmentPoints += 20;

    if (item.graded && item.grade) {
      const numericGrade = Number.parseFloat(item.grade);
      if (!Number.isNaN(numericGrade)) {
        breakdown.assignmentPoints += Math.max(0, Math.round(numericGrade / 5));
      }
    }
  });

  (activityRes.data || []).forEach((item: { user_kode: string; action?: string | null }) => {
    const breakdown = ensureBreakdown(item.user_kode);
    breakdown.activityPoints += ACTIVITY_POINT_MAP[item.action || ""] || 0;
  });

  const portfolios = (portfoliosRes.data || []) as { id: string; student_nis: string }[];
  const portfolioOwnerMap = new Map<string, string>();
  portfolios.forEach((portfolio) => {
    portfolioOwnerMap.set(portfolio.id, portfolio.student_nis);
    const breakdown = ensureBreakdown(portfolio.student_nis);
    breakdown.portfolioPoints += 15;
  });

  const portfolioIds = portfolios.map((portfolio) => portfolio.id);
  if (portfolioIds.length > 0) {
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from("portfolio_likes").select("portfolio_id, liker_role, liker_nis").in("portfolio_id", portfolioIds),
      supabase
        .from("portfolio_comments")
        .select("portfolio_id, commenter_role, commenter_nis")
        .in("portfolio_id", portfolioIds),
    ]);

    (likesRes.data || []).forEach((item: { portfolio_id: string; liker_role?: string | null; liker_nis?: string | null }) => {
      const ownerNis = portfolioOwnerMap.get(item.portfolio_id);
      if (!ownerNis) return;

      if (item.liker_role === "siswa" && item.liker_nis && item.liker_nis !== ownerNis) {
        ensureBreakdown(item.liker_nis).portfolioPoints += 2;
      }

      if (!(item.liker_role === "siswa" && item.liker_nis === ownerNis)) {
        ensureBreakdown(ownerNis).portfolioPoints += 1;
      }
    });

    (commentsRes.data || []).forEach((item: { portfolio_id: string; commenter_role?: string | null; commenter_nis?: string | null }) => {
      const ownerNis = portfolioOwnerMap.get(item.portfolio_id);
      if (!ownerNis) return;

      if (item.commenter_role === "siswa" && item.commenter_nis && item.commenter_nis !== ownerNis) {
        ensureBreakdown(item.commenter_nis).portfolioPoints += 3;
      }

      if (!(item.commenter_role === "siswa" && item.commenter_nis === ownerNis)) {
        ensureBreakdown(ownerNis).portfolioPoints += 2;
      }
    });
  }

  const leaderboard = students
    .map((student) => {
      const breakdown = ensureBreakdown(student.nis);
      const storedPoints = student.points || 0;
      const derivedPoints =
        breakdown.examPoints +
        breakdown.assignmentPoints +
        breakdown.attendancePoints +
        breakdown.activityPoints +
        breakdown.bonusPoints +
        breakdown.portfolioPoints;
      const totalPoints = Math.max(storedPoints, derivedPoints);
      const derivedLevel = Math.max(student.level || 1, Math.floor(totalPoints / 100) + 1);

      return {
        ...student,
        totalPoints,
        derivedLevel,
        className: student.class_id ? classMap.get(student.class_id) : undefined,
        breakdown,
      } satisfies LeaderboardEntry;
    })
    .sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      return left.name.localeCompare(right.name);
    });

  return { leaderboard, classes };
}
