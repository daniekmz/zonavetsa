# ZonaVetsa - Portal Digital SMK Veteran 1 Sukoharjo

<p align="center">
  <img src="public/gambar/favicon-32x32.png" alt="ZonaVetsa Logo" width="64" height="64" />
  <br>
  <b>Portal Digital SMK Veteran 1 Sukoharjo</b>
</p>

---

## 📋 Deskripsi

ZonaVetsa adalah aplikasi portal digital untuk sekolah berbasis Next.js yang dirancang untuk memudahkan akses pembelajaran, manajemen tugas, absensi, dan ujian secara online. Aplikasi ini dilengkapi dengan asisten AI cerdas untuk membantu produktivitas harian.

*This project is for final semester assignments.*

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **AI Engine**: Google Gemini / OpenRouter (Owl-Alpha)
- **Deployment**: Vercel

## ✨ Fitur Utama

### 🤖 ZonaVetsa AI Assistant (New!)
- **Identity Awareness**: AI mengenali nama, peran (siswa/guru), dan kelas secara otomatis.
- **Markdown & Syntax Highlighting**: Tampilan chat profesional dengan dukungan blok kode.
- **Direct Download**: Unduh contoh kode/file (HTML, CSS, JS, dll) yang dihasilkan AI secara instan.
- **Context Sync**: Riwayat percakapan tersinkronisasi secara otomatis di database.

### 👨‍🎓 Dashboard Siswa
- 📚 Akses materi dan file dari guru sesuai kelas
- 📝 Mengumpulkan tugas harian
- 📋 Mengikuti ujian online (CBT) dengan timer presisi
- ✅ Absensi QR Code praktis
- 🏆 Peringkat dan leaderboard poin siswa

### 👨‍🏫 Dashboard Guru
- 📁 Upload dan manajemen materi terpusat
- 📝 Membuat tugas dan koreksi otomatis
- 📋 Bank soal dan pembuatan ujian online
- 📊 Analitik hasil ujian dan nilai siswa
- ✅ Generate QR Code absensi dinamis

### ⚙️ Dashboard Admin
- 👥 Manajemen data master (Guru, Siswa, Kelas, Jurusan)
- 🏫 Penjadwalan dan pengumuman sekolah
- 📊 Monitoring log aktivitas sistem
- ⚙️ Pengaturan billing dan data akademik

## 🚀 Cara Install dan Menjalankan

### Prerequisites
- Node.js 18+
- Akun Supabase
- API Key Gemini atau OpenRouter (Opsional untuk fitur AI)

### Steps

1. **Clone repository**
```bash
git clone https://github.com/daniekmz/zonavetsa.git
cd zonavetsa
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
Buat file `.env.local` dan isi sesuai kebutuhan:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

4. **Run development server**
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 🎨 Design Aesthetics

Aplikasi menggunakan tema **"Modern Cyber Glass"** dengan dukungan Dark & Light mode. Perpaduan warna Navy, Teal, dan Amber memberikan kesan profesional namun tetap dinamis.

## 📱 PWA Support

Tersedia dukungan PWA (Progressive Web App). Anda bisa menginstal ZonaVetsa langsung ke homescreen smartphone Android/iOS untuk akses yang lebih cepat.

## 📄 Lisensi

MIT License - 2024 © SMK Veteran 1 Sukoharjo

---

## 👨‍💻 Developer

- **@Daniekmz** & **SMK Veteran 1 Sukoharjo**

---

<p align="center">
  Made with ❤️ for SMK Veteran 1 Sukoharjo
</p>
