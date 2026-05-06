"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw, Mail } from "lucide-react";

/**
 * Global Error Boundary — replaces the entire <html> tree.
 *
 * IMPORTANT: This component MUST render its own <html> and <body> tags
 * because Next.js unmounts the root layout when a global error occurs.
 * Do NOT use next/navigation hooks (useRouter, Link, etc.) here — the
 * app router is not mounted at this level, which causes the
 * "invariant expected app router to be mounted" error.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error ke console untuk debugging
    console.error("Global error caught:", error);
  }, [error]);

  return (
    <html lang="id">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            background: "linear-gradient(135deg, #1a3a6b 0%, #2a5298 60%, #1D9E75 100%)",
          }}
        >
          {/* Main Content */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: "1rem",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              padding: "2rem",
              width: "100%",
              maxWidth: "28rem",
              textAlign: "center",
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: "5rem",
                height: "5rem",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderRadius: "9999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}
            >
              <AlertTriangle size={40} color="#ef4444" />
            </div>

            {/* Title */}
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#1e293b",
                marginBottom: "0.5rem",
              }}
            >
              Terjadi Kesalahan
            </h2>

            {/* Description */}
            <p
              style={{
                color: "#64748b",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau
              hubungi administrator.
            </p>

            {/* Error details (hanya tampil di development) */}
            {process.env.NODE_ENV === "development" && (
              <div
                style={{
                  backgroundColor: "#f1f5f9",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                  marginBottom: "1.5rem",
                  textAlign: "left",
                  overflow: "auto",
                }}
              >
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    fontFamily: "monospace",
                    margin: 0,
                  }}
                >
                  {error?.message || "Unknown error"}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                onClick={() => reset()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#1a3a6b",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RefreshCw size={18} />
                Coba Lagi
              </button>

              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "transparent",
                  color: "#1a3a6b",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.5rem",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                <Home size={18} />
                Kembali ke Beranda
              </a>
            </div>

            {/* Contact Admin */}
            <div
              style={{
                marginTop: "1.5rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "0.5rem" }}>
                Masih bermasalah? Hubungi administrator:
              </p>
              <a
                href="mailto:admin@smkvetsa.sch.id"
                style={{
                  fontSize: "0.875rem",
                  color: "#1a3a6b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
              >
                <Mail size={14} />
                admin@smkvetsa.sch.id
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}