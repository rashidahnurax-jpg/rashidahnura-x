import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: "#EAF4F3",
          100: "#CFE6E3",
          200: "#9FCDC8",
          300: "#6BB3AC",
          400: "#3E948C",
          500: "#1F756E",
          600: "#135F5A",
          700: "#0D4B48",
          800: "#0A3B39",
          900: "#082F2E",
          950: "#052322",
        },
        turquoise: {
          DEFAULT: "#30D5B4",
          soft: "#7BE8D1",
          deep: "#139E84",
        },
        cream: {
          DEFAULT: "#FFFDD0",
          soft: "#FFFEF0",
          deep: "#F6F1D8",
        },
        gold: {
          DEFAULT: "#C9A45B",
          light: "#E4C98D",
          deep: "#A47F3B",
        },
        ink: "#0E2322",
        mist: "#F4F5EE",
      },
      fontFamily: {
        serif: ["'Fraunces Variable'", "Fraunces", "Georgia", "serif"],
        sans: ["'Manrope Variable'", "Manrope", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        label: "0.22em",
      },
      boxShadow: {
        lift: "0 24px 60px -24px rgba(8, 47, 46, 0.35)",
        card: "0 1px 0 rgba(8,47,46,0.06), 0 18px 40px -30px rgba(8,47,46,0.4)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both",
        fadeIn: "fadeIn 0.4s ease both",
        slideUp: "slideUp 0.35s cubic-bezier(0.22,1,0.36,1) both",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
