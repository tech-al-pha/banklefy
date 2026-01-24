import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

/**
 * Bundled PDF.js worker URL (served from the same origin).
 * Using a bundled worker avoids cross-origin + dynamic import issues in browsers.
 */
export const PDFJS_WORKER_SRC = workerSrc;
