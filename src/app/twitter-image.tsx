import { ImageResponse } from "next/og";

export const runtime = "edge";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

export default function TwitterImage() {
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
            "linear-gradient(125deg, #022851 0%, #0a4d8f 52%, #00acc1 100%)",
          color: "white",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 1,
            background: "rgba(255,255,255,0.14)",
            borderRadius: 18,
            padding: "10px 18px",
            width: "fit-content",
          }}
        >
          ZonaVetsa
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 62, lineHeight: 1.06, fontWeight: 800 }}>
            Belajar Lebih Efektif
            <br />
            dengan ZonaVetsa
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.35, opacity: 0.96 }}>
            Portal sekolah modern untuk siswa, guru, dan admin.
          </div>
        </div>
      </div>
    ),
    size
  );
}
