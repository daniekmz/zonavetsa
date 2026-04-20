import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background:
            "linear-gradient(135deg, #002b5b 0%, #004a99 45%, #00bcd4 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 1,
            background: "rgba(255,255,255,0.16)",
            borderRadius: 18,
            padding: "10px 18px",
            width: "fit-content",
          }}
        >
          ZonaVetsa
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 66, lineHeight: 1.05, fontWeight: 800 }}>
            Portal Digital
            <br />
            SMK Veteran 1 Sukoharjo
          </div>
          <div style={{ fontSize: 32, lineHeight: 1.35, opacity: 0.96 }}>
            Materi, tugas, ujian, absensi QR, dan galeri karya dalam satu platform.
          </div>
        </div>
      </div>
    ),
    size
  );
}
