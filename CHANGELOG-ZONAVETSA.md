# Changelog ZonaVetsa-Next (Versi Terbaru)

Dokumen ini berisi rekapitulasi komprehensif dari semua fitur baru, struktur *database*, serta pembaruan antarmuka (UI/UX) yang diselesaikan dalam serangkaian fase perbaikan skala besar di aplikasi **ZonaVetsa-Next**.

---

## 18. Sidebar Siswa dan Alur Wajib Pilih Guru
- Menu **Ganti Guru** dipindahkan ke posisi paling atas pada sidebar siswa (Akses Cepat).
- Setelah login siswa, sistem sekarang selalu mengarahkan pengguna ke halaman pemilihan guru.
- Session siswa ditandai `selected: false` saat login, lalu menjadi `selected: true` setelah pilihan guru berhasil disimpan.

## 17. SEO Sharing, Sitemap, dan Google Search Console
- Metadata SEO untuk web diperbarui agar ketika link dibagikan menampilkan:
  - gambar preview (Open Graph/Twitter Card)
  - judul halaman
  - deskripsi aplikasi
- Menambahkan endpoint gambar preview khusus (`opengraph-image` dan `twitter-image`) berukuran 1200x630 untuk meningkatkan kompatibilitas lintas platform berbagi link.
- Menambahkan route `sitemap.xml` untuk membantu crawling/indexing di Google Search Console.
- Menambahkan dukungan verifikasi Google:
  - token verifikasi pada metadata aplikasi
  - file publik `google-site-verification.txt`
- Menyelaraskan domain sitemap/robots ke domain produksi agar tidak terjadi error "URL tidak diperbolehkan" di Search Console.

## 12. Galeri Karya Publik (Pengganti E-Portofolio)
- Rename label menu dari **E-Portofolio** menjadi **Galeri Karya** pada dashboard siswa dan guru.
- Siswa dapat upload karya dengan cakupan publikasi:
  - `Kelas` (terlihat untuk kelas terkait)
  - `Global` (terlihat untuk semua pengguna)
- Feed Galeri Karya ditampilkan di sisi siswa dan guru dengan metadata uploader:
  - nama pengunggah
  - kelas pengunggah

## 13. Interaksi Galeri: Like dan Komentar Terstruktur
- Menambahkan tabel database baru:
  - `portfolio_likes`
  - `portfolio_comments`
- Menyimpan detail interaksi secara lengkap:
  - role pengguna (siswa/guru)
  - identitas pengguna
  - nama pengguna
  - kelas pengguna (untuk siswa)
- Menambahkan sinkronisasi otomatis counter `likes` dan `comments` di tabel `portofolios` via trigger database.

## 14. Moderasi Guru pada Galeri Karya
- Guru dapat menghapus karya siswa pada menu Galeri Karya.
- Saat hapus karya:
  - record karya di `portofolios` dihapus
  - file gambar di storage bucket `files` ikut dicoba dihapus jika path valid
- Guru tetap dapat memantau seluruh interaksi like/komentar pada karya siswa.

## 15. Integrasi Sistem Poin dengan Galeri Karya
- Sistem poin siswa diintegrasikan ke aksi Galeri Karya melalui trigger database.
- Skema poin:
  - Upload karya: `+15` untuk uploader
  - Like (oleh siswa ke karya orang lain): `+2` untuk pemberi like
  - Karya mendapat like dari pengguna lain: `+1` untuk pemilik karya
  - Komentar (oleh siswa ke karya orang lain): `+3` untuk pemberi komentar
  - Karya mendapat komentar dari pengguna lain: `+2` untuk pemilik karya
- Proteksi anti-eksploitasi:
  - self-like dan self-comment tidak menambah poin
  - poin siswa tidak turun di bawah 0

## 16. Update Dashboard Siswa - Menu Peringkat
- Breakdown poin pada halaman `/dashboard/siswa/peringkat` ditambah komponen **Galeri**.
- Perhitungan leaderboard kini memasukkan `portfolioPoints` dari:
  - upload karya
  - like
  - komentar
- Realtime refresh leaderboard ditambah untuk tabel:
  - `portofolios`
  - `portfolio_likes`
  - `portfolio_comments`

## ðŸ”§ 9. File Management Berbasis Kelas
- **Admin**: Melihat semua file di semua kelas dengan filter dropdown kelas
- **Guru**: Pilih kelas terlebih dahulu, lalu lihat/upload file untuk kelas tersebut
- **Siswa**: Secara otomatis melihat file hanya sesuai kelas masing-masing (dari session `class_id`)
- **Database**: Ditambahkan kolom `class_id` ke tabel `files`

## ðŸ” 10. Perbaikan Profile Upload
- **Storage Policies**: Ditambahkan policies untuk bucket avatars, files, tugas
- **Fixed Primary Key**: Perbaikan update profile menggunakan PK yang benar
  - Guru: `.eq("kode_guru")` instead of `.eq("id")`
  - Siswa: `.eq("nis")` instead of `.eq("id")`

## ðŸšª 11. Simplifikasi Login Siswa
- **Alur Baru**: Siswa hanya pilih guru mapel (tanpa kelas)
- **Kelas**: Sudah di-set oleh admin saat import/create siswa
- **Schema Check**: `last_teacher_kode` + `class_id` untuk validasi session

