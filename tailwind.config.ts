import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FBF8F3",
          100: "#F5EFE3",
          200: "#EADFC7"
        },
        bark: {
          50: "#F7F1EA",
          100: "#E8DCCB",
          200: "#C9AE8C",
          300: "#A88660",
          400: "#8B5E3C",
          500: "#6F4626",
          600: "#54331A",
          700: "#3B2210",
          800: "#221308"
        },
        terracotta: {
          50: "#FBEEE8",
          100: "#F4D4C5",
          200: "#EAA98C",
          300: "#E07A5F",
          400: "#C95E45",
          500: "#A04631"
        },
        sage: {
          50: "#F2F5F0",
          100: "#DDE5D6",
          200: "#A9BD9B",
          300: "#7E9871"
        },
        // Niveles de lealtad
        cachorro: {
          50: "#FBF1E5",
          100: "#F4E0C7",
          400: "#C68A4F",
          600: "#7A4E22"
        },
        explorador: {
          50: "#EAF1FB",
          100: "#CFE0F5",
          400: "#3F78C9",
          600: "#1F4D8C"
        },
        guardian: {
          50: "#F1ECF8",
          100: "#DCD0EE",
          400: "#7B5BB0",
          600: "#4A2F7A"
        }
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ],
        display: ['"Fraunces"', "Georgia", "serif"]
      },
      boxShadow: {
        soft: "0 1px 2px rgba(60,40,20,0.04), 0 8px 24px -8px rgba(60,40,20,0.10)",
        ring: "0 0 0 4px rgba(224,122,95,0.18)"
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem"
      },
      backgroundImage: {
        "paw-pattern":
          "radial-gradient(circle at 1px 1px, rgba(139,94,60,0.08) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};

export default config;
