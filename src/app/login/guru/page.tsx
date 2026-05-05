"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, GraduationCap, IdCard, Lock } from "lucide-react";
import { loginGuruSchema, type LoginGuruInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase";
import { logLogin } from "@/lib/activity-logger";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDailyRotatingCopy } from "@/lib/daily-copy";

export default function LoginGuruPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginGuruInput>({
    resolver: zodResolver(loginGuruSchema),
  });

  const onSubmit = async (data: LoginGuruInput) => {
    setIsLoading(true);
    setError("");
    const supabase = createClient();

    try {
      const { data: teacher, error: teacherError } = await supabase
        .from("teachers")
        .select("*")
        .eq("kode_guru", data.username)
        .single();

      if (teacherError || !teacher) {
        setError("Kode guru tidak ditemukan");
        setIsLoading(false);
        return;
      }

      if (teacher.password !== data.password) {
        setError("Password salah");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem("guruSession", JSON.stringify(teacher));
      await logLogin(teacher.kode_guru, "guru");
      router.push("/dashboard/guru");
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Portal Guru"
      title="Masuk ke control center pengajaran"
      icon={GraduationCap}
      bottomLink={{ href: "/", label: "Kembali ke Beranda" }}
      footerLinks={[
        { href: "/login/siswa", label: "Login Siswa" },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <IdCard size={15} className="text-teal" aria-hidden="true" />
            Username / Kode Guru
          </Label>
          <Input id="username" type="text" placeholder="Masukkan kode guru" {...register("username")} />
          {errors.username ? <p className="text-xs font-medium text-danger">{errors.username.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Lock size={15} className="text-teal" aria-hidden="true" />
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
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-800 hover:text-teal dark:hover:bg-slate-800"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          </div>
          {errors.password ? <p className="text-xs font-medium text-danger">{errors.password.message}</p> : null}
        </div>

        {error ? (
          <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-sm font-medium leading-relaxed text-slate-600 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-slate-300">
          {getDailyRotatingCopy("teacher")}
        </div>

        <Button type="submit" size="lg" className="w-full bg-navy hover:bg-navy-700 text-white border-0" disabled={isLoading}>
          <GraduationCap size={18} aria-hidden="true" />
          {isLoading ? "Memverifikasi..." : "Masuk ke Dashboard Guru"}
        </Button>
      </form>
    </AuthShell>
  );
}
