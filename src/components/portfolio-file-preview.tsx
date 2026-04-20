"use client";

import { useEffect, useState } from "react";
import { FileText, Globe, Music2, PlaySquare } from "lucide-react";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg", "avif"]);
const HTML_EXTENSIONS = new Set(["html", "htm"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogg", "mov", "m4v"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "aac", "flac"]);
const TEXT_EXTENSIONS = new Set([
  "txt",
  "md",
  "csv",
  "json",
  "xml",
  "js",
  "ts",
  "jsx",
  "tsx",
  "css",
  "scss",
  "html",
  "htm",
  "py",
  "java",
  "c",
  "cpp",
  "cs",
  "go",
  "php",
  "rb",
  "rs",
  "sql",
  "yaml",
  "yml",
  "ini",
  "log",
]);

export type PortfolioFileKind = "image" | "html" | "pdf" | "video" | "audio" | "text" | "other";

export const getFileNameFromUrl = (url?: string) => {
  if (!url) return "File karya";
  try {
    const parsedUrl = new URL(url);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "File karya";
  } catch {
    return url.split("/").pop()?.split("?")[0] || "File karya";
  }
};

export const getFileExtensionFromUrl = (url?: string) => {
  const filename = getFileNameFromUrl(url).toLowerCase();
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
};

export const getPortfolioFileKind = (url?: string): PortfolioFileKind => {
  const ext = getFileExtensionFromUrl(url);
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (HTML_EXTENSIONS.has(ext)) return "html";
  if (PDF_EXTENSIONS.has(ext)) return "pdf";
  if (VIDEO_EXTENSIONS.has(ext)) return "video";
  if (AUDIO_EXTENSIONS.has(ext)) return "audio";
  if (TEXT_EXTENSIONS.has(ext)) return "text";
  return "other";
};

interface PortfolioFilePreviewProps {
  url?: string;
  title?: string;
}

export function PortfolioFilePreview({ url, title }: PortfolioFilePreviewProps) {
  const kind = getPortfolioFileKind(url);
  const fileName = getFileNameFromUrl(url);
  const [htmlSource, setHtmlSource] = useState("");
  const [isHtmlLoading, setIsHtmlLoading] = useState(false);

  useEffect(() => {
    if (!url || kind !== "html") {
      setHtmlSource("");
      setIsHtmlLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsHtmlLoading(true);

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return "";
        return response.text();
      })
      .then((rawText) => {
        setHtmlSource(rawText || "");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.error("Load html preview failed:", error);
        }
        setHtmlSource("");
      })
      .finally(() => {
        setIsHtmlLoading(false);
      });

    return () => controller.abort();
  }, [kind, url]);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <FileText size={44} className="text-primary" />
        <p className="break-words text-sm text-gray-600">File tidak tersedia</p>
      </div>
    );
  }

  if (kind === "image") {
    return <img src={url} alt={title || "File karya"} className="max-h-[420px] w-full object-contain" />;
  }

  if (kind === "html") {
    return (
      <div className="space-y-2 p-3">
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          <Globe size={14} />
          Preview HTML5 aktif
        </div>
        {isHtmlLoading ? <p className="text-xs text-gray-500">Memuat preview HTML...</p> : null}
        <iframe
          src={htmlSource ? undefined : url}
          srcDoc={htmlSource || undefined}
          title={title || fileName}
          className="h-[440px] w-full rounded-lg border border-gray-200 bg-white"
          loading="lazy"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-pointer-lock allow-presentation allow-downloads"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (kind === "pdf") {
    return (
      <iframe
        src={url}
        title={title || fileName}
        className="h-[520px] w-full border-0 bg-white"
        loading="lazy"
      />
    );
  }

  if (kind === "video") {
    return (
      <video controls preload="metadata" className="max-h-[420px] w-full bg-black">
        <source src={url} />
      </video>
    );
  }

  if (kind === "audio") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <Music2 size={40} className="text-primary" />
        <p className="break-words text-sm text-gray-600">{fileName}</p>
        <audio controls preload="metadata" className="w-full max-w-lg">
          <source src={url} />
        </audio>
      </div>
    );
  }

  if (kind === "text") {
    return (
      <iframe
        src={url}
        title={title || fileName}
        className="h-[440px] w-full rounded-lg border-0 bg-white"
        loading="lazy"
      />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <PlaySquare size={40} className="text-primary" />
      <p className="break-words text-sm text-gray-600">{fileName}</p>
      <p className="text-xs text-gray-500">Preview langsung belum tersedia untuk tipe file ini.</p>
    </div>
  );
}
