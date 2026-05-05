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
      // ━━ Palet Warna ZonaVetsa ━━
      // Navy #1a3a6b (primary) · Teal #1D9E75 (aksi) · Amber #EF9F27 (aksen) · Gray #F5F7FA (surface)
      colors: {
        // CSS variable tokens (untuk Radix UI / shadcn compat)
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
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // ━━ Brand Colors ━━
        navy: {
          50: "#eef2f9",
          100: "#d5dff0",
          200: "#b0c4e3",
          300: "#7da0d0",
          400: "#5179b8",
          500: "#3360a3",
          DEFAULT: "#1a3a6b",
          600: "#1a3a6b",
          700: "#16305a",
          800: "#112549",
          900: "#0b1830",
          950: "#060f1e",
        },
        teal: {
          50: "#e8f7f2",
          100: "#c5ece0",
          200: "#8dd8c0",
          300: "#55c4a0",
          400: "#2db285",
          DEFAULT: "#1D9E75",
          500: "#1D9E75",
          600: "#178c64",
          700: "#127852",
          800: "#0e6343",
          900: "#094d34",
          950: "#053522",
        },
        amber: {
          50: "#fff8ec",
          100: "#ffeecf",
          200: "#ffd99e",
          300: "#ffc56d",
          400: "#f7aa3c",
          DEFAULT: "#EF9F27",
          500: "#EF9F27",
          600: "#d4861a",
          700: "#b36d10",
          800: "#94560b",
          900: "#7a4508",
          950: "#522d03",
        },
        surface: {
          DEFAULT: "#F5F7FA",
          50: "#F5F7FA",
          100: "#eaecf0",
          200: "#d5d9e0",
        },

        // ━━ Semantic Colors ━━
        primary: {
          DEFAULT: "#1a3a6b",
          light: "#3360a3",
          dark: "#112549",
          darker: "#060f1e",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#1D9E75",
          light: "#2db285",
          dark: "#178c64",
          foreground: "#ffffff",
        },
        success: "#16a34a",
        warning: "#EF9F27",
        info: "#0ea5e9",
        danger: "#ef4444",
      },

      // ━━ Typography ━━
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        primary: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },

      // ━━ Backgrounds ━━
      backgroundImage: {
        "hero-gradient":
          "linear-gradient(135deg, #1a3a6b 0%, #2a5298 60%, #1D9E75 100%)",
        "card-gradient":
          "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(245,247,250,0.9))",
        "navy-gradient":
          "linear-gradient(135deg, #1a3a6b, #16305a)",
        "teal-gradient":
          "linear-gradient(135deg, #1D9E75, #178c64)",
      },

      // ━━ Shadows ━━
      boxShadow: {
        card: "0 2px 8px rgba(26, 58, 107, 0.08), 0 1px 2px rgba(26, 58, 107, 0.04)",
        "card-hover": "0 8px 24px rgba(26, 58, 107, 0.12), 0 2px 6px rgba(26, 58, 107, 0.06)",
        navy: "0 4px 14px rgba(26, 58, 107, 0.2)",
        teal: "0 4px 14px rgba(29, 158, 117, 0.25)",
        amber: "0 4px 14px rgba(239, 159, 39, 0.25)",
        panel: "0 8px 30px rgba(26, 58, 107, 0.08)",
        sidebar: "2px 0 12px rgba(26, 58, 107, 0.06)",
      },

      // ━━ Border Radius ━━
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      // ━━ Animations ━━
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.25s ease-out",
        float: "float 6s ease-in-out infinite",
        "skeleton": "skeleton 1.5s ease-in-out infinite",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        skeleton: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },

      // ━━ Spacing ━━
      spacing: {
        "safe-bottom": "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
        "safe-top": "calc(env(safe-area-inset-top, 0px) + 0.25rem)",
      },
    },
  },
  plugins: [],
};

export default config;
