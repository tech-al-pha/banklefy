import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const root = process.cwd();

  return {
    root,
    server: {
      host: "::",
      port: 8080,
      fs: {
        allow: [root],
      },
      middlewareMode: false,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(root, "./src"),
      },
      extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
      preserveSymlinks: false,
    },
    build: {
      target: "esnext",
      outDir: "dist",
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext",
        loader: {
          ".js": "jsx",
        },
      },
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "lucide-react",
        "sonner",
      ],
    },
  };
});
