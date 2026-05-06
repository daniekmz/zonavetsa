import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toast";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://zonavetsanext.rnet.lt";
const SITE_NAME = "ZonaVetsa";
const SITE_DESCRIPTION =
  "ZonaVetsa adalah portal digital resmi SMK Veteran 1 Sukoharjo. Solusi terpadu e-learning untuk materi belajar, tugas harian, ujian online (CBT), absensi QR Code, dan galeri karya siswa.";
const GOOGLE_SITE_VERIFICATION = "-Ck1-TjpyrMpmCVh3fp25rsvayUofLvSvEKcDGJSo9s";

export const viewport: Viewport = {
  themeColor: "#002b5b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// ━━ Font: Inter — Base 15px, antialiased ━━
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
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
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Portal Digital SMK Veteran 1 Sukoharjo`,
    description: SITE_DESCRIPTION,
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
    <html lang="id" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme:dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`,
          }}
        />
        {/* Preconnect to critical origins */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
          </>
        )}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ZonaVetsa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="googlebot" content="index,follow" />
        <meta name="google" content="notranslate" />
      </head>
      <body className={`${inter.variable} antialiased`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
