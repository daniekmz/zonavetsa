import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zonavetsanext.rnet.lt";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = [
    "/",
    "/changelog",
    "/login/siswa",
    "/login/guru",
    "/login/admin",
    "/login/siswa/lupa-password",
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "monthly",
    priority: route === "/" ? 1.0 : 0.8,
  }));
}
