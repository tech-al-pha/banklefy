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
        // NOTE: Avoid custom manualChunks here.
        // We observed production/runtime crashes like:
        // "Cannot access 'X' before initialization" (hashed vendor chunks), which often comes from
        // circular dependencies split across manually-forced chunks.
        // Let Rollup/Vite decide chunk boundaries to keep cyclic graphs safe.
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