---

## ðŸ”’ 1. Keamanan & Integritas Ujian (Anti-Cheating)
- **Fitur Baru (Deteksi Fokus Layar):** Deteksi `blur` dan `focus` ditambahkan di `/dashboard/siswa/ujian/[examId]`. Jika siswa berpindah tab/jendela, judul dokumen akan berubah menjadi _"KEMBALI KE UJIAN!"_.
- **Sistem Perlindungan Konten:** Menghindari kebocoran ujian dengan memblokir klik kanan otomatis (Context Menu disabled) serta memblokir kombinasi *keyboard copy/paste* (`Ctrl+C`, `Ctrl+V`, `Ctrl+X`).
- **Sistem Penyortiran Acak:** Penambahan mode _shuffle questions_ dan _shuffle options_ pada rendering sisi-klien untuk menyulitkan siswa berbagi kunci jawaban.

## ðŸŽ® 2. Gamifikasi Pembelajaran (Sistem _Engagement_)
- **Perubahan Struktur Database (`schema.sql`):** Tabel `students` diperbarui dengan penambahan kolom `points` (INTEGER) dan `level` (INTEGER) untuk merekam nilai permainan siswa.
- **Header Klasemen Siswa:** Siswa kini bisa melihat sisa _point_ dan _level_ mereka di `src/app/dashboard/siswa/layout.tsx` secara _real-time_.
- **Papan Peringkat (Leaderboard):** Penambahan rute baru `/dashboard/siswa/peringkat` yang menampilkan daftar peringkat siswa dengan nilai agregat dan UI piala gamifikasi, tersambung langsung dengan data poin dari `Supabase`.

## ðŸŽ¨ 3. E-Portofolio SMK & Sistem Komentar Terintegrasi
- **Struktur Tabel Baru (`portofolios`):** Migrasi *backend* untuk tabel E-Portofolio bagi karya praktikum siswa, serta tabel pendukung _comments_.
- **Dashboard Katalog Karya:** Pembuatan halaman `/dashboard/siswa/portofolio` yang menggunakan gaya presentasi _grid holographic_ untuk memamerkan proyek individu siswa (misal: "Instalasi Linux", "Topologi Jaringan").

## ðŸŒŒ 4. Perombakan Total Desain Antarmuka (Modern AI / Holographic UI)
- **Tema _Neural AI Workflow_:** Merombak file `src/app/globals.css`. Tema asli **Biru Navy** (`#002b5b`) telah diperkaya menggunakan aksen _Holographic Blue_, _Neon Cyan_, dan _Electric Indigo_.
- **Efek Glassmorphism & Scanlines:** Pembuatan *custom classes* seperti `.card-ai`, `.glass-panel`, `.scan-lines`, dan `.bg-circuit-animated` yang memberikan tampilan seolah pengguna mengoperasikan dasbor _spaceship_ kecerdasan buatan.
- **Pembaruan Font & Typografi:** Transisi menggunakan **Poppins** sebagai *font family* utama dengan *kerning* presisi.

## ðŸ“Š 5. Alat Analitik Khusus Guru (Early Warning System)
- **Pemasangan _Library_:** Integrasi pustaka visualisasi grafik `recharts` ke lingkungan Next.js.
- **Data Performa Kelas:** Pembuatan `/dashboard/guru/analitik` dan penempatan di sistem _sidebar_ navigasi guru.
- **Logika _At-Risk Student_:** Algoritma yang secara otomatis menyeleksi siswa (dan di-sorot _merah_ di dashboard) yang memiliki agregat nilai ujian rata-rata di bawah 70. Termasuk *Bar Chart* _Average Score_ per Ujian.

## ðŸ¤– 6. Tutor & Asisten AI Generatif
- **Integrasi SDK Google Gemini:** Instalasi modul `@google/generative-ai`.
- **Rute API AI (_endpoint_ `/api/ai`):** Menggunakan model `gemini-1.5-flash`, _endpoint_ backend ini menerima *prompt* dengan membedakan _role_ (Guru atau Siswa) yang di-*inject* menggunakan instruksi sistem kustom:
  - **Siswa** menerima *scaffolding* (bimbingan tanpa memberi jawaban instan).
  - **Guru** menerima ringkasan kelas dan kemudahan perumusan materi ujian.

## ðŸš€ 7. Modul PWA (Progressive Web Application) Lanjutan
- **Instalasi `next-pwa`:** Mengaktifkan konfigurasi PWA di `next.config.js` sehingga menghasilkan `public/sw.js` (Service Worker) yang bisa dijalankan di peramban otomatis.
- **Manifestasi PWA Lengkap:** Membuat _manifest file_ proper di `public/manifest.json` agar *ZonaVetsa* bisa di-install langsung layaknya aplikasi native Android / iOS pada perangkat portabel siswa.

## ðŸ§¹ 8. Codebase Health & Type Safety
- Menyelesaikan seluruh anomali implicit `any` TS7006 pada panggilan `.map`, `.find`, ObjectEntries, dll.
- Membersihkan TS2322 (kesalahan tipe argumen opsional) pada `src/components/avatar.tsx` dan `src/app/dashboard/siswa/tugas/page.tsx`.
- Menonaktifkan secara sistematis _ESLint Warnings_ pada plugin yang belum kompatibel di `.eslintrc.json`.


