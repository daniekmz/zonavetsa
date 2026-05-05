import type { PortfolioItem } from "@/types";

const HTML_EXTENSIONS = new Set(["html", "htm"]);

export function getPortfolioFileName(url?: string | null) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const parts = decodeURIComponent(parsed.pathname).split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return url.split("/").pop()?.split("?")[0] || "";
  }
}

export function isHtmlPortfolioFile(url?: string | null) {
  const fileName = getPortfolioFileName(url).toLowerCase();
  const extension = fileName.split(".").pop() || "";
  return HTML_EXTENSIONS.has(extension);
}

export function slugifyPortfolioSegment(value?: string | null) {
  const normalized = (value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized;
}

export function buildPortfolioPublicPath(publicSlug?: string | null) {
  return publicSlug ? `/${publicSlug}` : null;
}

export function buildPortfolioPublicUrl(publicSlug?: string | null, origin?: string) {
  const path = buildPortfolioPublicPath(publicSlug);
  if (!path) return null;

  const resolvedOrigin =
    origin || (typeof window !== "undefined" ? window.location.origin : "");

  return resolvedOrigin ? `${resolvedOrigin}${path}` : path;
}

export function getPortfolioPrimaryUrl(item: Pick<PortfolioItem, "image_url" | "public_slug">) {
  if (isHtmlPortfolioFile(item.image_url) && item.public_slug) {
    return buildPortfolioPublicPath(item.public_slug) || item.image_url;
  }
  return item.image_url;
}
