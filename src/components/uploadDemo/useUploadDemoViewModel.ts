import { useEffect, useState } from "react";
import { formatCurrencyValue } from "@/lib/currency";
import type { BatchFilePayload } from "./types";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

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
  const { language } = useLanguage();
  const [showScanTimeCard, setShowScanTimeCard] = useState(false);
  const progressLabelsByLanguage: Record<
    Language,
    {
      uploadPreparing: string;
      readDoc: string;
      detectAmounts: string;
      categorize: string;
      reconcile: string;
      prepareOutput: string;
      uploadLabel: string;
      convertingLabel: string;
      finalizingLabel: string;
    }
  > = {
    en: {
      uploadPreparing: "Uploading file and preparing document...",
      readDoc: "Reading document structure...",
      detectAmounts: "Detecting amounts and balance columns...",
      categorize: "Categorizing and validating transactions...",
      reconcile: "Running final checks and reconciliation...",
      prepareOutput: "Preparing download output...",
      uploadLabel: "Uploading and preparing document...",
      convertingLabel: "Converting and validating transactions...",
      finalizingLabel: "Finalizing...",
    },
    ar: {
      uploadPreparing: "جارٍ رفع الملف وتجهيز المستند...",
      readDoc: "جارٍ قراءة بنية المستند...",
      detectAmounts: "جارٍ اكتشاف الأعمدة الخاصة بالمبالغ والأرصدة...",
      categorize: "جارٍ تصنيف المعاملات والتحقق منها...",
      reconcile: "جارٍ تنفيذ الفحوصات النهائية والمطابقة...",
      prepareOutput: "جارٍ تجهيز ملف التنزيل...",
      uploadLabel: "جارٍ الرفع وتجهيز المستند...",
      convertingLabel: "جارٍ التحويل والتحقق من المعاملات...",
      finalizingLabel: "جارٍ الإنهاء...",
    },
    zh: {
      uploadPreparing: "正在上传文件并准备文档...",
      readDoc: "正在读取文档结构...",
      detectAmounts: "正在识别金额与余额列...",
      categorize: "正在分类并校验交易...",
      reconcile: "正在执行最终校验与对账...",
      prepareOutput: "正在准备下载文件...",
      uploadLabel: "正在上传并准备文档...",
      convertingLabel: "正在转换并校验交易...",
      finalizingLabel: "正在收尾...",
    },
    es: {
      uploadPreparing: "Subiendo archivo y preparando documento...",
      readDoc: "Leyendo la estructura del documento...",
      detectAmounts: "Detectando importes y columnas de saldo...",
      categorize: "Categorizando y validando transacciones...",
      reconcile: "Ejecutando comprobaciones finales y conciliación...",
      prepareOutput: "Preparando archivo de descarga...",
      uploadLabel: "Subiendo y preparando documento...",
      convertingLabel: "Convirtiendo y validando transacciones...",
      finalizingLabel: "Finalizando...",
    },
    hi: {
      uploadPreparing: "फाइल अपलोड करके डॉक्यूमेंट तैयार किया जा रहा है...",
      readDoc: "डॉक्यूमेंट संरचना पढ़ी जा रही है...",
      detectAmounts: "Amounts और balance columns detect किए जा रहे हैं...",
      categorize: "Transactions categorize और validate किए जा रहे हैं...",
      reconcile: "Final checks और reconciliation चल रहा है...",
      prepareOutput: "Download output तैयार किया जा रहा है...",
      uploadLabel: "अपलोड और डॉक्यूमेंट तैयारी जारी है...",
      convertingLabel: "कन्वर्ज़न और वैलिडेशन जारी है...",
      finalizingLabel: "फाइनलाइज किया जा रहा है...",
    },
  };
  const progressLabels = progressLabelsByLanguage[language] ?? progressLabelsByLanguage.en;

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
    ? progressLabels.uploadPreparing
    : progressStep < 45
      ? progressLabels.readDoc
      : progressStep < 65
        ? progressLabels.detectAmounts
        : progressStep < 82
          ? progressLabels.categorize
          : progressStep < 96
            ? progressLabels.reconcile
            : progressLabels.prepareOutput;

  return {
    pluralize,
    formatRemaining,
    formatAmountNoSymbol,
    truncateDecimals,
    setShowScanTimeCard,
    showImageProcessingHint,
    conversionProgressDetail,
    uploadingLabel: progressLabels.uploadLabel,
    convertingLabel: progressLabels.convertingLabel,
    finalizingLabel: progressLabels.finalizingLabel,
  };
};
