import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/e2e/**",
    ],
  },
});
