"use client";

import { useEffect, useState } from "react";
import { FileText, Plus, Search, Edit2, Trash2, Eye, Calendar, Users, Clock, CheckCircle, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Avatar } from "@/components/avatar";
import { notifyAssignment } from "@/lib/notifications";
import { useRouteCacheActive } from "@/components/route-cache";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Assignment, Class, AssignmentSubmission } from "@/types";

interface AssignmentFormData {
  title: string;
  description: string;
  class_id: string;
  due_date: string;
  status: "active" | "closed";
}

export default function GuruTugasPage() {
  const isRouteActive = useRouteCacheActive();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isSubmissionsLoading, setIsSubmissionsLoading] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [formData, setFormData] = useState<AssignmentFormData>({
    title: "",
    description: "",
    class_id: "",
    due_date: "",
    status: "active",
  });

  useEffect(() => {
    if (!isRouteActive) return;

    loadData();
  }, [isRouteActive]);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return;

    const { kode_guru: teacherKode } = JSON.parse(sessionData);

    const [assignmentsRes, classesRes] = await Promise.all([
      supabase.from("assignments").select("*").eq("teacher_kode", teacherKode).order("created_at", { ascending: false }),
      supabase.from("classes").select("*").order("name"),
    ]);

    if (assignmentsRes.data) setAssignments(assignmentsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setIsLoading(false);
  };

  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === "all" || a.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  const openModal = (assignment?: Assignment) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setFormData({
        title: assignment.title,
        description: assignment.description || "",
        class_id: assignment.class_id,
        due_date: assignment.due_date ? assignment.due_date.slice(0, 16) : "",
        status: assignment.status as "active" | "closed",
      });
    } else {
      setEditingAssignment(null);
      setFormData({
        title: "",
        description: "",
        class_id: "",
        due_date: "",
        status: "active",
      });
    }
    setIsModalOpen(true);
  };

  const openDetailModal = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setIsDetailModalOpen(true);
    setIsSubmissionsLoading(true);

    const supabase = createClient();
    const { data } = await supabase
      .from("assignment_submissions")
      .select("*")
      .eq("assignment_id", assignment.id)
      .order("submitted_at", { ascending: false });

    // Fetch student info for each submission
    if (data) {
      const submissionsWithStudents = await Promise.all(
        data.map(async (sub: typeof data[number]) => {
          const { data: studentData } = await supabase
            .from("students")
            .select("name, avatar_url")
            .eq("nis", sub.student_nis)
            .single();
          
          return {
            ...sub,
            student_name: studentData?.name || "Unknown",
            student_avatar: studentData?.avatar_url || null,
          };
        })
      );
      setSubmissions(submissionsWithStudents as any);
    }
    setIsSubmissionsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.class_id) {
      toast("Judul dan kelas wajib diisi", "error");
      return;
    }

    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return;
    const { kode_guru: teacherKode } = JSON.parse(sessionData);

    if (editingAssignment) {
      const { error } = await supabase
        .from("assignments")
        .update({
          title: formData.title,
          description: formData.description,
          class_id: formData.class_id,
          due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
          status: formData.status,
        })
        .eq("id", editingAssignment.id);

      if (error) {
        toast("Gagal mengupdate", "error");
      } else {
        toast("Berhasil diupdate", "success");
        loadData();
        setIsModalOpen(false);
      }
    } else {
      const { error } = await supabase.from("assignments").insert({
        title: formData.title,
        description: formData.description,
        class_id: formData.class_id,
        due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
        status: formData.status,
        teacher_kode: teacherKode,
      });

      if (error) {
        toast("Gagal membuat tugas", "error");
      } else {
        toast("Tugas berhasil dibuat", "success");
        
        // Notify students
        const { data: students } = await supabase
          .from("students")
          .select("nis")
          .eq("last_class_id", formData.class_id);
        
        if (students && students.length > 0) {
          const nisList = students.map((student: { nis: string }) => student.nis);
          const teacherSession = JSON.parse(sessionData);
          const teacherName = teacherSession.name || teacherSession.nama_guru || "Guru";
          const className = classes.find(c => c.id === formData.class_id)?.name;
          await notifyAssignment("created", formData.title, nisList, teacherKode, teacherName, className);
        }

        loadData();
        setIsModalOpen(false);
      }
    }
  };

  const handleDelete = async (assignment: Assignment) => {
    if (!confirm(`Hapus tugas "${assignment.title}"?`)) return;

    const supabase = createClient();
    const { error } = await supabase.from("assignments").delete().eq("id", assignment.id);

    if (error) {
      toast("Gagal menghapus", "error");
    } else {
      toast("Berhasil dihapus", "success");
      loadData();
    }
  };

  const updateGrade = async (submissionId: string, grade: string, feedback: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("assignment_submissions")
      .update({
        graded: true,
        grade,
        feedback,
      })
      .eq("id", submissionId);

    if (error) {
      toast("Gagal mengupdate nilai", "error");
    } else {
      toast("Nilai berhasil disimpan", "success");
      
      // Notify student
      const sessionData = sessionStorage.getItem("guruSession");
      if (sessionData) {
        const teacherSession = JSON.parse(sessionData);
        const teacherKode = teacherSession.kode_guru;
        const teacherName = teacherSession.name || teacherSession.nama_guru || "Guru";
        const submission = submissions.find(s => s.id === submissionId);
        if (submission) {
          await notifyAssignment("graded", selectedAssignment?.title || "Tugas", [submission.student_nis], teacherKode, teacherName);
        }
      }

      setSubmissions(submissions.map(s =>
        s.id === submissionId ? { ...s, graded: true, grade, feedback } : s
      ));
    }
  };

  const getSubmissionCount = (assignmentId: string) => {
    return submissions.filter(s => s.assignment_id === assignmentId).length;
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Manajemen Tugas</h2>
          <p className="text-gray-500">Kelola tugas untuk siswa</p>
        </div>
        <Button onClick={() => openModal()} className="bg-success hover:bg-success/90">
          <Plus size={18} />
          Tugas Baru
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari tugas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Semua Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <FileText size={48} className="mx-auto mb-3 opacity-50" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Tugas</h3>
          <p className="text-gray-500 mb-4">Buat tugas baru untuk siswa</p>
          <Button onClick={() => openModal()} className="bg-success hover:bg-success/90">
            <Plus size={18} />
            Buat Tugas
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAssignments.map((assignment) => (
            <div key={assignment.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg text-gray-800">{assignment.title}</h3>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      assignment.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}>
                      {assignment.status === "active" ? "Aktif" : "Ditutup"}
                    </span>
                  </div>
                  {assignment.description && (
                    <p className="text-gray-600 mb-3">{assignment.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {classes.find(c => c.id === assignment.class_id)?.name || "-"}
                    </span>
                    {assignment.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        Batas: {formatDate(assignment.due_date)}
                      </span>
                    )}
                    <button
                      onClick={() => openDetailModal(assignment)}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <Eye size={14} />
                      Lihat Submit ({getSubmissionCount(assignment.id)})
                    </button>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openModal(assignment)}>
                    <Edit2 size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(assignment)} className="text-danger">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAssignment ? "Edit Tugas" : "Buat Tugas Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Judul Tugas</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Tugas Matematika Bab 1"
              />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi</Label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Petunjuk tugas..."
                className="w-full min-h-[80px] px-3 py-2 border rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label>Kelas</Label>
              <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Batas Waktu</Label>
              <Input
                type="datetime-local"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as "active" | "closed" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="closed">Ditutup</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave} className="bg-success">{editingAssignment ? "Update" : "Buat"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submissions Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Pengumpulan Tugas - {selectedAssignment?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4">
            {isSubmissionsLoading ? (
              <div className="text-center py-8">Memuat...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Belum ada siswa yang mengumpulkan</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub: any) => (
                  <div key={sub.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={sub.student_avatar} name={sub.student_name || sub.student_nis} size="md" />
                        <div>
                          <p className="font-medium">{sub.student_name || sub.student_nis}</p>
                          <p className="text-xs text-gray-500">NIS: {sub.student_nis}</p>
                          <p className="text-xs text-gray-500">Dikumpulkan: {formatDate(sub.submitted_at)}</p>
                        </div>
                      </div>
                      {sub.graded ? (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle size={14} />
                          Sudah dinilai: {sub.grade}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600 text-sm">
                          <Clock size={14} />
                          Belum dinilai
                        </span>
                      )}
                    </div>
                    {sub.file_url && (
                      <a
                        href={sub.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        📎 Lihat File
                      </a>
                    )}
                    {sub.notes && <p className="text-sm text-gray-600 mt-2">Catatan: {sub.notes}</p>}
                    
                    <GradeForm
                      submission={sub}
                      onSave={(grade, feedback) => updateGrade(sub.id, grade, feedback)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GradeForm({ submission, onSave }: { submission: AssignmentSubmission; onSave: (grade: string, feedback: string) => void }) {
  const [grade, setGrade] = useState(submission.grade || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [isEditing, setIsEditing] = useState(false);

  if (!submission.graded && !isEditing) {
    return (
      <Button size="sm" onClick={() => setIsEditing(true)} className="mt-2">
        Beri Nilai
      </Button>
    );
  }

  if (!isEditing && submission.graded) {
    return (
      <div className="mt-3 pt-3 border-t">
        <p className="text-sm"><strong>Feedback:</strong> {submission.feedback || "-"}</p>
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="mt-2">
          Edit Nilai
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Nilai (A/B/C/D/E)"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-32"
        />
        <Input
          placeholder="Feedback..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
        <Button size="sm" onClick={() => { onSave(grade, feedback); setIsEditing(false); }} className="bg-success">
          Simpan
        </Button>
        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
          Batal
        </Button>
      </div>
    </div>
  );
}
