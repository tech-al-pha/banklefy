import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Avoid noisy warnings in CI/local builds when caniuse-lite is stale.
  // Updating is still recommended when network access is available.
  process.env.BROWSERSLIST_IGNORE_OLD_DATA ??= "true";

  return ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    // pdf.worker.min.mjs is ~1.3MB (emitted as a separate asset); keep the warning threshold realistic.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          const parts = id.split("node_modules/")[1].split("/");
          const pkg = parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];

          if (pkg === "react" || pkg === "react-dom") return "vendor-react";
          if (pkg === "react-router" || pkg === "react-router-dom") return "vendor-router";
          if (pkg.startsWith("@radix-ui")) return "vendor-radix";
          if (pkg.startsWith("@supabase")) return "vendor-supabase";
          if (pkg.startsWith("@tanstack")) return "vendor-tanstack";
          if (pkg === "pdfjs-dist") return "vendor-pdf";
          if (pkg === "recharts") return "vendor-charts";
          if (pkg === "lucide-react") return "vendor-icons";
          if (pkg === "date-fns") return "vendor-date";
          if (pkg === "zod") return "vendor-zod";

          return "vendor-misc";
        },
      },
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  });
});
