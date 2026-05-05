# Icon Mapping ZonaVetsa (Tailwind v3 Refactor)

Seiring dengan pembaruan sistem desain ZonaVetsa, seluruh ikon aplikasi telah dimigrasikan menggunakan **Lucide React**. Berikut adalah panduan konvensi ikon yang baru untuk memastikan konsistensi antarmuka.

## Navigasi Utama (Sidebar & Bottom Tab)

| Konteks Utama | Icon Lama | Icon Baru | Library | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** / Beranda | _bervariasi_ | `LayoutDashboard`, `House` | Lucide | `House` untuk tab bar mobile, `LayoutDashboard` untuk sidebar overview |
| **Profil User** | `User` | `CircleUserRound` | Lucide | Bentuk yang lebih bersahabat |
| **Notifikasi** | `Bell` | `Bell` / `BellDot` | Lucide | Digunakan di Header |
| **Keluar (Logout)** | _bervariasi_ | `LogOut` | Lucide | Merah/Destructive action |
| **Pengaturan** | `Settings` | `Settings` | Lucide | - |

## Navigasi Spesifik Role

### Siswa
| Konteks | Icon Lama | Icon Baru | Keterangan |
| :--- | :--- | :--- | :--- |
| **Absensi** (QR Scan) | `ClipboardList` | `ClipboardCheck` | Menandakan aksi check-in yang berhasil |
| **Tugas** | `GraduationCap` / `PenTool` | `BookOpen` | Merepresentasikan materi/tugas harian |
| **Ujian** | `FileText` / `Pen` | `PencilLine` | Merepresentasikan aktivitas mengerjakan soal |
| **Jadwal Pelajaran** | - | `CalendarDays` | (*Menu Baru*) Tampilan jadwal mingguan |
| **Pengumuman** | - | `Megaphone` | (*Menu Baru*) Informasi dari sekolah/guru |
| **Galeri / Portofolio** | `FolderOpen` | `FolderOpen` | Folder media/hasil diskusi karya |

### Guru
| Konteks | Icon Lama | Icon Baru | Keterangan |
| :--- | :--- | :--- | :--- |
| **Kelola Kelas** | _bervariasi_ | `Users` | Manajemen grup siswa |
| **Generate QR** | `QrCode` | `QrCode` | Pembuatan kode presensi |
| **Laporan Kelas** | - | `BarChart2` | (*Menu Baru*) Analitik kehadiran/nilai per kelas |

### Admin
| Konteks | Icon Lama | Icon Baru | Keterangan |
| :--- | :--- | :--- | :--- |
| **Manajemen Siswa** | `UserCheck` | `UserPlus` | Pendaftaran dan pengelolaan data siswa |
| **Manajemen Guru** | `Users` | `Users` | Pengelolaan staf pengajar |
| **Manajemen Kelas** | `Briefcase` | `Briefcase` / `GraduationCap` | Pengelompokan rombel |
| **Manajemen User** | - | `UsersRound` | (*Menu Baru*) Tampilan terpadu guru & siswa |
| **Log Aktivitas** | `History` | `ScrollText` | Catatan audit aktivitas sistem |

## Halaman Publik & Login

| Konteks | Icon Lama | Icon Baru | Keterangan |
| :--- | :--- | :--- | :--- |
| **Input: NIS** | - | `IdCard` | Input field login siswa |
| **Input: Username/Kode** | - | `IdCard` | Input field login guru/admin |
| **Input: Password** | - | `Lock` | Input field password (semua role) |
| **Show/Hide Password** | - | `Eye` / `EyeOff` | Toggle visibilitas disematkan `aria-label` |
| **Login CTA (Siswa)** | `KeyRound` | `GraduationCap` | Tombol submit utama siswa |
| **Login CTA (Guru)** | `ArrowRight` | `GraduationCap` | Tombol submit utama guru |
| **Login CTA (Admin)** | `LockKeyhole` | `Shield` | Menandakan otoritas sistem tinggi |
| **Landing: Insight** | - | `Lightbulb` | Banner info harian sekolah |

## Konvensi Penggunaan

1. **Ukuran Baku:** 
   - Sidebar item: `20px`
   - Tombol utama (di luar tulisan): `18px`
   - Field input (dalam input wrapper): `15px`
   - Bottom Tab mobile: `22px`
2. **Aksesibilitas (A11y):**
   - Ikon dekoratif (bersebelahan dengan teks): Harus menyertakan `aria-hidden="true"`.
   - Ikon fungsional (tanpa teks dampingan, ex: Hamburger Menu): Harus dibungkus dalam tag `<button>` yang memiliki atribut `aria-label` jelas.
3. **Pembungkus Ikon Sidebar:** Menggunakan kelas `.sidebar-icon` (kotak radius dengan transisi warna).
