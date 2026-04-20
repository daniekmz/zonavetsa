# ZonaVetsa Next.js - Setup Guide

## Prasyarat

- Node.js 18+ terinstall
- Akun Supabase (https://supabase.com)
- Akun Vercel (https://vercel.com) - Opsional untuk deployment

---

## Bagian 1: Setup Supabase

### 1.1 Buat Project Supabase Baru

1. Buka https://supabase.com dan login
2. Klik **"New Project"**
3. Isi informasi project:
   - **Organization**: Pilih organisasi Anda
   - **Name**: `zona-vetsa` atau sesuai keinginan
   - **Database Region**: Pilih region terdekat (misal: Southeast Asia - Singapore)
   - **Pricing Plan**: Free (cukup untuk development)

4. Klik **"Create new project"**
5. Tunggu hingga project selesai dibuat (~2 menit)

### 1.2 Dapatkan Kredensial

1. Di dashboard project, buka **Settings** → **API**
2. Copy nilai berikut:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...`
   - **service_role key**: `eyJhbGc...` (JANGAN bagikan!)

### 1.3 Setup Database Schema

1. Buka **SQL Editor** di sidebar kiri
2. Copy seluruh isi file `supabase/migrations/001_initial_schema.sql`
3. Paste ke SQL Editor
4. Klik **"Run"** untuk execute

### 1.4 Setup Storage

1. Buka **Storage** di sidebar kiri
2. Buat bucket baru:
   - Klik **"New bucket"**
   - Name: `avatars`
   - Public: ✅ (centang)
3. Buat bucket kedua:
   - Klik **"New bucket"**
   - Name: `files`
   - Public: ✅ (centang)

### 1.5 Enable Email Auth (Optional)

1. Buka **Authentication** → **Providers**
2. Pastikan **Email** enabled
3. Jika ingin custom SMTP:
   - Buka **Authentication** → **SMTP Settings**
   - Konfigurasi sesuai provider Anda

---

## Bagian 2: Setup Project Next.js

### 2.1 Clone/Download Project

```bash
# Jika menggunakan git
git clone <repo-url> zona-vetsa-next
cd zona-vetsa-next

# Atau extract file ZIP yang sudah didownload
```

### 2.2 Install Dependencies

```bash
npm install
```

### 2.3 Setup Environment Variables

Buat file `.env.local` di root project:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Cara mendapatkan nilai:**

1. Buka Supabase Dashboard → Settings → API
2. Project URL → untuk `NEXT_PUBLIC_SUPABASE_URL`
3. anon public → untuk `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. service_role → untuk `SUPABASE_SERVICE_ROLE_KEY`

### 2.4 Jalankan Development Server

```bash
npm run dev
```

Buka http://localhost:3000 di browser.

---

## Bagian 3: Setup Vercel Deployment

### 3.1 Login Vercel

1. Buka https://vercel.com
2. Login dengan GitHub/GitLab/Email

### 3.2 Import Project

1. Klik **"Add New..."** → **Project**
2. Pilih repository Git atau upload langsung
3. Klik **"Import"**

### 3.3 Configure Environment Variables

1. Di halaman project settings, scroll ke **Environment Variables**
2. Tambahkan variabel berikut:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL dari Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key dari Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key dari Supabase |
| `NEXT_PUBLIC_APP_URL` | URL Vercel Anda |

3. Klik **"Save"**

### 3.4 Deploy

1. Klik **"Deploy"**
2. Tunggu hingga deployment selesai (~3-5 menit)
3. URL production: `https://your-project.vercel.app`

---

## Bagian 4: Setup Data Awal

### 4.1 Buat Admin Pertama

Jalankan SQL berikut di Supabase SQL Editor:

```sql
-- Insert admin profile
INSERT INTO profiles (id, role, name, password_hash)
VALUES (
    gen_random_uuid(),
    'admin',
    'Administrator',
    'admin123'
);
```

### 4.2 Buat Guru Pertama

```sql
-- Insert teacher
INSERT INTO teachers (kode_guru, name, password_hash, subject)
VALUES (
    'G001',
    'Budi Santoso, S.Pd.',
    'password123',
    'Teknik Komputer Jaringan'
);
```

### 4.3 Buat Kelas

```sql
-- Insert classes
INSERT INTO classes (name, walikelas_id)
VALUES
    ('X TKJ 1', NULL),
    ('X TKJ 2', NULL),
    ('XI TKJ 1', NULL),
    ('XII TKJ 1', NULL);
```

### 4.4 Update Walikelas

```sql
-- Update walikelas (ganti 'teacher-uuid' dengan UUID guru yang sudah dibuat)
UPDATE classes SET walikelas_id = 'teacher-uuid' WHERE name = 'X TKJ 1';
```

### 4.5 Buat Siswa Contoh

```sql
-- Insert student
INSERT INTO students (nis, name, class_id, password_hash)
VALUES (
    '2024001',
    'Ahmad Fauzi',
    'class-uuid',
    'password123'
);
```

---

## Bagian 5: Struktur Project

```
zona-vetsa-next/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth routes (gruped)
│   │   │   └── login/
│   │   │       ├── siswa/       # Login siswa
│   │   │       ├── guru/        # Login guru
│   │   │       └── admin/       # Login admin
│   │   ├── (dashboard)/         # Protected dashboard
│   │   │   ├── siswa/           # Dashboard siswa
│   │   │   ├── guru/            # Dashboard guru
│   │   │   └── admin/           # Panel admin
│   │   ├── api/                 # API routes
│   │   └── page.tsx             # Landing page
│   ├── components/               # React components
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── auth/                # Auth components
│   │   ├── dashboard/           # Dashboard components
│   │   └── attendance/           # QR attendance
│   ├── lib/                     # Utilities
│   ├── stores/                  # Zustand stores
│   └── types/                   # TypeScript types
├── supabase/
│   └── migrations/              # Database migrations
└── public/                      # Static assets
```

---

## Bagian 6: Troubleshooting

### Error: "Cannot connect to Supabase"

1. Cek apakah `NEXT_PUBLIC_SUPABASE_URL` sudah benar
2. Cek apakah project Supabase sudah aktif
3. Coba reload browser

### Error: "Auth session missing"

1. Pastikan cookies enabled di browser
2. Clear browser cache
3. Pastikan tidak ada ad-blocker yang memblokir

### Error: "Storage bucket not found"

1. Buka Supabase → Storage
2. Pastikan bucket `avatars` dan `files` sudah dibuat
3. Pastikan policy sudah di-set

### Error saat deployment Vercel

1. Pastikan semua environment variables sudah di-set di Vercel
2. Cek log deployment untuk error details
3. Pastikan `supabase_service_role_key` tidak Exposure di client-side

---

## Bagian 7: API Reference

### Authentication

```typescript
// Login Siswa
POST /api/auth/login-siswa
Body: { nis: string, password: string }

// Login Guru
POST /api/auth/login-guru
Body: { username: string, password: string }

// Login Admin
POST /api/auth/login-admin
Body: { username: string, password: string }

// Logout
POST /api/auth/logout
```

### Files

```typescript
// Get files
GET /api/files?parent_id=uuid

// Upload file
POST /api/files
Body: FormData (file, name, type, parent_id, description)

// Delete file
DELETE /api/files?id=uuid
```

### Attendance

```typescript
// Generate QR Session
POST /api/attendance/generate
Body: { class_id: string, duration_minutes: number }

// Record Attendance
POST /api/attendance/record
Body: { code: string, student_id: string }

// Get Active Sessions
GET /api/attendance/active
```

---

## Bagian 8: Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vercel Deployment](https://vercel.com/docs)

---

## Lisensi

Project ini adalah property dari SMK Veteran 1 Sukoharjo.
