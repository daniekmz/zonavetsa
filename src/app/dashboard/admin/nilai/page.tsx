"use client";

import { useEffect, useState } from "react";
import { BarChart3, Search, Download, Filter, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExamScore, Exam, Student, Class } from "@/types";
import * as XLSX from "xlsx";

export default function AdminNilaiPage() {
  const [scores, setScores] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [examFilter, setExamFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const supabase = createClient();

    const [scoresRes, examsRes, classesRes] = await Promise.all([
      supabase.from("exam_scores").select("*").order("submitted_at", { ascending: false }),
      supabase.from("exams").select("*").order("title"),
      supabase.from("classes").select("*").order("name"),
    ]);

    if (scoresRes.data) setScores(scoresRes.data);
    if (examsRes.data) setExams(examsRes.data);
    if (classesRes.data) setClasses(classesRes.data);
    setIsLoading(false);
  };

  const filteredScores = scores.filter((s) => {
    const matchesExam = examFilter === "all" || s.exam_id === examFilter;
    return matchesExam;
  });

  const handleExport = () => {
    const data = filteredScores.map((s) => {
      const exam = exams.find((e) => e.id === s.exam_id);
      return {
        "ID Score": s.id,
        "Exam Title": exam?.title || "-",
        "Score": s.score,
        "Submitted At": s.submitted_at || "-",
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nilai");
    XLSX.writeFile(wb, "data-nilai.xlsx");
    alert("Data berhasil di-export!");
  };

  const getAverageScore = () => {
    if (filteredScores.length === 0) return 0;
    const total = filteredScores.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0);
    return (total / filteredScores.length).toFixed(2);
  };

  const getPassRate = () => {
    if (filteredScores.length === 0) return 0;
    const passed = filteredScores.filter((s) => parseFloat(s.score) >= 70).length;
    return ((passed / filteredScores.length) * 100).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Nilai Siswa</h2>
          <p className="text-gray-500">Lihat dan export nilai ujian siswa</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download size={18} />
          Export Excel
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Nilai</p>
              <p className="text-2xl font-bold text-primary">{filteredScores.length}</p>
            </div>
            <BarChart3 size={32} className="text-primary/30" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rata-rata</p>
              <p className="text-2xl font-bold text-primary">{getAverageScore()}</p>
            </div>
            <BarChart3 size={32} className="text-success/30" />
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pass Rate</p>
              <p className="text-2xl font-bold text-primary">{getPassRate()}%</p>
            </div>
            <BarChart3 size={32} className="text-warning/30" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          <Select value={examFilter} onValueChange={setExamFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter Ujian" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Ujian</SelectItem>
              {exams.map((exam) => (
                <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Scores Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : filteredScores.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-50" />
          <p>Tidak ada nilai</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ujian</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">NIS Siswa</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Nilai</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Tanggal Submit</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredScores.map((score) => {
                  const exam = exams.find((e) => e.id === score.exam_id);
                  return (
                    <tr key={score.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-800">{exam?.title || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{score.student_nis || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-sm rounded-full ${
                            parseFloat(score.score) >= 70
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {score.score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {score.submitted_at ? new Date(score.submitted_at).toLocaleDateString("id-ID") : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}