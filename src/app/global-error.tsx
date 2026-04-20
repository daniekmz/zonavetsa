"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Home, RefreshCw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error ke console untuk debugging
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-school-gradient flex items-center justify-center p-4 relative">
      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative z-10 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={40} className="text-danger" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Terjadi Kesalahan
        </h2>

        {/* Description */}
        <p className="text-gray-500 mb-6">
          Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau hubungi administrator.
        </p>

        {/* Error details (hanya tampil di development) */}
        {process.env.NODE_ENV === "development" && (
          <div className="bg-gray-100 rounded-lg p-3 mb-6 text-left overflow-auto">
            <p className="text-xs text-gray-500 font-mono">
              {error?.message || "Unknown error"}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={() => reset()}
            className="w-full bg-primary hover:bg-primary-light"
          >
            <RefreshCw size={18} className="mr-2" />
            Coba Lagi
          </Button>

          <Link href="/" className="block">
            <Button variant="outline" className="w-full">
              <Home size={18} className="mr-2" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>

        {/* Contact Admin */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            Still having issues? Contact administrator:
          </p>
          <a 
            href="mailto:admin@smkvetsa.sch.id" 
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <Mail size={14} />
            admin@smkvetsa.sch.id
          </a>
        </div>
      </div>
    </div>
  );
}