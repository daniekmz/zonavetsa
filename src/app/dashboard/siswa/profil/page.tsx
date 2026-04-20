"use client";

import { useState, useEffect } from "react";
import imageCompression from "browser-image-compression";
import { Camera, User, Mail, Phone, Book, Hash, Save, KeyRound, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { Student } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { Avatar } from "@/components/avatar";


export default function StudentProfilePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  useEffect(() => {
    const sessionData = sessionStorage.getItem("studentSession");
    if (sessionData) {
      const { student: studentData } = JSON.parse(sessionData);
      setStudent(studentData);
      if (studentData.avatar_url) {
        setAvatarPreview(studentData.avatar_url);
        setOriginalAvatar(studentData.avatar_url);
      }
    }
  }, []);



  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast("Pilih file gambar", "error");
      return;
    }

    try {
      // Compress image to max 1MB
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };

      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();

      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };

      reader.readAsDataURL(compressedFile);

      // Show success message about compression
      const originalSize = (file.size / 1024 / 1024).toFixed(2);
      const compressedSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      toast(
        `Gambar dikompres dari ${originalSize}MB ke ${compressedSize}MB`,
        "success"
      );
    } catch (error) {
      console.error("Compression error:", error);
      toast("Gagal memproses gambar", "error");
    }
  };

  const handleSaveProfile = async () => {
    if (!student) return;

    setIsLoading(true);
    const supabase = createClient();

    try {
      let avatarUrl = student.avatar_url;

      // Upload new avatar if changed
      if (avatarPreview && avatarPreview !== originalAvatar) {
        const formData = new FormData();
        const response = await fetch(avatarPreview);
        const blob = await response.blob();
        const file = new File([blob], `avatar-${student.nis}.jpg`, {
          type: "image/jpeg",
        });

        const fileName = `${student.nis}-${Date.now()}.jpg`;

        const { data, error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        avatarUrl = urlData.publicUrl;
      }

      // Update student profile
      const { error: updateError } = await supabase
        .from("students")
        .update({ avatar_url: avatarUrl })
        .eq("nis", student.nis);

      if (updateError) {
        throw updateError;
      }

      // Update session
      const sessionData = sessionStorage.getItem("studentSession");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.student.avatar_url = avatarUrl;
        sessionStorage.setItem("studentSession", JSON.stringify(parsed));
      }

      toast("Profil berhasil diperbarui", "success");
    } catch (error) {
      console.error("Save error:", error);
      toast("Gagal menyimpan profil", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!student) return;

    const { currentPassword, newPassword, confirmPassword } = passwordForm;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast("Lengkapi semua field password", "error");
      return;
    }

    if (newPassword.length < 6) {
      toast("Password baru minimal 6 karakter", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast("Konfirmasi password baru tidak cocok", "error");
      return;
    }

    setIsChangingPassword(true);
    const supabase = createClient();

    try {
      const { data: currentStudent, error: fetchError } = await supabase
        .from("students")
        .select("password")
        .eq("nis", student.nis)
        .single();

      if (fetchError || !currentStudent) {
        throw fetchError;
      }

      if (currentStudent.password !== currentPassword) {
        toast("Password saat ini tidak sesuai", "error");
        setIsChangingPassword(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("students")
        .update({ password: newPassword })
        .eq("nis", student.nis);

      if (updateError) {
        throw updateError;
      }

      const updatedStudent = { ...student, password: newPassword };
      setStudent(updatedStudent);

      const sessionData = sessionStorage.getItem("studentSession");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.student.password = newPassword;
        sessionStorage.setItem("studentSession", JSON.stringify(parsed));
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast("Password berhasil diperbarui", "success");
    } catch (error) {
      console.error("Password update error:", error);
      toast("Gagal memperbarui password", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (!student) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Profil Saya</h2>
          <p className="text-gray-500">Kelola informasi profil Anda</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Avatar Section */}
        <div className="md:col-span-1">
          <div className="card text-center">
            <div className="relative inline-block mb-4">
              <Avatar src={avatarPreview} name={student?.name} size="xl" className="w-32 h-32" />
              <label className="absolute bottom-0 right-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center cursor-pointer hover:bg-secondary-light transition-colors shadow-lg">
                <Camera size={18} className="text-primary" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <h3 className="font-bold text-lg text-gray-800">{student.name}</h3>
            <p className="text-gray-500 text-sm">Siswa</p>
            <p className="text-xs text-gray-400 mt-2">
              * Foto akan dikompres otomatis maks 1MB
            </p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-xl p-6 shadow-sm dark:bg-slate-900/80 dark:border dark:border-slate-800">
            <h3 className="font-semibold text-gray-800 mb-4">
              Informasi Pribadi
            </h3>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Lengkap</Label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      id="name"
                      value={student.name || ""}
                      onChange={(e) =>
                        setStudent({ ...student, name: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nis">NIS</Label>
                  <div className="relative">
                    <Hash
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      id="nis"
                      value={student.nis || ""}
                      disabled
                      className="pl-10 bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      id="email"
                      type="email"
                      value={student.email || ""}
                      onChange={(e) =>
                        setStudent({ ...student, email: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">No. Telepon</Label>
                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <Input
                      id="phone"
                      value={student.phone || ""}
                      onChange={(e) =>
                        setStudent({ ...student, phone: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Kelas</Label>
                <div className="relative">
                  <Book
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <Input
                    id="class"
                    value={student.last_class_id || ""}
                    disabled
                    className="pl-10 bg-gray-50"
                  />
                </div>
              </div>



              <div className="pt-4">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary-light"
                >
                  <Save size={18} />
                  {isLoading ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-xl p-6 shadow-sm dark:bg-slate-900/80 dark:border dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-primary dark:bg-slate-800 dark:text-sky-300">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-slate-100">Ganti Password</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Masukkan password saat ini, lalu ulangi password baru untuk konfirmasi.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="student-current-password">Password Saat Ini</Label>
                <div className="relative">
                  <Input
                    id="student-current-password"
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
                    }
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                  >
                    {showPasswords.current ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student-new-password">Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="student-new-password"
                      type={showPasswords.next ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                      }
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, next: !showPasswords.next })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                    >
                      {showPasswords.next ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student-confirm-password">Ulangi Password Baru</Label>
                  <div className="relative">
                    <Input
                      id="student-confirm-password"
                      type={showPasswords.confirm ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                      }
                      className="pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                    >
                      {showPasswords.confirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="bg-primary hover:bg-primary-light"
              >
                <KeyRound size={18} />
                {isChangingPassword ? "Memperbarui Password..." : "Simpan Password Baru"}
              </Button>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
