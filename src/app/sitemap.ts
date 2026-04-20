import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zonavetsa.rnet.lt";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = [
    "/",
    "/login/admin",
    "/login/guru",
    "/login/siswa",
    "/login/siswa/lupa-password",
    "/dashboard/admin",
    "/dashboard/admin/files",
    "/dashboard/admin/galeri",
    "/dashboard/admin/guru",
    "/dashboard/admin/kelas",
    "/dashboard/admin/logs",
    "/dashboard/admin/nilai",
    "/dashboard/admin/settings",
    "/dashboard/admin/siswa",
    "/dashboard/admin/ujian",
    "/dashboard/guru",
    "/dashboard/guru/analitik",
    "/dashboard/guru/kelas",
    "/dashboard/guru/peringkat",
    "/dashboard/guru/portofolio",
    "/dashboard/guru/profil",
    "/dashboard/guru/qr-absen",
    "/dashboard/guru/tugas",
    "/dashboard/guru/ujian",
    "/dashboard/siswa",
    "/dashboard/siswa/absensi",
    "/dashboard/siswa/ganti-guru",
    "/dashboard/siswa/peringkat",
    "/dashboard/siswa/portofolio",
    "/dashboard/siswa/profil",
    "/dashboard/siswa/tugas",
    "/dashboard/siswa/ujian",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
