import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#F8F9FA",
          100: "#F1F3F5",
          200: "#E9ECEF"
        },
        bark: {
          50: "#F1FAF5",
          100: "#D8F3DC",
          200: "#B7E4C7",
          300: "#52B788",
          400: "#40916C",
          500: "#2D6A4F",
          600: "#1B4332",
          700: "#1B4332",
          800: "#143328",
          900: "#0D2818"
        },
        terracotta: {
          50: "#FFF4E6",
          100: "#FFE8CC",
          200: "#FFD4A3",
          300: "#FB8500",
          400: "#FB8500",
          500: "#E67700"
        },
        sage: {
          50: "#F1FAF5",
          100: "#D8F3DC",
          200: "#95D5B2",
          300: "#52B788"
        },
        cachorro: {
          50: "#FFF4E6",
          100: "#FFE8CC",
          400: "#FB8500",
          600: "#C66A00"
        },
        explorador: {
          50: "#E8F5EF",
          100: "#C5E4D4",
          400: "#40916C",
          600: "#1B4332"
        },
        guardian: {
          50: "#D8F3DC",
          100: "#B7E4C7",
          400: "#2D6A4F",
          600: "#143328"
        }
      },
      fontFamily: {
        sans: [
          '"Outfit"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ],
        display: [
          '"Outfit"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(27, 67, 50, 0.05), 0 10px 28px -10px rgba(27, 67, 50, 0.14)",
        ring: "0 0 0 4px rgba(251, 133, 0, 0.22)"
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
        "4xl": "2.5rem"
      },
      backgroundImage: {
        "paw-pattern":
          "radial-gradient(circle at 1px 1px, rgba(27, 67, 50, 0.08) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};

export default config;
