/**
 * Load the bundled PDF.js worker URL on-demand.
 * This avoids pulling the worker into the initial JS bundle.
 */
export const getPdfWorkerSrc = async (): Promise<string> => {
  const mod = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  return (mod as { default?: string }).default ?? (mod as unknown as string);
};
