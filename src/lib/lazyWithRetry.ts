import { lazy } from "react";

const CHUNK_RELOAD_KEY = "banklefy-chunk-reload";

const isChunkLoadError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return /Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i.test(
    error.message,
  );
};

export const lazyWithRetry = <T extends React.ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
) =>
  lazy(async () => {
    try {
      const module = await importer();
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        } catch {
          // Ignore storage failures (privacy mode/quota)
        }
      }
      return module;
    } catch (error) {
      if (typeof window !== "undefined" && isChunkLoadError(error)) {
        let hasReloaded: string | null = null;
        try {
          hasReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY);
        } catch {
          // Ignore storage failures (privacy mode/quota)
        }
        if (!hasReloaded) {
          try {
            sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");
          } catch {
            // Ignore storage failures (privacy mode/quota)
          }
          window.location.reload();
          return new Promise(() => {}) as never;
        }
      }
      throw error;
    }
  });
