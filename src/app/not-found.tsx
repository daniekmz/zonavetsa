"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, ArrowLeft, Search, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const router = useRouter();

  // Auto-redirect setelah 5 detik (opsional)
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-school-gradient flex items-center justify-center p-4 relative">
      {/* Background Decorations */}
      <div className="fixed top-[10%] left-[5%] text-white/5 animate-[float_20s_infinite_ease-in-out]">
        <GraduationCap size={80} />
      </div>
      <div className="fixed bottom-[10%] right-[5%] text-white/5 animate-[float_20s_infinite_ease-in-out]">
        <GraduationCap size={80} />
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 text-center">
        {/* 404 Number */}
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-primary opacity-20">404</h1>
        </div>

        {/* Icon */}
        <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search size={40} className="text-warning" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Halaman Tidak Ditemukan
        </h2>

        {/* Description */}
        <p className="text-gray-500 mb-6">
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan. 
          Silakan pilih salah satu opsi di bawah ini.
        </p>

        {/* Auto-redirect notice */}
        <div className="bg-gray-100 rounded-lg p-3 mb-6">
          <p className="text-sm text-gray-600">
            Anda akan diarahkan ke beranda dalam <span className="font-bold text-primary">5 detik</span>...
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link href="/" className="block">
            <Button className="w-full bg-primary hover:bg-primary-light">
              <Home size={18} className="mr-2" />
              Kembali ke Beranda
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/login/siswa">
              <Button variant="outline" className="w-full">
                Login Siswa
              </Button>
            </Link>
            <Link href="/login/guru">
              <Button variant="outline" className="w-full">
                Login Guru
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-white/50 text-sm">
          ZonaVetsa - Sistem Informasi Sekolah
        </p>
      </div>
    </div>
  );
}
