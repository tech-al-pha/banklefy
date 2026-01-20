import type { Config } from "tailwindcss";

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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        lightning: "hsl(var(--lightning))",
        highlight: "hsl(var(--highlight))",
        "warm-brown": "hsl(var(--warm-brown))",
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-dark': 'var(--gradient-dark)',
        'gradient-glow': 'var(--gradient-glow)',
        'gradient-success': 'var(--gradient-success)',
        'gradient-warning': 'var(--gradient-warning)',
        'gradient-glass': 'var(--gradient-glass)',
      },
      boxShadow: {
        'neon': 'var(--shadow-neon)',
        'card': 'var(--shadow-card)',
        'lightning': 'var(--shadow-neon)',
        'luxury': 'var(--shadow-luxury)',
        'glass': 'var(--shadow-glass)',
        'glow-green': 'var(--shadow-glow-green)',
        'glow-orange': 'var(--shadow-glow-orange)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
            opacity: "0.8",
            boxShadow: "0 0 20px hsl(263 66% 48% / 0.2)",
          },
          "50%": {
            opacity: "1",
            boxShadow: "0 0 35px hsl(263 66% 48% / 0.4)",
          },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(263 66% 48% / 0.2)",
          },
          "50%": {
            boxShadow: "0 0 35px hsl(263 66% 48% / 0.35)",
          },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "subtle-pulse": {
          "0%, 100%": {
            opacity: "0.8",
          },
          "50%": {
            opacity: "1",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "lightning-flow": "lightning-flow 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.5s ease-out forwards",
        "subtle-pulse": "subtle-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
