"use client";

import type { ExamQuestion } from "@/types";

export const ALL_CLASSES_VALUE = "all_classes";
export const MULTI_CLASSES_PREFIX = "multi:";

export interface ExamSubmissionSummary {
  totalPoints: number;
  earnedPoints: number;
  scorePercentage: number;
  answeredCount: number;
  unansweredCount: number;
  answerResults: Record<string, string>;
  hasEssayQuestions: boolean;
  answeredEssayCount: number;
}

export function calculateExamSubmission(
  questions: ExamQuestion[],
  answers: Record<string, string>
): ExamSubmissionSummary {
  let totalPoints = 0;
  let earnedPoints = 0;
  let answeredCount = 0;
  let answeredEssayCount = 0;
  let hasEssayQuestions = false;
  const answerResults: Record<string, string> = {};

  for (const question of questions) {
    const points = question.points || 1;
    const studentAnswer = (answers[question.id] || "").trim();

    totalPoints += points;
    answerResults[question.id] = studentAnswer;

    if (studentAnswer) {
      answeredCount += 1;
    }

    if (question.is_essay) {
      hasEssayQuestions = true;
      if (studentAnswer) {
        answeredEssayCount += 1;
      }
      continue;
    }

    if (studentAnswer && studentAnswer === (question.correct_answer || "").trim()) {
      earnedPoints += points;
    }
  }

  const scorePercentage =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  return {
    totalPoints,
    earnedPoints,
    scorePercentage,
    answeredCount,
    unansweredCount: Math.max(0, questions.length - answeredCount),
    answerResults,
    hasEssayQuestions,
    answeredEssayCount,
  };
}

export function formatDurationLabel(minutes?: number) {
  const value = minutes || 0;
  if (value >= 60 && value % 60 === 0) {
    return `${value / 60} jam`;
  }

  return `${value} menit`;
}

export function getExamAvailabilityTone(status: "available" | "in_progress" | "submitted") {
  if (status === "in_progress") {
    return {
      badge: "Sedang Berjalan",
      badgeClass: "bg-warning/15 text-warning",
    };
  }

  if (status === "submitted") {
    return {
      badge: "Selesai",
      badgeClass: "bg-success/15 text-success",
    };
  }

  return {
    badge: "Siap Dikerjakan",
    badgeClass: "bg-primary/10 text-primary",
  };
}

export function parseExamTargetClassIds(examClassId?: string | null) {
  if (!examClassId) return [];
  if (examClassId === ALL_CLASSES_VALUE) return [ALL_CLASSES_VALUE];
  if (!examClassId.startsWith(MULTI_CLASSES_PREFIX)) return [examClassId];

  return examClassId
    .slice(MULTI_CLASSES_PREFIX.length)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function encodeExamTargetClassIds(classIds: string[]) {
  const uniqueClassIds = Array.from(new Set(classIds.filter(Boolean)));

  if (uniqueClassIds.length === 0) return "";
  if (uniqueClassIds.includes(ALL_CLASSES_VALUE)) return ALL_CLASSES_VALUE;
  if (uniqueClassIds.length === 1) return uniqueClassIds[0];

  return `${MULTI_CLASSES_PREFIX}${uniqueClassIds.join(",")}`;
}

export function isExamVisibleToStudent(examClassId?: string | null, targetClassId?: string | null) {
  if (!examClassId) return false;
  if (examClassId === ALL_CLASSES_VALUE) return true;
  if (!targetClassId) return false;

  return parseExamTargetClassIds(examClassId).includes(targetClassId);
}

export function doesExamMatchClassFilter(examClassId?: string | null, filterClassId?: string | null) {
  if (!filterClassId || filterClassId === "all") return true;
  if (!examClassId) return false;
  if (examClassId === ALL_CLASSES_VALUE) return filterClassId === ALL_CLASSES_VALUE;

  return parseExamTargetClassIds(examClassId).includes(filterClassId);
}
