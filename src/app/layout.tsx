import type { Metadata, Viewport } from "next";
import { Poppins, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zonavetsa.rnet.lt";
const SITE_NAME = "ZonaVetsa";
const SITE_DESCRIPTION =
  "Portal digital SMK Veteran 1 Sukoharjo untuk akses materi, tugas, ujian, absensi QR, dan galeri karya siswa.";
const OG_IMAGE_PATH = "/opengraph-image";
const TWITTER_IMAGE_PATH = "/twitter-image";
const GOOGLE_SITE_VERIFICATION = "OJqjazQIZh4_AEemYvoJuTqP-SooyrlJO4X6ZblLU44";

export const viewport: Viewport = {
  themeColor: "#002b5b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - Portal Digital SMK Veteran 1 Sukoharjo`,
    template: "%s | ZonaVetsa",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  keywords: [
    "ZonaVetsa",
    "SMK Veteran 1 Sukoharjo",
    "Portal Sekolah",
    "E-Learning",
    "SMK",
    "Sekolah Menengah Kejuruan",
    "Sukoharjo",
    "Jawa Tengah",
    "Portal Digital",
    "Belajar Online",
    "Manajemen File Sekolah",
    "Absensi QR Code",
    "Broadcasting",
    "Teknik Alat Berat",
    "Teknik Sepeda Motor",
    "Teknik Kendaraan Ringan",
    "Teknik Komputer Jaringan",
    "Teknik Pemesinan",
  ],
  authors: [{ name: "SMK Veteran 1 Sukoharjo" }],
  creator: "SMK Veteran 1 Sukoharjo",
  publisher: "SMK Veteran 1 Sukoharjo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: GOOGLE_SITE_VERIFICATION,
    yandex: "yandex-verification-code",
  },
  icons: {
    icon: [
      { url: "/gambar/favicon.ico" },
      { url: "/gambar/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/gambar/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/gambar/apple-touch-icon.png" },
    ],
    other: [
      { url: "/gambar/android-chrome-192x192.png", rel: "icon", sizes: "192x192", type: "image/png" },
      { url: "/gambar/android-chrome-512x512.png", rel: "icon", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Portal Digital SMK Veteran 1 Sukoharjo`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Portal Digital SMK Veteran 1 Sukoharjo`,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Portal Digital SMK Veteran 1 Sukoharjo`,
    description: SITE_DESCRIPTION,
    images: [TWITTER_IMAGE_PATH],
    creator: "@smkveteran1",
  },
  facebook: {
    appId: "",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ZonaVetsa",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ZonaVetsa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="googlebot" content="index,follow" />
        <meta name="google" content="notranslate" />
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#002b5b" />
        <meta name="description" content="Portal Digital SMK Veteran 1 Sukoharjo - Akses materi pembelajaran, tugas, dan absensi" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/gambar/apple-touch-icon.png" />
        <link rel="icon" type="image/x-icon" href="/gambar/favicon.ico" />
      </head>
      <body className={`${poppins.variable} ${spaceGrotesk.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
