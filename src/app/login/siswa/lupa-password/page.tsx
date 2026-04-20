"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, ArrowLeft, KeyRound, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LupaPasswordPage() {
  const router = useRouter();
  const [nis, setNis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nis.trim()) {
      setError("NIS wajib diisi");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/siswa/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nis: nis.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Terjadi kesalahan");
        setIsLoading(false);
        return;
      }

      setNewPassword(data.newPassword);
      setStudentName(data.studentName);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    router.push("/login/siswa");
  };

  if (newPassword) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-gradient-to-br from-slate-50 via-slate-100 to-white dark:from-primary dark:via-primary-dark dark:to-slate-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
        {/* Theme Toggle Corner */}
        <div className="absolute top-6 right-6 z-50">
          <ThemeToggle />
        </div>

        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,43,91,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,43,91,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />

        <div className="w-full max-w-md relative z-10">
          <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/90 shadow-2xl shadow-slate-200/50 dark:shadow-primary/20 transition-all duration-300">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <img
                  src="/gambar/favicon-32x32.png"
                  alt="Logo"
                  className="w-16 h-16 drop-shadow-2xl"
                />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ZONA<span className="text-secondary">VETSA</span></h1>
              <p className="text-slate-500 dark:text-secondary text-xs font-bold uppercase tracking-widest mt-1">SMK VETERAN 1 SUKOHARJO</p>
            </div>

            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-green-500/10 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/20">
                <CheckCircle size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">Password Di-reset!</h2>
              <p className="text-slate-500 dark:text-white/60 text-sm">Berikut password baru untuk <span className="font-bold text-slate-900 dark:text-white">{studentName}</span>:</p>
            </div>

            <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-6 mb-6 border border-slate-200 dark:border-slate-800/80 ring-4 ring-slate-50 dark:ring-slate-800/50">
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-white/20 mb-2 text-center">Temporary Password</p>
              <p className="text-3xl font-black text-center text-primary dark:text-secondary font-mono tracking-wider">
                {newPassword}
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 mb-8">
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Simpan password ini baik-baik. Gunakan untuk login pertama kali dan segera ganti di menu profil.
                </p>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              variant="secondary"
              className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-secondary/20 hover:shadow-secondary/40 transition-all active:scale-[0.98]"
            >
              Coba Login Sekarang
            </Button>

            <Link href="/login/siswa">
              <Button variant="ghost" className="w-full mt-4 text-slate-500 dark:text-white/60 hover:text-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700/70 h-11">
                <ArrowLeft size={16} className="mr-2" />
                Kembali ke Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 bg-gradient-to-br from-slate-50 via-slate-100 to-white dark:from-primary dark:via-primary-dark dark:to-slate-900 flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      {/* Theme Toggle Corner */}
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,43,91,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,43,91,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      
      {/* Background Decorations */}
      <div className="fixed top-[10%] left-[5%] text-primary/5 dark:text-white/5 animate-float pointer-events-none">
        <GraduationCap size={120} />
      </div>
      <div className="fixed bottom-[10%] right-[5%] text-primary/5 dark:text-white/5 animate-float pointer-events-none" style={{ animationDelay: '3s' }}>
        <GraduationCap size={120} />
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/90 shadow-2xl shadow-slate-200/50 dark:shadow-primary/20 transition-all duration-300">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
              <img
                src="/gambar/favicon-32x32.png"
                alt="Logo"
                className="w-16 h-16 drop-shadow-2xl"
              />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ZONA<span className="text-secondary">VETSA</span></h1>
            <p className="text-slate-500 dark:text-secondary text-xs font-bold uppercase tracking-widest mt-1">SMK VETERAN 1 SUKOHARJO</p>
          </div>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-primary/5 dark:bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/10">
              <KeyRound size={40} className="text-primary dark:text-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Lupa Password?</h2>
            <p className="text-slate-500 dark:text-white/60 text-sm">Masukkan NIS Anda untuk melakukan reset sistem</p>
          </div>

          <form onSubmit={handleReset} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nis" className="text-slate-700 dark:text-white/90 font-semibold text-sm ml-1">NIS Siswa</Label>
              <Input
                id="nis"
                type="text"
                placeholder="Masukkan Nomor Induk Siswa"
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                className={`h-12 bg-white dark:bg-white/5 border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:ring-2 focus:ring-secondary/20 transition-all rounded-xl ${error ? "border-danger" : ""}`}
              />
              {error && (
                <p className="text-danger text-xs font-medium ml-1">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-secondary/20 hover:shadow-secondary/40 transition-all active:scale-[0.98]"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Memproses...
                </span>
              ) : "Reset Akun Sekarang"}
            </Button>
          </form>

          <Link href="/login/siswa">
            <Button variant="ghost" className="w-full mt-6 text-slate-500 dark:text-white/60 hover:text-primary dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700/70 h-11">
              <ArrowLeft size={16} className="mr-2" />
              Kembali ke Login
            </Button>
          </Link>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/90">
            <p className="text-center text-slate-400 dark:text-white/30 text-xs font-medium">
              Jika NIS tidak ditemukan, silakan hubungi <span className="text-secondary font-bold">Administrator Sekolah</span> untuk verifikasi data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
