import { lazy } from "react";

const CHUNK_RELOAD_KEY = "akromeda-chunk-reload";

const isChunkLoadError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  return /Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError/i.test(
    error.message,
  );
};

export const lazyWithRetry = <T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
) =>
  lazy(async () => {
    try {
      const module = await importer();
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      }
      return module;
    } catch (error) {
      if (typeof window !== "undefined" && isChunkLoadError(error)) {
        const hasReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY);
        if (!hasReloaded) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, "true");
          window.location.reload();
          return new Promise(() => {}) as never;
        }
      }
      throw error;
    }
  });
