import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#181818",
        porcelain: "#f7f7f4",
        ink: "#242424",
        moss: "#2f7d68",
        coral: "#d95043",
        saffron: "#c7922b",
        iris: "#5865d8",
        cloud: "#ecece6"
      },
      boxShadow: {
        premium: "0 24px 80px rgba(24, 24, 24, 0.12)",
        hairline: "0 1px 0 rgba(24, 24, 24, 0.08)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
