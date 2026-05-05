# Changelog ZonaVetsa-Next (Versi Terbaru)

## 24. Puncak Optimasi SEO, UI/UX, & Stabilitas Ujian (Patch v3.5)
- **Optimalisasi SEO Skala Penuh:** Penerapan "School" JSON-LD, pembersihan `sitemap.xml` dari rute privat admin/guru, perbaikan `robots.txt` agar sesuai standar Google, serta pembaruan deskripsi meta yang kuat agar website optimal terindeks di mesin pencari.
- **GenerateMetadata Dinamis:** URL portofolio siswa yang dibagikan kini memiliki *OpenGraph/Twitter Cards* yang dinamis, mengambil gambar dan judul langsung dari karya asli sang pembuat.
- **Perbaikan Krusial Modul Ujian:** Memperbaiki insiden sinkronisasi *timer* (menggunakan state `useRef`) sehingga mencegah "double-submit" otomatis saat waktu habis. Opsi jawaban yang hanya memuat spasi/kosong disaring secara efektif.
- **Sinkronisasi Poin Esai:** Evaluasi jawaban esai oleh guru kini memicu kalkulasi ulang skor secara otomatis dan menyelaraskan penambahan poin ke *leaderboard* siswa secara real-time.
- **AI Chat Popup Cerdas (ZonaVetsa AI):** Implementasi asisten AI melayang di seluruh dashboard yang kini mendukung model **Owl-Alpha** via **OpenRouter** (dengan fallback ke Gemini 1.5 Flash).
- **Personalisasi AI & Deteksi Profil:** AI kini secara otomatis mengenali nama dan kelas pengguna yang sedang login untuk memberikan jawaban yang lebih relevan dan personal.
- **Animasi & UI Premium:** Penambahan animasi *typing indicator* (mengetik), transisi pesan menggunakan *Framer Motion*, dan notifikasi "Butuh bantuan?" yang interaktif.
- **Respon To-The-Point:** Optimasi instruksi sistem agar AI menjawab secara langsung, ringkas, dan menghindari basa-basi yang tidak perlu.
- **Halaman Changelog Publik:** Penambahan rute publik `/changelog` agar pengguna dan pihak sekolah bisa secara transparan melihat linimasa pembaruan ZonaVetsa secara kronologis.

## 23. Pengumuman Siswa, Guru, dan Admin (Patch v3.4)
- **Feed Pengumuman Siswa dari Database:** Menu `Pengumuman` pada dashboard siswa sekarang menampilkan pengumuman aktif dari guru dan admin, lengkap dengan filter target siswa dan target kelas.
- **Input Pengumuman untuk Guru:** Guru kini memiliki menu khusus untuk membuat pengumuman baru, memilih target semua kelas atau kelas tertentu, memberi pin, mengatur status aktif, serta masa berlaku pengumuman.
- **Input Pengumuman untuk Admin:** Admin juga mendapat halaman pengumuman untuk membuat informasi resmi sekolah yang bisa diarahkan ke semua siswa atau kelas tertentu.
- **Pengumuman Masuk ke Notifikasi Siswa:** Saat guru atau admin membuat pengumuman, siswa target sekarang langsung menerima notifikasi realtime di lonceng notifikasi dengan tautan menuju menu pengumuman.
- **Sinkronisasi Menu Dashboard:** Navigasi guru dan admin diperbarui agar halaman pengumuman bisa diakses langsung dari sidebar, dan shortcut cepat admin ikut ditambahkan di overview.
- **Update Database Announcement & Notification Type:** `001_initial_schema.sql` memang perlu penambahan database, sehingga ditambahkan tabel `announcements`, trigger `updated_at`, realtime publication, serta perluasan tipe notifikasi `announcement` melalui migrasi lanjutan `003_announcements.sql` dan `004_notification_announcement_type.sql`.
- **Sinkronisasi Changelog Web:** Seluruh catatan fitur pengumuman ikut dimasukkan ke changelog dokumen utama, modal changelog web, dan tab `Changelog Web` di admin panel.

