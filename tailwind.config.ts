import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "#0f4c81",
          light: "#1d70b8",
          dark: "#0b3559",
          darker: "#071f38",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "#f4b942",
          light: "#ffd56f",
          dark: "#c18d19",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "#16a34a",
        warning: "#f59e0b",
        info: "#0ea5e9",
        danger: "#ef4444",
        cyber: {
          DEFAULT: "#06b6d4",
          light: "#67e8f9",
          dark: "#0e7490",
          glow: "#22d3ee",
        },
        neon: {
          DEFAULT: "#22c55e",
          light: "#4ade80",
          dark: "#15803d",
          glow: "#4ade80",
        },
        ai: {
          DEFAULT: "#2563eb",
          light: "#60a5fa",
          dark: "#1d4ed8",
          glow: "#60a5fa",
        },
        network: {
          DEFAULT: "#334155",
          light: "#64748b",
          dark: "#0f172a",
        },
        connection: {
          DEFAULT: "#0ea5e9",
          light: "#7dd3fc",
          dark: "#0369a1",
        },
        surface: {
          DEFAULT: "#ffffff",
          dark: "#0f172a",
          darker: "#020617",
        },
      },
      fontFamily: {
        primary: ["var(--font-space-grotesk)", "sans-serif"],
        sans: ["var(--font-poppins)", "sans-serif"],
        mono: ["Source Code Pro", "monospace"],
      },
      backgroundImage: {
        "network-radial":
          "radial-gradient(circle at top left, rgba(14,165,233,0.18), transparent 28%), radial-gradient(circle at right center, rgba(245,158,11,0.14), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.92), rgba(240,247,255,0.92))",
        "hero-network":
          "linear-gradient(120deg, rgba(15,76,129,0.08), rgba(14,165,233,0.02) 45%, rgba(245,158,11,0.08))",
        "signal-line":
          "linear-gradient(90deg, transparent 0%, rgba(14,165,233,0.25) 48%, transparent 100%)",
        "grid-pattern":
          "linear-gradient(rgba(15,76,129,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,76,129,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
      boxShadow: {
        glow: "0 12px 35px rgba(14, 165, 233, 0.18)",
        "glow-neon": "0 12px 35px rgba(34, 197, 94, 0.18)",
        "glow-ai": "0 12px 35px rgba(37, 99, 235, 0.18)",
        "glow-gold": "0 12px 35px rgba(245, 158, 11, 0.18)",
        panel: "0 24px 70px rgba(15, 23, 42, 0.1)",
      },
      borderRadius: {
        xl: "1.25rem",
        "2xl": "1.6rem",
        "3xl": "2rem",
        "4xl": "2.5rem",
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.8s ease-in-out infinite",
        "data-flow": "beam-flow 8s linear infinite",
        "node-pulse": "node-pulse 5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(14,165,233,0.18)" },
          "50%": { boxShadow: "0 0 0 10px rgba(14,165,233,0.06)" },
        },
        "beam-flow": {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-40% 0" },
        },
        "node-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.12)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
