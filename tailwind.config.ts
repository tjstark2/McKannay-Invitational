import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/config/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        fairway: {
          50: "#eef8f1",
          100: "#d7efdf",
          700: "#17633a",
          800: "#10502f",
          900: "#0b3d25"
        },
        ink: "#0b2418",
        moss: "#4a6a32",
        green: "#1f7a3a",
        clover: "#1f7a3a",
        accent: {
          DEFAULT: "#c2a24e",
          dark: "#a8863a"
        },
        sand: {
          50: "#fbf7ef",
          100: "#f4ead8",
          200: "#e7d1aa",
          700: "#8b6327"
        },
        ocean: {
          50: "#eef8ff",
          700: "#17618b",
          900: "#0c3f5c"
        }
      },
      boxShadow: {
        phone: "0 24px 80px rgba(15, 23, 42, 0.22)"
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