## 22. Link Publik HTML untuk Galeri Karya (Patch v3.3)
- **Route Langsung untuk `index.html`:** File HTML yang diupload dari menu siswa pada Galeri Karya sekarang otomatis mendapat `public_slug` unik sehingga bisa dibuka langsung lewat link seperti `localhost:3000/nama_siswa`.
- **Copy Link Otomatis & Manual:** Setelah upload HTML berhasil, sistem mencoba langsung menyalin link publik ke clipboard. Tombol **Copy Link** juga ditambahkan pada tampilan siswa, guru, dan admin galeri.
- **Banyak HTML per Siswa Tetap Aman:** Jika satu siswa mengupload beberapa file `index.html`, setiap karya akan memperoleh slug unik berurutan agar tidak saling menimpa.
- **Preview Web Asli untuk HTML/CSS/JS:** Halaman publik berbasis slug kini merender konten `HTML`, `CSS`, dan `JavaScript` inline sebagai preview web aktif, bukan lagi menampilkan kode mentahan.
- **Responsif untuk Semua Device:** Tampilan preview publik diperbarui agar nyaman dipakai di mobile, tablet, dan desktop dengan area baca yang lebih fleksibel.
- **Sinkronisasi Changelog:** Catatan rilis ini ikut diperbarui pada dokumen changelog utama, modal changelog web, dan tab **Changelog Web** di panel admin.
- **Update Database:** Tabel `portofolios` pada `001_initial_schema.sql` ditambah kolom `public_slug` dengan unique index agar mapping link publik stabil.

## 21. Refactor UI/UX Menu Ujian Guru & Siswa (Patch v3.2)
- **Refactor Tata Letak Ujian Guru:** Menu ujian pada dashboard guru diperbarui dengan pola **Aksi Cepat** dan **Fungsi Lain** agar pilihan tombol lebih terarah dan tidak menumpuk.
- **Akses Fungsi Guru Lebih Friendly:** Tombol utama (`Kelola Soal`, `Lihat Hasil`, `Publish/Draft`) diprioritaskan, sedangkan fungsi lanjutan (`Koreksi Essay`, `Edit`, `Hapus`) dapat dibuka lewat panel tambahan.
- **Validasi Konfirmasi Submit Siswa:** Sebelum muncul dialog konfirmasi pengiriman, sistem sekarang memeriksa soal kosong terlebih dahulu.
- **Auto-Arah ke Soal Belum Terjawab:** Jika masih ada jawaban kosong, siswa langsung diarahkan ke nomor soal pertama yang belum diisi beserta notifikasi.
- **Penyederhanaan UI Ujian Siswa:** Ditambahkan tombol cepat menuju soal belum dijawab pada panel ringkasan agar proses review jawaban jadi lebih mudah.
- **Update Changelog Web:** Konten pada modal changelog web diperbarui ke **Update v3.2** dengan fokus pembaruan menu ujian guru dan siswa.

## 20. Restorasi File Manager & Penyempurnaan Ekstrem Dark Mode (Patch v3.1)
- **Fokus Ulang File Manager:** Dasbor siswa direstorasi kembali fitrahnya untuk memfokuskan pengelolaan materi belajar dari File Manager.
- **Sapu Bersih Dark Mode (Sweep Action):** Modifikasi pada lebih dari **80 komponen** `.tsx` untuk membatalkan `radial gradient background` berwarna putih, garis pemisah putih, animasi *loading skeleton* keputihan (`bg-slate-100`), hingga efek *hover* yang luput digelapkan pada mode malam.
- **Standarisasi Kontras Komponen Web:** Menu-menu seperti *Ujian Guru* dan *Settings Admin* yang elemen formulirnya (`<textarea>`) belum patuh tema gelap—kini sudah diperkokoh dengan `dark:bg-slate-900 border dark:border-slate-800`.
## 19. Refactor UI/UX Menyeluruh (Modern Minimalis)
- **Desain Sistem Baru:** Tema sekolah modern dengan skema warna dominan **Navy**, **Teal**, dan **Amber**. Menggunakan keseluruhan font **Inter**.
- **Perombakan Layout Global:** Halaman login dengan tata letak layar-belah (desktop) dan satu layar (mobile).
- **Navigasi Dashboard Baru:** Sidebar mendukung status aktif berbasis `bg-navy-50` ber-border `teal`. Tambahan *Bottom Tab Bar* eksklusif fitur mobile.
- **Standarisasi Ikonografi:** Semua icon dimigrasikan penuh menjadi **Lucide Icons** dengan standarisasi (mapping lengkap tersedia di `icon-map.md`).
- **Halaman Fungsional Baru:** *Jadwal* & *Pengumuman* (Siswa), *Laporan Kelas* (Guru), *Manajemen User* yang baru digabung (Admin).
- **Optimasi Low-end Mobile:** Penghapusan background efek blur di lebar min *viewport* <768px.

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


