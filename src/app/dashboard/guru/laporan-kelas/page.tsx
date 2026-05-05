/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   [NEW] Laporan Kelas (Guru)
   Menampilkan ringkasan kehadiran & performa tiap kelas.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
"use client";

import { BarChart2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LaporanKelasPage() {
  const classes = [
    { name: "X RPL 1", totalStudents: 32, attendanceAvg: 95, avgScore: 82 },
    { name: "X RPL 2", totalStudents: 30, attendanceAvg: 88, avgScore: 75 },
    { name: "XI RPL 1", totalStudents: 34, attendanceAvg: 92, avgScore: 85 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-navy dark:text-white">Laporan Kelas</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Ringkasan persentase kehadiran dan rata-rata nilai kelas yang Anda ampu.
          </p>
        </div>
        <Button variant="outline" className="w-fit">
          Download PDF
        </Button>
      </div>

      <div className="grid gap-5">
        {classes.map((cls) => (
          <div key={cls.name} className="flex flex-col gap-6 rounded-2xl border bg-white dark:bg-slate-900 p-5 shadow-card sm:flex-row sm:items-center dark:bg-card dark:border-slate-800">
            {/* Class Info */}
            <div className="sm:w-1/4">
              <h3 className="text-lg font-bold text-navy dark:text-white">{cls.name}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{cls.totalStudents} Siswa Aktif</p>
            </div>

            {/* Metrics */}
            <div className="flex flex-1 gap-4 divide-x dark:divide-slate-800">
              <div className="flex-1 px-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rata-rata Kehadiran</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-bold text-teal dark:text-teal-400">{cls.attendanceAvg}%</span>
                  {cls.attendanceAvg > 90 ? (
                    <CheckCircle2 size={16} className="mb-1 text-teal" />
                  ) : (
                     <AlertTriangle size={16} className="mb-1 text-amber" />
                  )}
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-teal" style={{ width: `${cls.attendanceAvg}%` }} />
                </div>
              </div>

              <div className="flex-1 pl-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rata-rata Nilai/Tugas</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-bold text-navy dark:text-white">{cls.avgScore}</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-navy/60" style={{ width: `${cls.avgScore}%` }} />
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="sm:w-32 sm:text-right">
              <Button variant="ghost" className="text-teal hover:text-navy hover:bg-teal-50">
                Lihat Detail
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
