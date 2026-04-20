export function getDailyRotatingCopy(category: "auth" | "teacher" | "admin" | "home" = "auth") {
  const dayIndex = new Date().getDate() % 7;

  const copyMap = {
    auth: [
      "Fokus belajar, satu langkah lebih terarah hari ini.",
      "Masuk dan lanjutkan ritme belajarmu dengan tenang.",
      "Hari baru, progress baru, ruang belajar yang sama.",
      "Mulai dari sini untuk tugas, ujian, dan update kelas.",
      "Akses cepat ke semua aktivitas belajarmu hari ini.",
      "Satu pintu masuk untuk kelas digital yang lebih rapi.",
      "Belajar lebih ringan dengan tampilan yang lebih bersih.",
    ],
    teacher: [
      "Pantau kelas hari ini dengan alur yang lebih ringkas.",
      "Semua kebutuhan mengajar hari ini siap dari satu panel.",
      "Ruang kerja guru dibuat lebih tenang dan fokus.",
      "Buka kelas, cek tugas, dan lanjutkan evaluasi hari ini.",
      "Aktivitas pengajaran hari ini bisa dipantau lebih cepat.",
      "Satu dashboard untuk ritme mengajar yang lebih rapi.",
      "Mulai hari ini dengan panel guru yang lebih ringan.",
    ],
    admin: [
      "Pantau sistem sekolah hari ini dari satu pusat kendali.",
      "Data penting hari ini siap dipantau lebih cepat.",
      "Ruang admin yang lebih rapi untuk keputusan yang lebih tenang.",
      "Kelola pengguna dan sistem sekolah dengan alur yang lebih jelas.",
      "Semua kontrol inti sekolah terkumpul dalam satu panel.",
      "Pantauan harian sistem dibuat lebih mudah dibaca.",
      "Mulai monitoring hari ini dengan dashboard admin yang lebih fokus.",
    ],
    home: [
      "Belajar yang baik dimulai dari rasa ingin tahu yang terus dijaga setiap hari.",
      "Teknologi menjadi bermakna ketika membantu kita memahami sesuatu dengan lebih sederhana.",
      "Satu pengetahuan kecil yang dipelajari hari ini bisa membuka banyak peluang esok hari.",
      "Pembelajaran terbaik lahir dari kebiasaan mencoba, bertanya, lalu memperbaiki.",
      "Di era digital, kemampuan belajar ulang lebih penting daripada sekadar hafalan.",
      "Teknologi bukan hanya alat, tetapi jembatan untuk tumbuh, berkarya, dan berkolaborasi.",
      "Kemajuan sering dimulai dari langkah kecil yang dilakukan konsisten setiap hari.",
    ],
  } as const;

  return copyMap[category][dayIndex];
}
