import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildPortfolioPublicPath } from "@/lib/portfolio-links";
import { PortfolioFilePreview } from "@/components/portfolio-file-preview";
import type { PortfolioItem } from "@/types";

interface PortfolioPublicPageProps {
  params: {
    portfolioSlug: string;
  };
}

async function fetchPortfolioBySlug(publicSlug: string): Promise<PortfolioItem | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const requestUrl = new URL("/rest/v1/portofolios", supabaseUrl);
  requestUrl.searchParams.set(
    "select",
    "id,title,description,image_url,public_slug,uploader_name,student_nis,created_at,visibility_scope"
  );
  requestUrl.searchParams.set("public_slug", `eq.${publicSlug}`);
  requestUrl.searchParams.set("limit", "1");

  const response = await fetch(requestUrl.toString(), {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const portfolios = (await response.json()) as PortfolioItem[];
  return portfolios[0] || null;
}

export async function generateMetadata({ params }: PortfolioPublicPageProps): Promise<Metadata> {
  const { portfolioSlug } = params;
  const portfolio = await fetchPortfolioBySlug(portfolioSlug);

  if (!portfolio) {
    return {
      title: "Karya Tidak Ditemukan | ZonaVetsa",
      description: "Halaman portofolio siswa yang Anda cari tidak ditemukan atau telah dihapus.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zonavetsanext.rnet.lt";
  const authorName = portfolio.uploader_name || portfolio.student_nis;
  const pageTitle = `${portfolio.title} oleh ${authorName} | ZonaVetsa`;
  const pageDescription = portfolio.description || `Lihat detail karya portofolio siswa berjudul "${portfolio.title}" oleh ${authorName} di SMK Veteran 1 Sukoharjo.`;
  const canonicalUrl = buildPortfolioPublicPath(portfolio.public_slug);

  // Jika image_url tidak ada, Next.js akan fallback ke OG image dari layout
  const ogImage = portfolio.image_url ? [{ url: portfolio.image_url }] : [];

  return {
    title: pageTitle,
    description: pageDescription,
    authors: [{ name: authorName }],
    alternates: {
      canonical: canonicalUrl || undefined,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: canonicalUrl ? `${siteUrl}${canonicalUrl}` : siteUrl,
      type: "article",
      publishedTime: portfolio.created_at,
      authors: [authorName],
      images: ogImage,
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: ogImage,
    },
  };
}

export default async function PortfolioPublicPage({ params }: PortfolioPublicPageProps) {
  const { portfolioSlug } = params;
  const portfolio = await fetchPortfolioBySlug(portfolioSlug);

  if (!portfolio) {
    notFound();
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-white">
      <PortfolioFilePreview url={portfolio.image_url} title={portfolio.title} minimal />
    </main>
  );
}
