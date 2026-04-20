
# ZonaVetsaNext - Portal Digital 

<p align="center">
  <img src="public/gambar/favicon-32x32.png" alt="ZonaVetsa Logo" width="64" height="64" />
  <br>
  <b>Portal Digital SMK Veteran 1 Sukoharjo</b>
</p>

---

## 📋 Deskripsi

ZonaVetsa adalah aplikasi portal digital untuk sekolah berbasis Next.js yang dirancang untuk memudahkan akses pembelajaran, manajemen tugas, absensi, dan ujian secara online.

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Deployment**: Vercel

## ✨ Fitur Utama

### 👨‍🎓 Dashboard Siswa
- 📚 Akses materi dan file dari guru
- 📝 Mengumpulkan tugas
- 📋 Melihat jadwal dan mengikuti ujian online
- ✅ Absensi QR Code
- 👤 Profil dan pengaturan

### 👨‍🏫 Dashboard Guru
- 📁 Upload dan manajemen file/materi
- 📝 Membuat dan mengelola tugas
- 📋 Membuat dan mengelola ujian online
- 📊 Melihat hasil ujian dan nilai siswa
- ✅ Membuat QR Code absensi
- 👤 Profil dan pengaturan

### ⚙️ Dashboard Admin
- 👥 Manajemen data guru dan siswa
- 🏫 Manajemen kelas
- 📁 File manager
- 📊 Log aktivitas
- ⚙️ Pengaturan sistem

## 🚀 Cara Install dan Menjalankan

### Prerequisites
- Node.js 18+
- npm atau yarn
- Akun Supabase

### Steps

1. **Clone repository**
```bash
git clone https://github.com/your-repo/zonavetsa.git
cd zonavetsa
```

2. **Install dependencies**
```bash
npm install
# atau
yarn install
```

3. **Setup environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` dengan credentials Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Setup database**
```bash
# Apply migrations atau import schema.sql ke Supabase
# File: supabase/migrations/001_initial_schema.sql
```

5. **Run development server**
```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## 📁 Struktur Folder

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/          # Dashboard pages (admin, guru, siswa)
│   ├── login/              # Login pages
│   └── ...
├── components/             # Reusable components
│   ├── ui/                 # shadcn/ui components
│   ├── avatar.tsx          # Avatar component
│   ├── theme-toggle.tsx    # Theme toggle
│   └── notification-bell.tsx
├── lib/                    # Utilities
│   ├── supabase.ts         # Supabase client
│   ├── theme.ts            # Theme store
│   ├── notifications.ts    # Notification system
│   └── activity-logger.ts  # Activity logging
├── types/                  # TypeScript types
│   └── index.ts
└── ...
```

## 🔐 Akun Default

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Guru | (dibuat manual di admin) | (sesuai input) |
| Siswa | (dibuat manual di admin) | (sesuai input) |

## 🎨 Tema

Aplikasi mendukung tema Light dan Dark mode dengan tema "Cyber/Liquid Glass" yang modern.

## 📱 PWA Support

Aplikasi mendukung Progressive Web App (PWA) untuk pengalaman seperti aplikasi native di mobile.

## 📄 Lisensi

MIT License

---

## 👨‍💻 Developer

- @Daniekmz

---
this project is for final semester assignments

<p align="center">
  Made with ❤️ by me
</p>

