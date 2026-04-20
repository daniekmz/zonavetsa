"use client";

import { useEffect, useState, useRef } from "react";
import { FileText, Upload, Clock, CheckCircle, XCircle, Download } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useNotificationStore } from "@/lib/notifications";
import { useRouteCacheActive } from "@/components/route-cache";
import type { Assignment, AssignmentSubmission } from "@/types";

export default function SiswaTugasPage() {
  const isRouteActive = useRouteCacheActive();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isRouteActive) return;

    loadData();

    // Set up realtime subscription
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");
    if (sessionData) {
      const { student } = JSON.parse(sessionData);
      const targetClassId = student.class_id || student.last_class_id;
      
      const channel = supabase
        .channel("assignments_realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "assignments",
            filter: `class_id=eq.${targetClassId}`,
          },
          () => {
            loadData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isRouteActive]);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("studentSession");
    if (!sessionData) return;

    const { student } = JSON.parse(sessionData);
    const targetClassId = student.class_id || student.last_class_id;
    
    const [assignmentsRes, submissionsRes] = await Promise.all([
      supabase
        .from("assignments")
        .select("*")
        .eq("class_id", targetClassId)
        .eq("status", "active")
        .order("due_date", { ascending: true }),
      supabase
        .from("assignment_submissions")
        .select("*")
        .eq("student_nis", student.nis),
    ]);

    if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    if (submissionsRes.data) setSubmissions(submissionsRes.data);
    setIsLoading(false);
  };

  const getSubmission = (assignmentId: string) => {
    return submissions.find(s => s.assignment_id === assignmentId);
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const handleUpload = async (assignmentId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingId(assignmentId);
      const supabase = createClient();
      const sessionData = sessionStorage.getItem("studentSession");
      if (!sessionData) return;

      const { nis } = JSON.parse(sessionData).student;

      try {
        const fileName = `${nis}_${assignmentId}_${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("tugas")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from("tugas").getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from("assignment_submissions")
          .upsert({
            assignment_id: assignmentId,
            student_nis: nis,
            file_url: publicUrl,
            submitted_at: new Date().toISOString(),
          }, { onConflict: 'assignment_id,student_nis' });

        if (dbError) throw dbError;

        // Reward points
        await supabase.rpc('increment_points', { s_nis: nis, amount: 20 });

        toast("File berhasil diupload", "success");
        loadData();

        // Notify teacher
        const assignment = assignments.find(a => a.id === assignmentId);
        if (assignment) {
          const { createNotification } = useNotificationStore.getState();
          await createNotification({
            user_kode: assignment.teacher_kode,
            user_role: "guru",
            sender_kode: nis,
            sender_role: "siswa",
            sender_name: JSON.parse(sessionData).student.name,
            type: "assignment",
            priority: "medium",
            title: "Tugas Dikumpulkan",
            message: `${JSON.parse(sessionData).student.name} telah mengumpulkan tugas: ${assignment.title}`,
            link: "/dashboard/guru/tugas",
          });
        }
      } catch (err: any) {
        console.error(err);
        toast("Gagal upload: " + err.message, "error");
      } finally {
        setUploadingId(null);
      }
    };
    input.click();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">Tugas Saya</h2>
        <p className="text-gray-500">Kumpulkan tugas Anda tepat waktu</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <FileText size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Tidak Ada Tugas Aktif
          </h3>
          <p className="text-gray-500">
            Tugas yang di-assign ke kelas Anda akan muncul di sini
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const submission = getSubmission(assignment.id);
            const overdue = assignment.due_date && isOverdue(assignment.due_date);

            return (
              <div
                key={assignment.id}
                className={`bg-white rounded-xl p-6 shadow-sm ${
                  submission ? "border-l-4 border-green-500" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg text-gray-800">
                        {assignment.title}
                      </h3>
                      {submission ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                          <CheckCircle size={12} />
                          Submitted
                        </span>
                      ) : overdue ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                          <XCircle size={12} />
                          Terlambat
                        </span>
                      ) : null}
                    </div>
                    
                    {assignment.description && (
                      <p className="text-gray-600 mb-3">{assignment.description}</p>
                    )}

                    {assignment.due_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock size={14} />
                        Batas: {formatDate(assignment.due_date)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {submission ? (
                      <div className="text-right">
                        {submission.graded && (
                          <div className="text-sm mb-2">
                            <span className="font-bold text-green-600">Nilai: {submission.grade}</span>
                          </div>
                        )}
                        {submission.file_url && (
                          <a
                            href={submission.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            <Download size={14} />
                            Lihat File
                          </a>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleUpload(assignment.id)}
                        disabled={uploadingId === assignment.id || !!overdue}
                        className="bg-primary hover:bg-primary-light"
                      >
                        <Upload size={16} className="mr-2" />
                        {uploadingId === assignment.id ? "Mengupload..." : "Upload Tugas"}
                      </Button>
                    )}
                  </div>
                </div>

                {submission?.feedback && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm">
                      <strong>Feedback dari Guru:</strong> {submission.feedback}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
