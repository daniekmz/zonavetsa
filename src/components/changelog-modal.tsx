"use client";

import { X, Zap, Megaphone, Building2, School, LayoutTemplate, ShieldCheck } from "lucide-react";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-card w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
        <div className="bg-navy p-8 text-white relative">
          <button 
            onClick={onClose}
             className="absolute top-4 right-4 p-2 hover:bg-white/20 dark:hover:bg-slate-800/50 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber/20 p-2 rounded-lg backdrop-blur-md">
              <Zap size={24} className="text-amber animate-pulse" />
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
              NEW UPDATE V3.4
            </span>
          </div>
          <h2 className="text-3xl font-bold">Apa yang Baru di ZonaVetsa?</h2>
          <p className="text-white/80 mt-2">
            Pembaruan mutakhir (Patch 3.4) menghadirkan sistem pengumuman terpusat dari guru dan admin untuk siswa.
          </p>
        </div>

        <div className="p-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
          <div className="grid gap-6">
            <ChangelogItem 
              icon={Megaphone} 
              title="Feed Pengumuman Siswa Sudah Live" 
              desc="Menu Pengumuman siswa kini menampilkan pengumuman aktif dari guru dan admin langsung dari database, lengkap dengan prioritas pin, target kelas, dan notifikasi masuk."
              color="text-teal dark:text-teal-400"
              bg="bg-teal/10"
            />
            <ChangelogItem 
              icon={School} 
              title="Guru Bisa Kirim Pengumuman" 
              desc="Guru sekarang mendapat halaman khusus untuk membuat pengumuman siswa, memilih semua kelas atau kelas tertentu, lalu mengatur status aktif, pin, dan masa berlaku."
              color="text-sky-600 dark:text-sky-400"
              bg="bg-sky-500/10"
            />
            <ChangelogItem 
              icon={Building2} 
              title="Admin Punya Pengumuman Resmi" 
              desc="Panel admin kini menyediakan halaman pengumuman resmi sekolah yang dapat diarahkan ke semua siswa atau kelas tertentu lewat dashboard."
              color="text-amber dark:text-amber-400"
              bg="bg-amber/10"
            />
            <ChangelogItem 
              icon={LayoutTemplate} 
              title="Menu Dashboard Ikut Disambungkan" 
              desc="Sidebar guru dan admin serta shortcut cepat admin overview diperbarui agar akses ke halaman pengumuman lebih cepat dan rapi."
              color="text-indigo-600 dark:text-indigo-400"
              bg="bg-indigo-500/10"
            />
            <ChangelogItem 
              icon={ShieldCheck} 
              title="Database Announcement Ditambahkan" 
              desc="Skema database kini memiliki tabel announcements, trigger updated_at, dukungan realtime, dan tipe notifikasi announcement agar pengumuman tersambung ke lonceng notifikasi siswa."
              color="text-slate-600 dark:text-slate-400"
              bg="bg-slate-500/10"
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-navy text-white px-8 py-3 rounded-xl font-bold hover:bg-navy-700 transition-all shadow-md hover:-translate-y-1"
          >
            Siap, Mulai Jelajahi!
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangelogItem({ icon: Icon, title, desc, color, bg }: any) {
  return (
    <div className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:border-slate-800 dark:hover:border-slate-800">
      <div className={`w-12 h-12 shrink-0 rounded-xl ${bg} flex items-center justify-center ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <h3 className="font-bold text-navy dark:text-white">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}
