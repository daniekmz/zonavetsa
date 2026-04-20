"use client";

import { X, Zap, Sparkles, BrainCircuit, Trophy, ShieldCheck, Activity, Smartphone } from "lucide-react";
import { useState, useEffect } from "react";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangelogModal({ isOpen, onClose }: ChangelogModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-800">
        <div className="bg-school-gradient p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-secondary/20 p-2 rounded-lg backdrop-blur-md">
              <Zap size={24} className="text-secondary animate-pulse" />
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
              NEW UPDATE V2.0
            </span>
          </div>
          <h2 className="text-3xl font-bold">Apa yang Baru di ZonaVetsa?</h2>
          <p className="text-white/70 mt-2">
            Kami baru saja merilis pembaruan besar untuk meningkatkan pengalaman belajar Anda!
          </p>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="grid gap-6">
            <ChangelogItem 
              icon={BrainCircuit} 
              title="AI Intelligent Tutor (Gemini)" 
              desc="Siswa kini memiliki asisten AI yang membantu menjelaskan materi tugas tanpa memberikan jawaban langsung (Scaffolding)."
              color="text-secondary"
              bg="bg-secondary/10"
            />
            <ChangelogItem 
              icon={Trophy} 
              title="Sistem Gamifikasi & Leaderboard" 
              desc="Dapatkan poin dari setiap aktivitas dan lihat peringkat Anda di papan klasemen sekolah."
              color="text-yellow-600 dark:text-yellow-400"
              bg="bg-yellow-500/10"
            />
            <ChangelogItem 
              icon={ShieldCheck} 
              title="Ujian Anti-Curang Pro" 
              desc="Sistem deteksi pindah tab, blokir copy-paste, dan pelacakan aktivitas selama ujian berlangsung."
              color="text-primary dark:text-sky-400"
              bg="bg-primary/10"
            />
            <ChangelogItem 
              icon={Activity} 
              title="Guru Analytics & Early Warning" 
              desc="Dashboard khusus guru untuk memantau performa kelas dan mendeteksi siswa yang butuh bantuan ekstra."
              color="text-orange-600 dark:text-orange-400"
              bg="bg-orange-500/10"
            />
            <ChangelogItem 
              icon={Smartphone} 
              title="Aplikasi PWA (Web Terinstall)" 
              desc="ZonaVetsa kini bisa di-install langsung ke HP/Laptop Anda dan diakses lebih cepat dengan mode offline."
              color="text-blue-600 dark:text-blue-400"
              bg="bg-blue-500/10"
            />
            <ChangelogItem 
              icon={Sparkles} 
              title="Desain UI Modern AI" 
              desc="Tampilan baru yang lebih elegan dengan dark mode, animasi canggih, dan desain yang memanjakan mata."
              color="text-secondary"
              bg="bg-secondary/20"
            />
          </div>
        </div>

        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
          <button 
            onClick={onClose}
            className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-light transition-all shadow-lg hover:-translate-y-1"
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
    <div className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
      <div className={`w-12 h-12 shrink-0 rounded-xl ${bg} flex items-center justify-center ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}
