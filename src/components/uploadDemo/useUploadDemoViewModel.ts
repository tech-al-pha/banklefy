import { useEffect, useState } from "react";
import { formatCurrencyValue } from "@/lib/currency";
import type { BatchFilePayload } from "./types";

type PreparedPdfDataRef = {
  current: Map<
    string,
    { transactions?: BatchFilePayload["pdfParsedTransactions"]; bankMetadata?: BatchFilePayload["pdfParsedBankMetadata"] }
  >;
};

type UseUploadDemoViewModelArgs = {
  selectedFiles: File[];
  planType?: string;
  conversionsLimit?: number;
  isAuthenticated: boolean;
  currencyCode: string;
  progressStep: number;
  uploading: boolean;
  preparedPdfDataRef: PreparedPdfDataRef;
};

export const useUploadDemoViewModel = ({
  selectedFiles,
  planType,
  conversionsLimit,
  currencyCode,
  progressStep,
  uploading,
  preparedPdfDataRef,
}: UseUploadDemoViewModelArgs) => {
  const [showScanTimeCard, setShowScanTimeCard] = useState(false);

  useEffect(() => {
    if (selectedFiles.length === 0) {
      setShowScanTimeCard(false);
      return;
    }

    const hasDirectImageUpload = selectedFiles.some((file) => /\.(png|jpe?g)$/i.test(file.name));
    if (hasDirectImageUpload) {
      setShowScanTimeCard(true);
      return;
    }

    setShowScanTimeCard(false);
  }, [selectedFiles]);

  const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
    count === 1 ? singular : plural;

  const formatRemaining = (remaining?: number) => {
    if (remaining === null || remaining === undefined) return "";
    const normalizedPlan = (planType ?? "free").toLowerCase();
    const isUnlimitedPlan =
      normalizedPlan === "unlimited" && Number.isFinite(conversionsLimit) && (conversionsLimit ?? 0) >= 900000;
    const isPerPagePlan = normalizedPlan.startsWith("per_page");
    const isKnownPaidPlan = isPerPagePlan || isUnlimitedPlan;
    const isFreeMode = !isKnownPaidPlan;

    const conversionLabel = pluralize(remaining, "conversion");
    const pageLabel = pluralize(remaining, "page");

    if (isFreeMode) {
      return `${remaining} ${conversionLabel} remaining today.`;
    }
    if (isUnlimitedPlan) {
      return "Unlimited pages remaining.";
    }
    if (isPerPagePlan) {
      return `${remaining} ${pageLabel} remaining in your pack.`;
    }
    return `${remaining} ${pageLabel} remaining.`;
  };

  const formatAmountNoSymbol = (
    value: number,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
      signDisplay?: "auto" | "always" | "never";
    },
  ) => formatCurrencyValue(value ?? 0, currencyCode, { ...options, showSymbol: false });

  const truncateDecimals = (value: number, decimals = 2) => {
    const factor = 10 ** decimals;
    if (!Number.isFinite(value)) return 0;
    return Math.trunc(value * factor) / factor;
  };

  const showImageProcessingHint =
    showScanTimeCard ||
    selectedFiles.some((file) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) return false;
      const cached = preparedPdfDataRef.current.get(`${file.name}__${file.size}__${file.lastModified}`);
      return !cached?.transactions || cached.transactions.length === 0;
    });

  const conversionProgressDetail = uploading
    ? "Uploading file and preparing document..."
    : progressStep < 45
      ? "Reading document structure..."
      : progressStep < 65
        ? "Detecting amounts and balance columns..."
        : progressStep < 82
          ? "Categorizing and validating transactions..."
          : progressStep < 96
            ? "Running final checks and reconciliation..."
            : "Preparing download output...";

  return {
    pluralize,
    formatRemaining,
    formatAmountNoSymbol,
    truncateDecimals,
    setShowScanTimeCard,
    showImageProcessingHint,
    conversionProgressDetail,
    uploadingLabel: "Uploading and preparing document...",
    convertingLabel: "Converting and validating transactions...",
    finalizingLabel: "Finalizing...",
  };
};
