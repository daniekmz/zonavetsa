"use client";

import DashboardStudentExamPage from "@/app/dashboard/siswa/ujian/[examId]/page";

export default function StandaloneStudentExamPage({ params }: { params: { examId: string } }) {
  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl">
        <DashboardStudentExamPage params={params} />
      </div>
    </main>
  );
}
