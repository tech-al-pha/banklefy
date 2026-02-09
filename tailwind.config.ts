import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const surfacePalette = {
  300: "var(--text-muted)",
  400: "var(--text-muted)",
  500: "var(--surface)",
  600: "var(--surface-elevated)",
};

const surfaceColorAliases = [
  "amber",
  "blue",
  "cyan",
  "emerald",
  "gray",
  "green",
  "indigo",
  "lime",
  "orange",
  "pink",
  "purple",
  "rose",
  "slate",
  "teal",
  "yellow",
  "zinc",
];

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        ink: "var(--ink)",
        background: "var(--background)",
        foreground: "var(--text-body)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--text-primary)",
        primary: {
          DEFAULT: "var(--text-primary)",
          foreground: "var(--surface)",
        },
        secondary: {
          DEFAULT: "var(--surface-elevated)",
          foreground: "var(--text-body)",
        },
        destructive: {
          DEFAULT: "var(--ink)",
          foreground: "var(--text-primary)",
        },
        muted: {
          DEFAULT: "var(--background)",
          foreground: "var(--text-muted)",
        },
        accent: {
          DEFAULT: "var(--text-primary)",
          foreground: "var(--ink)",
        },
        popover: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-body)",
        },
        card: {
          DEFAULT: "var(--surface)",
          foreground: "var(--text-body)",
        },
        lightning: "var(--text-primary)",
        highlight: "var(--text-primary)",
        ...surfaceColorAliases.reduce((acc, name) => {
          acc[name] = surfacePalette;
          return acc;
        }, {} as Record<string, typeof surfacePalette>),
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(120deg, #FFFFFF 0%, #B5B5B5 50%, #717171 100%)",
        "gradient-dark": "linear-gradient(180deg, #000000 0%, #000000 100%)",
        "gradient-glow": "radial-gradient(circle at center, rgba(255,255,255,0.18), transparent 65%)",
        "gradient-lightning": "linear-gradient(90deg, transparent, #FFFFFF, transparent)",
      },
      boxShadow: {
        neon: "0 0 24px rgba(255,255,255,0.25)",
        card: "0 20px 40px -15px rgba(0,0,0,0.6)",
        lightning: "0 0 30px rgba(255,255,255,0.2)",
        luxury: "0 30px 60px -25px rgba(0,0,0,0.7)",
      },
      borderRadius: {
        sm: "14px",
        md: "16px",
        lg: "18px",
        xl: "18px",
        "2xl": "18px",
        "3xl": "18px",
        full: "9999px",
      },
      transitionDuration: {
        DEFAULT: "220ms",
        75: "220ms",
        100: "220ms",
        150: "220ms",
        200: "220ms",
        300: "220ms",
        500: "220ms",
        700: "220ms",
        1000: "220ms",
      },
      transitionTimingFunction: {
        DEFAULT: "ease-out",
        linear: "ease-out",
        in: "ease-out",
        out: "ease-out",
        "in-out": "ease-out",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "lightning-flow": {
          "0%, 100%": {
            backgroundPosition: "0% 50%",
          },
          "50%": {
            backgroundPosition: "100% 50%",
          },
        },
        "pulse-glow": {
          "0%, 100%": {
            opacity: "0.5",
            boxShadow: "0 0 18px rgba(255,255,255,0.25)",
          },
          "50%": {
            opacity: "1",
            boxShadow: "0 0 28px rgba(255,255,255,0.3), 0 0 45px rgba(255,255,255,0.2)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "lightning-flow": "lightning-flow 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
