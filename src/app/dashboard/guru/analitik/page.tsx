"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { AlertTriangle, TrendingUp, Users, Presentation, CheckCircle, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";

interface ExamAvg {
  name: string;
  avgScore: number;
  totalStudents: number;
}

interface AtRiskStudent {
  nis: string;
  name: string;
  avgScore: number;
  examsTaken: number;
  class_id?: string;
  avatar_url?: string;
}

export default function AnalitikPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [examData, setExamData] = useState<ExamAvg[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [stats, setStats] = useState({
    avgScoreOverall: 0,
    totalExams: 0,
    totalStudents: 0,
    riskCount: 0
  });

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const sessionData = sessionStorage.getItem("guruSession");
    if (!sessionData) return;
    
    const { kode_guru } = JSON.parse(sessionData);

    // Fetch exams by this teacher
    const { data: exams } = await supabase
      .from("exams")
      .select("id, title, passing_score")
      .eq("teacher_kode", kode_guru);

    if (!exams || exams.length === 0) {
      setIsLoading(false);
      return;
    }

    const examIds = exams.map((e: any) => e.id);

    // Fetch scores
    const { data: scores } = await supabase
      .from("exam_scores")
      .select("student_nis, score, exam_id")
      .in("exam_id", examIds);

    // Fetch students to map NIS to name
    const { data: students } = await supabase
      .from("students")
      .select("nis, name, class_id, avatar_url");

    const studentMap: Record<string, any> = {};
    students?.forEach((s: any) => {
      studentMap[s.nis] = s;
    });

    // 1. Process Exam Averages for Chart
    const examAverages: ExamAvg[] = [];
    let grandTotalScore = 0;
    let grandTotalCount = 0;

    for (const exam of exams) {
      const examScores = scores?.filter((s: any) => s.exam_id === exam.id) || [];
      if (examScores.length > 0) {
        const sum = examScores.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
        const avg = sum / examScores.length;
        examAverages.push({
          name: exam.title.length > 15 ? exam.title.substring(0, 15) + "..." : exam.title,
          avgScore: Math.round(avg),
          totalStudents: examScores.length
        });
        
        grandTotalScore += sum;
        grandTotalCount += examScores.length;
      }
    }

    // 2. Process At-Risk Students
    // Group scores by student
    const studentScoresMap: Record<string, number[]> = {};
    scores?.forEach((s: any) => {
      if (!studentScoresMap[s.student_nis]) {
        studentScoresMap[s.student_nis] = [];
      }
      studentScoresMap[s.student_nis].push(s.score || 0);
    });

    const atRisk: AtRiskStudent[] = [];
    Object.entries(studentScoresMap).forEach(([nis, studentScores]) => {
      const sum = studentScores.reduce((acc, v) => acc + v, 0);
      const avg = sum / studentScores.length;
      
      // Define 'at-risk' as average score below 70
      if (avg < 70) {
        const stuData = studentMap[nis];
        atRisk.push({
          nis,
          name: stuData?.name || "Unknown",
          avgScore: Math.round(avg),
          examsTaken: studentScores.length,
          class_id: stuData?.class_id,
          avatar_url: stuData?.avatar_url
        });
      }
    });

    // Sort at risk students by lowest score
    atRisk.sort((a, b) => a.avgScore - b.avgScore);

    // Calculate unique students tested
    const uniqueStudents = new Set(scores?.map((s: any) => s.student_nis)).size;

    setExamData(examAverages);
    setAtRiskStudents(atRisk);
    setStats({
      avgScoreOverall: grandTotalCount > 0 ? Math.round(grandTotalScore / grandTotalCount) : 0,
      totalExams: exams.length,
      totalStudents: uniqueStudents,
      riskCount: atRisk.length
    });

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-24 bg-gray-200 rounded-xl animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
          <div className="h-80 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Dashboard Analitik</h2>
          <p className="text-gray-500">Pantau performa kelas dan identifikasi siswa yang butuh perhatian khusus</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-ai p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Presentation size={48} />
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
            <Presentation size={24} />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Total Ujian Aktif</h3>
          <div className="text-3xl font-bold text-gray-800 mt-1">{stats.totalExams}</div>
        </div>

        <div className="card-ai p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Users size={48} />
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
            <Users size={24} />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Total Partisipan Valid</h3>
          <div className="text-3xl font-bold text-gray-800 mt-1">{stats.totalStudents}</div>
        </div>

        <div className="card-ai p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={48} />
          </div>
          <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center text-success mb-4">
            <TrendingUp size={24} />
          </div>
          <h3 className="text-gray-500 text-sm font-medium">Rata-rata Nilai Global</h3>
          <div className="text-3xl font-bold text-gray-800 mt-1">{stats.avgScoreOverall}</div>
        </div>

        <div className="card-ai p-5 border border-danger/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <AlertTriangle size={48} />
          </div>
          <div className="w-12 h-12 bg-danger/10 rounded-xl flex items-center justify-center text-danger mb-4">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-danger/80 text-sm font-medium">Siswa Butuh Perhatian (At-Risk)</h3>
          <div className="text-3xl font-bold text-danger mt-1">{stats.riskCount}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Average Score per Exam */}
        <div className="card-ai p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-primary flex items-center gap-2">
              <BarChart3 size={24} />
              Rata-rata Nilai per Ujian
            </h3>
          </div>
          
          {examData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={examData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{fill: '#666'}} tickLine={false} />
                  <YAxis tick={{fill: '#666'}} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{fill: 'rgba(0,43,91,0.05)'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="avgScore" name="Rata-rata Nilai" fill="#002b5b" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400 flex-col">
              <BarChart3 size={48} className="mb-4 opacity-20" />
              <p>Belum ada data nilai ujian yang memadai.</p>
            </div>
          )}
        </div>

        {/* At-Risk Students Early Warning System */}
        <div className="card-ai p-0 overflow-hidden flex flex-col">
          <div className="p-6 pb-4 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
            <div>
              <h3 className="text-xl font-bold text-danger flex items-center gap-2">
                <AlertTriangle size={24} className="animate-pulse" />
                Early Warning System
              </h3>
              <p className="text-sm text-red-600/70 mt-1">Siswa dengan rata-rata nilai &lt; 70</p>
            </div>
            <div className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">
              {atRiskStudents.length} Terdeteksi
            </div>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[400px]">
            {atRiskStudents.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 sticky top-0 uppercase">
                  <tr>
                    <th scope="col" className="px-6 py-3 rounded-tl-lg">Siswa</th>
                    <th scope="col" className="px-6 py-3 text-center">Rata-rata</th>
                    <th scope="col" className="px-6 py-3 text-center">Ujian Diikuti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {atRiskStudents.map((student) => (
                    <tr key={student.nis} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs ring-2 ring-red-50">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 line-clamp-1">{student.name}</p>
                            <p className="text-xs text-gray-500">NIS: {student.nis}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-danger/10 text-danger rounded">
                          {student.avgScore}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {student.examsTaken}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 p-8">
                <CheckCircle size={48} className="text-success mb-4 opacity-50" />
                <p className="font-medium text-gray-600">Luar biasa!</p>
                <p className="text-sm text-center mt-2 max-w-sm">
                  Saat ini tidak ada siswa yang berada di bawah standar kelulusan rata-rata.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
