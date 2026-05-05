"use client";

import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, ChevronRight, History } from "lucide-react";
import Link from "next/link";

const changelogData = [
  {
    version: "Patch v3.5",
    title: "Optimasi SEO, UI/UX, & Stabilitas Ujian",
    items: [
      "Optimalisasi SEO Skala Penuh: Penerapan 'School' JSON-LD, pembersihan sitemap.xml, perbaikan robots.txt, dan penyematan deskripsi meta komprehensif untuk pengindeksan Google.",
      "GenerateMetadata Dinamis: URL karya siswa kini memiliki OpenGraph/Twitter Cards yang otomatis menampilkan gambar karya dan nama pembuat ketika link dibagikan.",
      "Perbaikan Krusial Ujian: Menyelesaikan isu auto-submit waktu habis dengan useRef untuk mencegah pengiriman berulang, serta menghilangkan rendering opsi ganda kosong.",
      "ZonaVetsa AI (OpenRouter): Implementasi asisten cerdas yang kini menggunakan model Owl-Alpha via OpenRouter untuk respon yang lebih cepat dan stabil.",
      "Personalisasi & Deteksi Profil: AI kini otomatis mengenali identitas, nama, dan kelas pengguna saat login untuk bantuan yang lebih personal.",
      "Animasi UI Premium: Penambahan typing indicator, animasi pesan Framer Motion, dan notifikasi bantuan proaktif.",
      "Optimasi Respon: Instruksi AI diatur agar memberikan jawaban yang langsung, ringkas, dan to-the-point.",
      "Rilis Halaman Changelog: Merilis UI timeline catatan pembaruan publik (halaman ini) yang menampilkan transparansi ekosistem web sekolah.",
    ],
  },
  {
    version: "Patch v3.4",
    title: "Pengumuman Siswa, Guru, dan Admin",
    items: [
      "Feed Pengumuman Siswa dari Database: Menu Pengumuman pada dashboard siswa sekarang menampilkan pengumuman aktif dari guru dan admin, lengkap dengan filter target siswa dan target kelas.",
      "Input Pengumuman untuk Guru: Guru kini memiliki menu khusus untuk membuat pengumuman baru, memilih target semua kelas atau kelas tertentu, memberi pin, mengatur status aktif, serta masa berlaku pengumuman.",
      "Input Pengumuman untuk Admin: Admin juga mendapat halaman pengumuman untuk membuat informasi resmi sekolah yang bisa diarahkan ke semua siswa atau kelas tertentu.",
      "Pengumuman Masuk ke Notifikasi Siswa: Saat guru atau admin membuat pengumuman, siswa target sekarang langsung menerima notifikasi realtime di lonceng notifikasi dengan tautan menuju menu pengumuman.",
    ],
  },
  {
    version: "Patch v3.3",
    title: "Link Publik HTML untuk Galeri Karya",
    items: [
      "Route Langsung untuk index.html: File HTML yang diupload dari menu siswa pada Galeri Karya sekarang otomatis mendapat public_slug unik sehingga bisa dibuka langsung lewat link.",
      "Copy Link Otomatis & Manual: Sistem mencoba langsung menyalin link publik ke clipboard setelah upload berhasil.",
      "Banyak HTML per Siswa Tetap Aman: Jika satu siswa mengupload beberapa file index.html, setiap karya akan memperoleh slug unik berurutan.",
      "Preview Web Asli untuk HTML/CSS/JS: Halaman publik berbasis slug kini merender konten HTML, CSS, dan JavaScript inline sebagai preview web aktif.",
    ],
  },
  {
    version: "Patch v3.2",
    title: "Refactor UI/UX Menu Ujian Guru & Siswa",
    items: [
      "Refactor Tata Letak Ujian Guru: Menu ujian pada dashboard guru diperbarui dengan pola Aksi Cepat dan Fungsi Lain agar pilihan tombol lebih terarah.",
      "Validasi Konfirmasi Submit Siswa: Sebelum muncul dialog konfirmasi pengiriman, sistem sekarang memeriksa soal kosong terlebih dahulu.",
      "Auto-Arah ke Soal Belum Terjawab: Jika masih ada jawaban kosong, siswa langsung diarahkan ke nomor soal pertama yang belum diisi beserta notifikasi.",
    ],
  },
  {
    version: "Patch v3.1",
    title: "Restorasi File Manager & Penyempurnaan Dark Mode",
    items: [
      "Fokus Ulang File Manager: Dasbor siswa direstorasi kembali untuk memfokuskan pengelolaan materi belajar dari File Manager.",
      "Sapu Bersih Dark Mode: Modifikasi pada lebih dari 80 komponen .tsx untuk membatalkan radial gradient background putih dan menyempurnakan mode malam.",
      "Standarisasi Kontras Komponen Web: Menu-menu yang elemen formulirnya belum patuh tema gelap kini sudah diperkokoh.",
    ],
  },
  {
    version: "Major Update",
    title: "Refactor UI/UX Menyeluruh & SEO",
    items: [
      "Desain Sistem Baru: Tema sekolah modern dengan skema warna dominan Navy, Teal, dan Amber.",
      "Navigasi Dashboard Baru: Sidebar mendukung status aktif berbasis bg-navy-50 ber-border teal.",
      "Standarisasi Ikonografi: Semua icon dimigrasikan penuh menjadi Lucide Icons.",
      "SEO Sharing & Sitemap: Metadata SEO untuk web diperbarui dengan Open Graph/Twitter Card dan file sitemap.xml otomatis.",
    ],
  },
  {
    version: "Feature Update",
    title: "Galeri Karya & Sistem Komentar Terstruktur",
    items: [
      "Galeri Karya Publik: Pengganti E-Portofolio di mana siswa dapat memamerkan proyek dengan cakupan Kelas atau Global.",
      "Sistem Interaksi: Menambahkan fungsionalitas Like dan Komentar pada setiap portofolio secara terstruktur dengan sistem moderasi guru.",
      "Integrasi Sistem Poin: Upload karya (+15 poin), menerima/memberi like & komentar akan berkontribusi langsung pada Leaderboard siswa.",
    ],
  },
  {
    version: "Core Security",
    title: "Keamanan & Integritas Ujian (Anti-Cheating)",
    items: [
      "Deteksi Fokus Layar: Jika siswa berpindah tab/jendela, ujian akan memberikan peringatan tajam.",
      "Sistem Perlindungan Konten: Pemblokiran klik kanan dan shortcut copy/paste (Ctrl+C, Ctrl+V, dll).",
      "Sistem Penyortiran Acak: Penambahan mode shuffle questions dan shuffle options untuk menyulitkan berbagi kunci jawaban.",
    ],
  },
  {
    version: "AI Integration",
    title: "Tutor & Asisten AI Generatif",
    items: [
      "Integrasi SDK Google Gemini: Menggunakan model gemini-1.5-flash untuk membedakan role bimbingan Guru dan Siswa.",
      "Siswa menerima scaffolding (bimbingan tanpa memberi jawaban instan), sementara Guru menerima ringkasan kelas dan asisten pembuat soal ujian.",
    ],
  },
  {
    version: "System Upgrade",
    title: "Modul PWA & Analitik Guru",
    items: [
      "Instalasi next-pwa: Menghasilkan Service Worker agar ZonaVetsa bisa di-install langsung layaknya aplikasi native Android / iOS.",
      "Alat Analitik Khusus Guru: Integrasi pustaka visualisasi grafik recharts untuk log data performa kelas.",
      "Early Warning System: Algoritma penyeleksi siswa (disorot merah) yang memiliki agregat nilai ujian rata-rata di bawah standar.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ━━ Header ━━ */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-500">
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <BrandMark />
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* ━━ Hero Section ━━ */}
      <div className="border-b border-slate-200 bg-white px-4 py-12 dark:border-slate-800 dark:bg-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal dark:bg-teal-900/30 dark:text-teal-400">
            <History size={32} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Changelog ZonaVetsa
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            Catatan rilis dan riwayat pembaruan sistem dari awal pembuatan hingga versi terbaru yang digunakan saat ini.
          </p>
        </div>
      </div>

      {/* ━━ Timeline Content ━━ */}
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="relative border-l border-slate-200 dark:border-slate-800 ml-4 md:ml-0 md:border-l-0">
          
          {/* Garis tengah vertikal untuk desktop */}
          <div className="absolute left-1/2 top-0 bottom-0 hidden w-px bg-slate-200 dark:bg-slate-800 md:block" />

          {changelogData.map((release, index) => (
            <div
              key={index}
              className={`relative mb-12 flex flex-col md:flex-row ${
                index % 2 === 0 ? "md:flex-row-reverse" : ""
              } group`}
            >
              {/* Timeline Dot */}
              <div className="absolute -left-[21px] top-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-slate-50 bg-white shadow-sm dark:border-slate-950 dark:bg-slate-900 md:left-1/2 md:-ml-[20px]">
                <div className="h-3 w-3 rounded-full bg-teal" />
              </div>

              {/* Content Card */}
              <div className="ml-8 md:ml-0 md:w-1/2 md:px-10">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy dark:bg-navy-900/50 dark:text-navy-200">
                      {release.version}
                    </span>
                  </div>
                  <h3 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
                    {release.title}
                  </h3>
                  
                  <ul className="space-y-3">
                    {release.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-500" />
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ━━ Footer ━━ */}
      <footer className="border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <BrandMark />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} ZonaVetsa by SMK Veteran 1 Sukoharjo.
          </p>
        </div>
      </footer>
    </div>
  );
}
