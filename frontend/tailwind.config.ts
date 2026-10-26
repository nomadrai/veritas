import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#F5F4F0",
          elevated: "#FFFFFF",
          sunken: "#ECEAE3",
          border: "#D5D2C8",
        },
        chamber: {
          DEFAULT: "#10141A",
          panel: "#171C24",
          border: "#262E3B",
          muted: "#94A3B8",
        },
        ink: {
          DEFAULT: "#14181F",
          secondary: "#3F4756",
          muted: "#5E6778",
        },
        vermilion: {
          DEFAULT: "#B91C1C",
          surface: "#FEF2F2",
          border: "#FECACA",
        },
        amber: {
          DEFAULT: "#B45309",
          surface: "#FFFBEB",
          border: "#FDE68A",
        },
        veridian: {
          DEFAULT: "#0F766E",
          surface: "#F0FDFA",
          border: "#99F6E4",
        },
        cobalt: {
          DEFAULT: "#1D4ED8",
          surface: "#EFF6FF",
          border: "#BFDBFE",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-public-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-jetbrains-mono)",
          '"JetBrains Mono"',
          '"Fira Code"',
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
