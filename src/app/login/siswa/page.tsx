"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, GraduationCap, KeyRound } from "lucide-react";
import { loginSiswaSchema, type LoginSiswaInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase";
import { logLogin } from "@/lib/activity-logger";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDailyRotatingCopy } from "@/lib/daily-copy";

export default function LoginSiswaPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSiswaInput>({
    resolver: zodResolver(loginSiswaSchema),
  });

  const onSubmit = async (data: LoginSiswaInput) => {
    setIsLoading(true);
    setError("");
    const supabase = createClient();

    try {
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("nis", data.nis)
        .single();

      if (studentError || !student) {
        setError("NIS tidak ditemukan");
        setIsLoading(false);
        return;
      }

      if (student.password !== data.password) {
        setError("Password salah");
        setIsLoading(false);
        return;
      }

      // Setelah login, siswa diarahkan ke pemilihan guru agar pilihan aktif selalu dikonfirmasi.
      sessionStorage.setItem("studentSession", JSON.stringify({ student, selected: false }));
      await logLogin(student.nis, "siswa");
      router.push("/dashboard/siswa/ganti-guru");
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Portal Siswa"
      title="Masuk ke ruang belajar digital"
      icon={GraduationCap}
      bottomLink={{ href: "/", label: "Kembali ke Beranda" }}
      footerLinks={[
        { href: "/login/guru", label: "Login Guru" },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="nis" className="text-slate-700 dark:text-slate-200">
            NIS
          </Label>
          <Input id="nis" type="text" placeholder="Masukkan NIS Anda" {...register("nis")} />
          {errors.nis ? <p className="text-xs font-medium text-danger">{errors.nis.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-700 dark:text-slate-200">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              {...register("password")}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password ? <p className="text-xs font-medium text-danger">{errors.password.message}</p> : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        ) : null}

        <div className="rounded-[22px] border border-sky-100 bg-sky-50/70 p-4 text-sm font-medium leading-7 text-slate-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-slate-300">
          {getDailyRotatingCopy("auth")}
        </div>

        <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={isLoading}>
          <KeyRound size={18} />
          {isLoading ? "Memverifikasi..." : "Masuk ke Dashboard"}
        </Button>

        <div className="text-center">
          <Link
            href="/login/siswa/lupa-password"
            className="text-sm font-semibold text-slate-500 transition hover:text-primary dark:text-slate-400 dark:hover:text-sky-300"
          >
            Lupa Password?
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
