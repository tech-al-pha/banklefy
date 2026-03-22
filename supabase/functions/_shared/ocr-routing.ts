export const FULL_PAGE_OCR_COVERAGE_THRESHOLD = 10;

export const shouldUseFullPageOcrCoverage = (
  pageCount: number,
  password?: string,
): boolean => {
  const normalizedPageCount = Number.isFinite(pageCount) ? Math.max(0, Math.floor(pageCount)) : 0;
  return normalizedPageCount >= FULL_PAGE_OCR_COVERAGE_THRESHOLD || Boolean(password?.trim());
};
