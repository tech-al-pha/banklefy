export const getConversionResultStoragePath = (userId: string, conversionId: string): string => {
  return `${userId}/${conversionId}/result.xlsx`;
};

export const formatProcessingDuration = (totalMs?: number | null): string => {
  if (typeof totalMs !== "number" || !Number.isFinite(totalMs) || totalMs < 0) {
    return "-";
  }

  if (totalMs < 1000) {
    return `${Math.max(1, Math.round(totalMs))} ms`;
  }

  const totalSeconds = Math.round(totalMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return `${(totalMs / 1000).toFixed(totalMs >= 10000 ? 0 : 1)}s`;
};
