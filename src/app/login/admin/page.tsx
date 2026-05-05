"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, IdCard, Lock, Shield } from "lucide-react";
import { loginAdminSchema, type LoginAdminInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase";
import { logLogin } from "@/lib/activity-logger";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getDailyRotatingCopy } from "@/lib/daily-copy";

export default function LoginAdminPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginAdminInput>({
    resolver: zodResolver(loginAdminSchema),
  });

  const onSubmit = async (data: LoginAdminInput) => {
    setIsLoading(true);
    setError("");
    const supabase = createClient();

    try {
      const { data: admin, error: adminError } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", data.username)
        .eq("role", "admin")
        .single();

      if (adminError || !admin) {
        setError("Username admin tidak ditemukan");
        setIsLoading(false);
        return;
      }

      if (admin.password !== data.password) {
        setError("Password salah");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem("adminSession", JSON.stringify(admin));
      await logLogin(admin.username, "admin");
      router.push("/dashboard/admin");
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Portal Admin"
      title="Masuk ke panel administrator"
      description="Halaman ini aktif melalui URL langsung dan tidak ditampilkan di area publik."
      icon={Shield}
      bottomLink={{ href: "/", label: "Kembali ke Beranda" }}
      footerLinks={[
        { href: "/login/siswa", label: "Login Siswa" },
        { href: "/login/guru", label: "Login Guru" },
      ]}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="username" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <IdCard size={15} className="text-amber" aria-hidden="true" />
            Username Admin
          </Label>
          <Input id="username" type="text" placeholder="Masukkan username admin" {...register("username")} />
          {errors.username ? <p className="text-xs font-medium text-danger">{errors.username.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <Lock size={15} className="text-amber" aria-hidden="true" />
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
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 dark:bg-slate-800 hover:text-amber dark:hover:bg-slate-800"
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

        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-sm font-medium leading-relaxed text-slate-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-slate-300">
          {getDailyRotatingCopy("admin")}
        </div>

        <Button type="submit" size="lg" className="w-full bg-amber hover:bg-amber-600 text-white border-0" disabled={isLoading}>
          <Shield size={18} aria-hidden="true" />
          {isLoading ? "Memverifikasi..." : "Masuk ke Dashboard Admin"}
        </Button>
      </form>
    </AuthShell>
  );
}
