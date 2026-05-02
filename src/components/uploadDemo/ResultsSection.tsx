import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle,
  CheckCircle,
  Crown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Lock,
  PieChart,
  ShieldAlert,
  ScanSearch,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";
import { UnderwritingPanel } from "@/components/UnderwritingPanel";
import { FraudAlertPanel } from "@/components/FraudAlertPanel";
import { categoryColors, supportedBanks } from "./constants";
import { parseStatementDateToIso } from "@/lib/date-parsing";
import type {
  Analytics,
  MergeInfo,
  Transaction,
} from "./types";

type PremiumFormat = "tally" | "quickbooks" | "xero" | "zoho";

type ToneName = "excellent" | "good" | "moderate" | "bad";
const toneClasses: Record<ToneName, { border: string; text: string }> = {
  excellent: { border: "border-[hsl(var(--tone-excellent-border))]", text: "tone-excellent-text" },
  good: { border: "border-[hsl(var(--tone-good-border))]", text: "tone-good-text" },
  moderate: { border: "border-[hsl(var(--tone-moderate-border))]", text: "tone-moderate-text" },
  bad: { border: "border-[hsl(var(--tone-bad-border))]", text: "tone-bad-text" },
};

const getCreditTone = (totalCredits: number): ToneName => (totalCredits > 0 ? "excellent" : "bad");
const getDebitTone = (totalCredits: number, totalDebits: number): ToneName => {
  if (totalDebits <= 0) return "moderate";
  if (totalCredits <= 0) return "bad";
  const ratio = totalDebits / totalCredits;
  if (ratio <= 0.7) return "good";
  if (ratio <= 1.0) return "moderate";
  return "bad";
};
const getNetFlowTone = (netFlow: number, totalCredits: number): ToneName => {
  if (netFlow > 0) return "excellent";
  if (netFlow === 0) return "moderate";
  if (totalCredits > 0 && Math.abs(netFlow) / totalCredits <= 0.2) return "moderate";
  return "bad";
};

type FormatAmountFn = (
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    signDisplay?: "auto" | "always" | "never";
  },
) => string;

type ResultsSectionProps = {
  batchResults: Array<{ status: "success" | "error" }>;
  batchDownloading: boolean;
  mergeInfo: MergeInfo | null;
  mergeResult: { excelData?: string; resultPath?: string | null; fileName: string } | null;
  mergeDownloading: boolean;
  handleBatchDownload: () => Promise<void>;
  handleMergedDownload: () => Promise<void>;
  conversionResult: { id: string | null; resultPath: string | null; excelData?: string } | null;
  singleDownloadFileName?: string;
  downloading: boolean;
  handleDownload: () => Promise<void>;
  transactions: Transaction[];
  isPaidUser: boolean;
  hasTallyAccess: boolean;
  exportAsCSV: () => Promise<void>;
  handleTallyExport: () => Promise<boolean>;
  handlePremiumExport: (format: "json" | "mt940" | "quickbooks" | "xero" | "zoho" | "tally") => void;
  converting: boolean;
  analytics: Analytics | null;
  currencyCode: string;
  showDuplicatesOnly: boolean;
  setShowDuplicatesOnly: (value: boolean) => void;
  formatAmountNoSymbol: FormatAmountFn;
  truncateDecimals: (value: number, decimals?: number) => number;
  showEditDetectorSignals?: boolean;
  resultMode?: "standard" | "tally_only";
  editedPdfCheckResult?: { fileName: string; status: "clean" | "suspected"; reason: string } | null;
  showUnderwriting?: boolean;
  showFraudSignals?: boolean;
  conversionProgressPercent?: number;
  conversionProgressLabel?: string;
  conversionProgressSubLabel?: string;
  showImageProcessingHint?: boolean;
  selectedPremiumFormat?: PremiumFormat | null;
};

export const ResultsSection = ({
  batchResults,
  batchDownloading,
  mergeInfo,
  mergeResult,
  mergeDownloading,
  handleBatchDownload,
  handleMergedDownload,
  conversionResult,
  singleDownloadFileName = "",
  downloading,
  handleDownload,
  transactions,
  isPaidUser,
  hasTallyAccess,
  exportAsCSV,
  handleTallyExport,
  handlePremiumExport,
  converting,
  analytics,
  currencyCode,
  showDuplicatesOnly,
  setShowDuplicatesOnly,
  formatAmountNoSymbol,
  truncateDecimals,
  showEditDetectorSignals = true,
  resultMode = "standard",
  editedPdfCheckResult = null,
  showUnderwriting = true,
  showFraudSignals = true,
  conversionProgressPercent = 0,
  conversionProgressLabel = "",
  conversionProgressSubLabel = "",
  showImageProcessingHint = false,
  selectedPremiumFormat = null,
}: ResultsSectionProps) => {
  const { language } = useLanguage();
  const localizedCopyByLanguage: Record<
    Language,
    {
      textBasedTitle: string;
      textBasedDesc: string;
      scannedTitle: string;
      scannedDesc: string;
      step1Title: string;
      step1Desc: string;
      step2Title: string;
      step2Desc: string;
      step3Title: string;
      step3Desc: string;
      banksCompatible: string;
      manyMore: string;
    }
  > = {
    en: {
      textBasedTitle: "Text-based PDFs",
      textBasedDesc: "Usually finish faster through deterministic parsing, but very large files still need more validation.",
      scannedTitle: "Scanned / image-based PDFs",
      scannedDesc: "We run deeper OCR checks for cleaner extraction, so these usually take longer.",
      step1Title: "1. Upload",
      step1Desc: "Drag & drop your statement",
      step2Title: "2. AI Processing",
      step2Desc: "Our AI extracts data",
      step3Title: "3. Download",
      step3Desc: "Get your Excel file",
      banksCompatible: "Compatible with most major banks worldwide",
      manyMore: "Many more...",
    },
    ar: {
      textBasedTitle: "ملفات PDF النصية",
      textBasedDesc: "تنتهي عادةً أسرع عبر التحليل الحتمي، لكن الملفات الكبيرة جدًا تحتاج تحققًا إضافيًا.",
      scannedTitle: "ملفات PDF الممسوحة / المعتمدة على الصور",
      scannedDesc: "نُجري فحوصات OCR أعمق لاستخراج أنظف، لذلك تستغرق هذه عادةً وقتًا أطول.",
      step1Title: "1. الرفع",
      step1Desc: "اسحب وأفلت كشف الحساب",
      step2Title: "2. المعالجة بالذكاء الاصطناعي",
      step2Desc: "الذكاء الاصطناعي يستخرج البيانات",
      step3Title: "3. التنزيل",
      step3Desc: "احصل على ملف Excel",
      banksCompatible: "متوافق مع أغلب البنوك الرئيسية عالميًا",
      manyMore: "والمزيد...",
    },
    zh: {
      textBasedTitle: "文本型 PDF",
      textBasedDesc: "通常通过确定性解析更快完成，但超大文件仍需要更多校验。",
      scannedTitle: "扫描 / 图像型 PDF",
      scannedDesc: "我们会执行更深入的 OCR 检查以获得更干净的提取结果，因此通常更慢。",
      step1Title: "1. 上传",
      step1Desc: "拖拽上传你的流水",
      step2Title: "2. AI 处理",
      step2Desc: "AI 自动提取数据",
      step3Title: "3. 下载",
      step3Desc: "获取你的 Excel 文件",
      banksCompatible: "兼容全球大多数主流银行",
      manyMore: "更多银行持续支持中...",
    },
    es: {
      textBasedTitle: "PDF basados en texto",
      textBasedDesc: "Suelen terminar más rápido con análisis determinista, pero los archivos muy grandes aún requieren más validación.",
      scannedTitle: "PDF escaneados / basados en imagen",
      scannedDesc: "Ejecutamos comprobaciones OCR más profundas para una extracción más limpia, por eso suelen tardar más.",
      step1Title: "1. Subir",
      step1Desc: "Arrastra y suelta tu extracto",
      step2Title: "2. Procesamiento con IA",
      step2Desc: "Nuestra IA extrae los datos",
      step3Title: "3. Descargar",
      step3Desc: "Obtén tu archivo Excel",
      banksCompatible: "Compatible con la mayoría de bancos importantes del mundo",
      manyMore: "Muchos más...",
    },
    hi: {
      textBasedTitle: "Text-based PDFs",
      textBasedDesc: "Deterministic parsing से ये आमतौर पर जल्दी खत्म होते हैं, लेकिन बहुत बड़ी फाइलों में extra validation लगता है.",
      scannedTitle: "Scanned / image-based PDFs",
      scannedDesc: "Cleaner extraction के लिए हम deeper OCR checks चलाते हैं, इसलिए इनमें थोड़ा ज्यादा समय लगता है.",
      step1Title: "1. Upload",
      step1Desc: "अपना स्टेटमेंट drag & drop करें",
      step2Title: "2. AI Processing",
      step2Desc: "हमारा AI data extract करता है",
      step3Title: "3. Download",
      step3Desc: "अपनी Excel फाइल पाएं",
      banksCompatible: "दुनिया के अधिकांश बड़े बैंकों के साथ compatible",
      manyMore: "और भी बहुत सारे...",
    },
  };
  const localizedCopy = localizedCopyByLanguage[language] ?? localizedCopyByLanguage.en;
  const actionCopyByLanguage: Record<
    Language,
    {
      downloadOptions: string;
      downloading: string;
      preparing: string;
      mergeDisabled: string;
      conditionsNotMet: string;
      convertedSummary: string;
      conversionComplete: string;
      batchConversionComplete: string;
      tallyConversionComplete: string;
      batchTallyConversionComplete: string;
      downloadYourFile: string;
      downloadExcel: string;
      lockedFormatsSuffixSingle: string;
      lockedFormatsSuffixPlural: string;
      planGatedFormats: string;
      editPdfCheck: string;
      possibleEditDetected: string;
      noEditSignalDetected: string;
      processingConversion: string;
      preparingDocument: string;
      premiumFormats: string;
      soon: string;
      downloadPrefix: string;
      separateExcel: string;
      mergeExcel: string;
      financialAnalytics: string;
      totalCredits: string;
      totalDebits: string;
      netFlow: string;
      duplicatesFound: string;
      categoryBreakdown: string;
      extractedTransactions: string;
      showAll: string;
      showDuplicates: (count: number) => string;
      transactionsFound: (count: number) => string;
      date: string;
      description: string;
      category: string;
      debit: string;
      credit: string;
      balance: string;
      balanceMismatchExpected: string;
      riskFlag: string;
      potentialDuplicate: string;
      expected: string;
      na: string;
    }
  > = {
    en: {
      downloadOptions: "Download options:",
      downloading: "Downloading...",
      preparing: "Preparing...",
      mergeDisabled: "Merge disabled:",
      conditionsNotMet: "Conditions not met",
      convertedSummary: "Successfully converted:",
      conversionComplete: "Conversion Complete!",
      batchConversionComplete: "Batch Conversion Complete!",
      tallyConversionComplete: "Tally Conversion Complete!",
      batchTallyConversionComplete: "Batch Tally Conversion Complete!",
      downloadYourFile: "Download your file:",
      downloadExcel: "Download Excel",
      lockedFormatsSuffixSingle: "is",
      lockedFormatsSuffixPlural: "are",
      planGatedFormats: "plan-gated formats",
      editPdfCheck: "Edit PDF Check:",
      possibleEditDetected: "Possible edit detected",
      noEditSignalDetected: "No edit signal detected",
      processingConversion: "Processing conversion...",
      preparingDocument: "Preparing document...",
      premiumFormats: "Premium Formats",
      soon: "Soon",
      downloadPrefix: "Download",
      separateExcel: "Separate Excel",
      mergeExcel: "Merge Excel",
      financialAnalytics: "Financial Analytics",
      totalCredits: "Total Credits",
      totalDebits: "Total Debits",
      netFlow: "Net Flow",
      duplicatesFound: "Duplicates Found",
      categoryBreakdown: "Category Breakdown",
      extractedTransactions: "Extracted Transactions",
      showAll: "Show All",
      showDuplicates: (count) => `Show Duplicates (${count})`,
      transactionsFound: (count) => `${count} transaction${count !== 1 ? "s" : ""} found`,
      date: "Date",
      description: "Description",
      category: "Category",
      debit: "Debit",
      credit: "Credit",
      balance: "Balance",
      balanceMismatchExpected: "Balance mismatch! Expected:",
      riskFlag: "Risk Flag:",
      potentialDuplicate: "Potential duplicate",
      expected: "Expected:",
      na: "N/A",
    },
    ar: {
      downloadOptions: "خيارات التنزيل:",
      downloading: "جارٍ التنزيل...",
      preparing: "جارٍ التحضير...",
      mergeDisabled: "الدمج معطل:",
      conditionsNotMet: "الشروط غير مستوفاة",
      convertedSummary: "تم التحويل بنجاح:",
      conversionComplete: "اكتمل التحويل!",
      batchConversionComplete: "اكتمل تحويل الدفعة!",
      tallyConversionComplete: "اكتمل تحويل Tally!",
      batchTallyConversionComplete: "اكتمل تحويل الدفعة إلى Tally!",
      downloadYourFile: "نزّل ملفك:",
      downloadExcel: "تنزيل Excel",
      lockedFormatsSuffixSingle: "تنسيق",
      lockedFormatsSuffixPlural: "تنسيقات",
      planGatedFormats: "مقيدة بالخطة",
      editPdfCheck: "فحص تعديل PDF:",
      possibleEditDetected: "تم رصد تعديل محتمل",
      noEditSignalDetected: "لم يتم رصد إشارة تعديل",
      processingConversion: "جارٍ معالجة التحويل...",
      preparingDocument: "جارٍ تجهيز المستند...",
      premiumFormats: "صيغ مميزة",
      soon: "قريبًا",
      downloadPrefix: "تنزيل",
      separateExcel: "Excel منفصل",
      mergeExcel: "دمج Excel",
      financialAnalytics: "تحليلات مالية",
      totalCredits: "إجمالي الدائن",
      totalDebits: "إجمالي المدين",
      netFlow: "صافي التدفق",
      duplicatesFound: "تكرارات مكتشفة",
      categoryBreakdown: "توزيع الفئات",
      extractedTransactions: "المعاملات المستخرجة",
      showAll: "عرض الكل",
      showDuplicates: (count) => `عرض التكرارات (${count})`,
      transactionsFound: (count) => `تم العثور على ${count} معاملة`,
      date: "التاريخ",
      description: "الوصف",
      category: "الفئة",
      debit: "مدين",
      credit: "دائن",
      balance: "الرصيد",
      balanceMismatchExpected: "عدم تطابق الرصيد! المتوقع:",
      riskFlag: "إشارة المخاطر:",
      potentialDuplicate: "تكرار محتمل",
      expected: "المتوقع:",
      na: "غير متاح",
    },
    zh: {
      downloadOptions: "下载选项：",
      downloading: "正在下载...",
      preparing: "正在准备...",
      mergeDisabled: "合并不可用：",
      conditionsNotMet: "条件不满足",
      convertedSummary: "成功转换：",
      conversionComplete: "转换完成！",
      batchConversionComplete: "批量转换完成！",
      tallyConversionComplete: "Tally 转换完成！",
      batchTallyConversionComplete: "批量 Tally 转换完成！",
      downloadYourFile: "下载你的文件：",
      downloadExcel: "下载 Excel",
      lockedFormatsSuffixSingle: "为",
      lockedFormatsSuffixPlural: "为",
      planGatedFormats: "方案受限格式",
      editPdfCheck: "PDF 编辑检查：",
      possibleEditDetected: "检测到可能编辑",
      noEditSignalDetected: "未检测到编辑信号",
      processingConversion: "正在处理转换...",
      preparingDocument: "正在准备文档...",
      premiumFormats: "高级格式",
      soon: "即将推出",
      downloadPrefix: "下载",
      separateExcel: "分别下载 Excel",
      mergeExcel: "合并 Excel",
      financialAnalytics: "财务分析",
      totalCredits: "总收入",
      totalDebits: "总支出",
      netFlow: "净现金流",
      duplicatesFound: "发现重复项",
      categoryBreakdown: "分类明细",
      extractedTransactions: "提取的交易",
      showAll: "显示全部",
      showDuplicates: (count) => `仅看重复 (${count})`,
      transactionsFound: (count) => `找到 ${count} 笔交易`,
      date: "日期",
      description: "描述",
      category: "分类",
      debit: "支出",
      credit: "收入",
      balance: "余额",
      balanceMismatchExpected: "余额不匹配！应为：",
      riskFlag: "风险标记：",
      potentialDuplicate: "可能重复",
      expected: "应为：",
      na: "无",
    },
    es: {
      downloadOptions: "Opciones de descarga:",
      downloading: "Descargando...",
      preparing: "Preparando...",
      mergeDisabled: "Combinación deshabilitada:",
      conditionsNotMet: "No se cumplen las condiciones",
      convertedSummary: "Convertido correctamente:",
      conversionComplete: "¡Conversión completada!",
      batchConversionComplete: "¡Conversión por lotes completada!",
      tallyConversionComplete: "¡Conversión a Tally completada!",
      batchTallyConversionComplete: "¡Conversión por lotes a Tally completada!",
      downloadYourFile: "Descarga tu archivo:",
      downloadExcel: "Descargar Excel",
      lockedFormatsSuffixSingle: "está",
      lockedFormatsSuffixPlural: "están",
      planGatedFormats: "bloqueados por plan",
      editPdfCheck: "Revisión de edición PDF:",
      possibleEditDetected: "Posible edición detectada",
      noEditSignalDetected: "No se detectó señal de edición",
      processingConversion: "Procesando conversión...",
      preparingDocument: "Preparando documento...",
      premiumFormats: "Formatos premium",
      soon: "Pronto",
      downloadPrefix: "Descargar",
      separateExcel: "Excel por separado",
      mergeExcel: "Combinar Excel",
      financialAnalytics: "Analítica financiera",
      totalCredits: "Créditos totales",
      totalDebits: "Débitos totales",
      netFlow: "Flujo neto",
      duplicatesFound: "Duplicados encontrados",
      categoryBreakdown: "Desglose por categoría",
      extractedTransactions: "Transacciones extraídas",
      showAll: "Mostrar todo",
      showDuplicates: (count) => `Mostrar duplicados (${count})`,
      transactionsFound: (count) => `${count} transacción(es) encontrada(s)`,
      date: "Fecha",
      description: "Descripción",
      category: "Categoría",
      debit: "Débito",
      credit: "Crédito",
      balance: "Saldo",
      balanceMismatchExpected: "¡Descuadre de saldo! Esperado:",
      riskFlag: "Bandera de riesgo:",
      potentialDuplicate: "Posible duplicado",
      expected: "Esperado:",
      na: "N/D",
    },
    hi: {
      downloadOptions: "डाउनलोड विकल्प:",
      downloading: "डाउनलोड हो रहा है...",
      preparing: "तैयार किया जा रहा है...",
      mergeDisabled: "मर्ज उपलब्ध नहीं:",
      conditionsNotMet: "शर्तें पूरी नहीं हुईं",
      convertedSummary: "सफलतापूर्वक कन्वर्ट:",
      conversionComplete: "कन्वर्ज़न पूरा हुआ!",
      batchConversionComplete: "बैच कन्वर्ज़न पूरा हुआ!",
      tallyConversionComplete: "Tally कन्वर्ज़न पूरा हुआ!",
      batchTallyConversionComplete: "बैच Tally कन्वर्ज़न पूरा हुआ!",
      downloadYourFile: "अपनी फ़ाइल डाउनलोड करें:",
      downloadExcel: "Excel डाउनलोड करें",
      lockedFormatsSuffixSingle: "है",
      lockedFormatsSuffixPlural: "हैं",
      planGatedFormats: "प्लान-गेटेड फ़ॉर्मैट",
      editPdfCheck: "PDF एडिट चेक:",
      possibleEditDetected: "संभावित एडिट मिला",
      noEditSignalDetected: "कोई एडिट सिग्नल नहीं मिला",
      processingConversion: "कन्वर्ज़न प्रोसेस हो रहा है...",
      preparingDocument: "डॉक्यूमेंट तैयार हो रहा है...",
      premiumFormats: "प्रीमियम फ़ॉर्मैट",
      soon: "जल्द",
      downloadPrefix: "डाउनलोड",
      separateExcel: "अलग Excel",
      mergeExcel: "मर्ज Excel",
      financialAnalytics: "फाइनेंशियल एनालिटिक्स",
      totalCredits: "कुल क्रेडिट",
      totalDebits: "कुल डेबिट",
      netFlow: "नेट फ्लो",
      duplicatesFound: "डुप्लिकेट मिले",
      categoryBreakdown: "कैटेगरी ब्रेकडाउन",
      extractedTransactions: "निकाली गई ट्रांज़ैक्शन्स",
      showAll: "सब दिखाएँ",
      showDuplicates: (count) => `डुप्लिकेट दिखाएँ (${count})`,
      transactionsFound: (count) => `${count} ट्रांज़ैक्शन मिले`,
      date: "तारीख",
      description: "विवरण",
      category: "कैटेगरी",
      debit: "डेबिट",
      credit: "क्रेडिट",
      balance: "बैलेंस",
      balanceMismatchExpected: "बैलेंस मिसमैच! अपेक्षित:",
      riskFlag: "रिस्क फ़्लैग:",
      potentialDuplicate: "संभावित डुप्लिकेट",
      expected: "अपेक्षित:",
      na: "N/A",
    },
  };
  const actionCopy = actionCopyByLanguage[language] ?? actionCopyByLanguage.en;
  const conversionProgressTitle = conversionProgressLabel || actionCopy.processingConversion;
  const conversionProgressDetail = conversionProgressSubLabel || actionCopy.preparingDocument;
  const [showPremiumFormats, setShowPremiumFormats] = useState(false);
  const isTallyOnlyMode = resultMode === "tally_only";
  const hasPremiumFormatAccess = hasTallyAccess;
  const isPremiumSelectedFlow = selectedPremiumFormat !== null;
  const creditTone: ToneName = analytics ? getCreditTone(analytics.totalCredits) : "good";
  const debitTone: ToneName = analytics ? getDebitTone(analytics.totalCredits, analytics.totalDebits) : "moderate";
  const netFlowTone: ToneName = analytics ? getNetFlowTone(analytics.netFlow, analytics.totalCredits) : "moderate";
  const statementMonthCount = new Set(
    transactions
      .map((transaction) => parseStatementDateToIso(transaction.date)?.slice(0, 7))
      .filter((month): month is string => Boolean(month)),
  ).size;
  const lockedFormats: string[] = [];
  if (isTallyOnlyMode && !hasTallyAccess) lockedFormats.push("Tally XML");
  if (!isPaidUser) lockedFormats.push("JSON", "MT940");

  const premiumFormatCards = [
    {
      key: "tally",
      label: "Tally",
      status: "live" as const,
      onClick: () => void handlePremiumExport("tally"),
      className:
        "border-[#6a5b3a]/70 bg-[#211b12] text-[#ead8a7] hover:border-[#8a7650] hover:bg-[#282015]",
    },
    {
      key: "quickbooks",
      label: "QuickBooks",
      status: "live" as const,
      onClick: () => void handlePremiumExport("quickbooks"),
      className:
        "border-[#395947]/70 bg-[#16211b] text-[#c7ddcf] hover:border-[#4b735b] hover:bg-[#1a2821]",
    },
    {
      key: "xero",
      label: "Xero",
      status: "live" as const,
      onClick: () => void handlePremiumExport("xero"),
      className:
        "border-[#365566]/70 bg-[#131f27] text-[#c5d8e4] hover:border-[#496d81] hover:bg-[#182630]",
    },
    {
      key: "zoho",
      label: "Zoho",
      status: "live" as const,
      onClick: () => void handlePremiumExport("zoho"),
      className:
        "border-[#6c5148]/70 bg-[#221815] text-[#e2cbc3] hover:border-[#866258] hover:bg-[#2a1d19]",
    },
  ];
  const selectedPremiumLabel = premiumFormatCards.find((item) => item.key === selectedPremiumFormat)?.label ?? "Premium Format";

  const renderPremiumFormatsLauncher = () => (
    <div className="flex flex-col items-center gap-3">
      <Button
        size="lg"
        variant="outline"
        onClick={() => hasPremiumFormatAccess && setShowPremiumFormats((current) => !current)}
        disabled={transactions.length === 0}
        className={`min-w-[240px] text-white transition-all ${
          hasPremiumFormatAccess
            ? "border-white/15 bg-[#161616] hover:border-white/25 hover:bg-[#1b1b1b]"
            : "border-sky-300/35 bg-sky-500/10 text-sky-100 hover:border-sky-200/60 hover:bg-sky-500/20"
        }`}
      >
        <FileText className="mr-2 h-5 w-5" />
        {actionCopy.premiumFormats}
        {!hasPremiumFormatAccess && <Lock className="ml-2 h-4 w-4" />}
      </Button>

      {hasPremiumFormatAccess && showPremiumFormats && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {premiumFormatCards.map((format) => (
            <Button
              key={format.key}
              size="sm"
              variant="outline"
              onClick={format.onClick}
              disabled={format.status !== "live"}
              className={`min-w-[122px] border backdrop-blur-sm ${format.className}`}
            >
              {format.label}
              {format.status !== "live" && (
                  <span className="ml-2 rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/65">
                  {actionCopy.soon}
                  </span>
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {batchResults.length > 0 && (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 tone-excellent-text">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">
              {isTallyOnlyMode ? actionCopy.batchTallyConversionComplete : actionCopy.batchConversionComplete}
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">{actionCopy.downloadOptions}</p>
          {isPremiumSelectedFlow ? (
            <div className="flex justify-center">
              <Button
                size="lg"
                variant="outline"
                onClick={() => void handlePremiumExport(selectedPremiumFormat)}
                disabled={transactions.length === 0}
                className="border-white/15 bg-[#161616] text-white hover:border-white/25 hover:bg-[#1b1b1b]"
              >
                <FileText className="mr-2 h-5 w-5" />
                {actionCopy.downloadPrefix} {selectedPremiumLabel}
              </Button>
            </div>
          ) : isTallyOnlyMode ? (
            renderPremiumFormatsLauncher()
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  size="lg"
                  className="excel-button"
                  onClick={handleBatchDownload}
                  disabled={batchDownloading}
                >
                  {batchDownloading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {actionCopy.downloading}
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="mr-2 h-5 w-5" />
                      {actionCopy.separateExcel}
                    </>
                  )}
                </Button>
                {mergeInfo && mergeInfo.available && mergeResult && (
                  <Button
                    size="lg"
                    className="excel-button"
                    onClick={handleMergedDownload}
                    disabled={mergeDownloading}
                  >
                    {mergeDownloading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {actionCopy.preparing}
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="mr-2 h-5 w-5" />
                        {actionCopy.mergeExcel}
                      </>
                    )}
                  </Button>
                )}
              </div>
              {mergeInfo && !mergeInfo.available && (
                <p className="text-xs text-muted-foreground">
                  {actionCopy.mergeDisabled} {mergeInfo.reasons?.join("; ") || actionCopy.conditionsNotMet}
                </p>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground">
            {actionCopy.convertedSummary} {batchResults.filter((r) => r.status === "success").length}/{batchResults.length}
          </p>

          {!isTallyOnlyMode && (
            <>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <Button size="sm" variant="outline" onClick={exportAsCSV} disabled={transactions.length === 0} className="csv-button">
                  <FileText className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePremiumExport("json")}
                  disabled={transactions.length === 0}
                  className={`text-white ${!isPaidUser ? "bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]" : ""}`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  JSON
                  {!isPaidUser && <Lock className="ml-1 h-3 w-3" />}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePremiumExport("mt940")}
                  disabled={transactions.length === 0}
                  className={`text-white ${!isPaidUser ? "bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]" : ""}`}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  MT940
                  {!isPaidUser && <Lock className="ml-1 h-3 w-3" />}
                </Button>
              </div>
              {lockedFormats.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Crown className="h-3 w-3 text-amber-500" />
                  {lockedFormats.join(", ")} {lockedFormats.length === 1 ? actionCopy.lockedFormatsSuffixSingle : actionCopy.lockedFormatsSuffixPlural} {actionCopy.planGatedFormats}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {conversionResult && batchResults.length === 0 && (
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 tone-excellent-text">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">
              {isTallyOnlyMode ? actionCopy.tallyConversionComplete : actionCopy.conversionComplete}
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            {actionCopy.downloadYourFile} {singleDownloadFileName || "bank-statement.xlsx"}
          </p>
          {isPremiumSelectedFlow ? (
            <div className="flex justify-center">
              <Button
                size="lg"
                variant="outline"
                onClick={() => void handlePremiumExport(selectedPremiumFormat)}
                disabled={transactions.length === 0}
                className="border-white/15 bg-[#161616] text-white hover:border-white/25 hover:bg-[#1b1b1b]"
              >
                <FileText className="mr-2 h-5 w-5" />
                {actionCopy.downloadPrefix} {selectedPremiumLabel}
              </Button>
            </div>
          ) : isTallyOnlyMode ? (
            renderPremiumFormatsLauncher()
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button size="lg" className="excel-button" onClick={handleDownload} disabled={downloading}>
                  {downloading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {actionCopy.downloading}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-5 w-5" />
                      {actionCopy.downloadExcel}
                    </>
                  )}
                </Button>
                <Button size="lg" variant="outline" onClick={exportAsCSV} disabled={transactions.length === 0} className="csv-button">
                  <FileText className="mr-2 h-5 w-5" />
                  CSV
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handlePremiumExport("json")}
                  disabled={transactions.length === 0}
                  className={`text-white ${!isPaidUser ? "bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]" : ""}`}
                >
                  <FileText className="mr-2 h-5 w-5" />
                  JSON
                  {!isPaidUser && <Lock className="ml-1 h-4 w-4" />}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handlePremiumExport("mt940")}
                  disabled={transactions.length === 0}
                  className={`text-white ${!isPaidUser ? "bg-[#404040] border-[#404040] hover:bg-[#4a4a4a] hover:border-[#4a4a4a]" : ""}`}
                >
                  <FileText className="mr-2 h-5 w-5" />
                  MT940
                  {!isPaidUser && <Lock className="ml-1 h-4 w-4" />}
                </Button>
              </div>
              {lockedFormats.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Crown className="h-3 w-3 text-amber-500" />
                  {lockedFormats.join(", ")} {lockedFormats.length === 1 ? actionCopy.lockedFormatsSuffixSingle : actionCopy.lockedFormatsSuffixPlural} {actionCopy.planGatedFormats}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {isTallyOnlyMode && showEditDetectorSignals && editedPdfCheckResult && (
        <Card
          className={`p-4 border ${
            editedPdfCheckResult.status === "suspected"
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-emerald-500/35 bg-emerald-500/10"
          }`}
        >
          <div className="flex items-start gap-3">
            {editedPdfCheckResult.status === "suspected" ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-300" />
            ) : (
              <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-300" />
            )}
            <div className="space-y-1 text-left">
              <p className="text-sm font-semibold text-white">
                {actionCopy.editPdfCheck} {editedPdfCheckResult.status === "suspected" ? actionCopy.possibleEditDetected : actionCopy.noEditSignalDetected}
              </p>
              <p className="text-xs text-white/70">{editedPdfCheckResult.reason}</p>
            </div>
          </div>
        </Card>
      )}

      {converting && (
        <Card className="p-4 bg-[#191919]/80 border border-white/10">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">{conversionProgressTitle}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, conversionProgressPercent))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{conversionProgressDetail}</p>
          </div>
        </Card>
      )}
      {showUnderwriting && !converting && !isTallyOnlyMode && analytics?.underwriting && (
        <UnderwritingPanel
          underwriting={analytics.underwriting}
          currencyCode={currencyCode}
          statementMonthCount={statementMonthCount}
        />
      )}

      {!isTallyOnlyMode && showFraudSignals && analytics?.riskAnalysis && (
        <FraudAlertPanel
          riskAnalysis={analytics.riskAnalysis}
          currencyCode={currencyCode}
          showEditDetectorSignals={showEditDetectorSignals}
          editedPdfCheckResult={editedPdfCheckResult}
        />
      )}

      {!isTallyOnlyMode && analytics && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            {actionCopy.financialAnalytics}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={`p-4 !bg-[#191919] ${toneClasses[creditTone].border}`}>
              <div className={`flex items-center gap-2 text-sm mb-1 ${toneClasses[creditTone].text}`}>
                <TrendingUp className={`w-4 h-4 ${toneClasses[creditTone].text}`} />
                {actionCopy.totalCredits}
              </div>
              <p className={`text-2xl font-bold ${toneClasses[creditTone].text}`}>
                {formatAmountNoSymbol(truncateDecimals(analytics.totalCredits), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>

            <Card className={`p-4 !bg-[#191919] ${toneClasses[debitTone].border}`}>
              <div className={`flex items-center gap-2 text-sm mb-1 ${toneClasses[debitTone].text}`}>
                <TrendingDown className={`w-4 h-4 ${toneClasses[debitTone].text}`} />
                {actionCopy.totalDebits}
              </div>
              <p className={`text-2xl font-bold ${toneClasses[debitTone].text}`}>
                {formatAmountNoSymbol(truncateDecimals(analytics.totalDebits), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>

            <Card className={`p-4 !bg-[#191919] ${toneClasses[netFlowTone].border}`}>
              <div className={`flex items-center gap-2 text-sm mb-1 ${toneClasses[netFlowTone].text}`}>
                {analytics.netFlow >= 0 ? (
                  <TrendingUp className={`w-4 h-4 ${toneClasses[netFlowTone].text}`} />
                ) : (
                  <TrendingDown className={`w-4 h-4 ${toneClasses[netFlowTone].text}`} />
                )}
                {actionCopy.netFlow}
              </div>
              <p className={`text-2xl font-bold ${toneClasses[netFlowTone].text}`}>
                {formatAmountNoSymbol(truncateDecimals(analytics.netFlow), { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: "always" })}
              </p>
            </Card>

            {analytics.duplicateCount > 0 && (
              <Card className="p-4 !bg-[#191919] border-orange-500/30">
                <div className="flex items-center gap-2 text-sm tone-moderate-text mb-1">
                  <AlertTriangle className="w-4 h-4 tone-moderate-text" />
                  {actionCopy.duplicatesFound}
                </div>
                <p className="text-2xl font-bold tone-moderate-text">{analytics.duplicateCount}</p>
              </Card>
            )}
          </div>

          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">{actionCopy.categoryBreakdown}</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.categoryBreakdown)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 8)
                .map(([category, data]) => (
                  <Badge
                    key={category}
                    variant="outline"
                    className={`${categoryColors[category] || categoryColors.Other} border`}
                  >
                    {category}: {data.count}
                  </Badge>
                ))}
            </div>
          </div>
        </div>
      )}

      {!isTallyOnlyMode && transactions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-lg font-semibold">{actionCopy.extractedTransactions}</h3>
            <div className="flex items-center gap-3">
              {analytics && analytics.duplicateCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                  className={
                    showDuplicatesOnly
                      ? "bg-surface-elevated/30 border border-surface-elevated/60 shadow-[0_0_10px_rgba(0,0,0,0.18)]"
                      : ""
                  }
                >
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {showDuplicatesOnly ? actionCopy.showAll : actionCopy.showDuplicates(analytics.duplicateCount)}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {actionCopy.transactionsFound(transactions.length)}
              </span>
            </div>
          </div>

          <Card className="overflow-hidden !bg-[#191919] border-primary/20">
            <div className="overflow-x-auto">
              <ScrollArea className="h-[400px] min-w-[720px]">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="bg-[#191919]">
                      <TableHead className="font-semibold">{actionCopy.date}</TableHead>
                      <TableHead className="font-semibold">{actionCopy.description}</TableHead>
                      <TableHead className="font-semibold">{actionCopy.category}</TableHead>
                      <TableHead className="font-semibold text-right tone-bad-text">{actionCopy.debit}</TableHead>
                      <TableHead className="font-semibold text-right tone-excellent-text">{actionCopy.credit}</TableHead>
                      <TableHead className="font-semibold text-right">{actionCopy.balance}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions
                      .filter((t) => !showDuplicatesOnly || t.isDuplicate)
                      .map((transaction, index) => (
                        <TableRow
                          key={index}
                          className={`${
                            transaction.balanceMismatch
                              ? "bg-red-500/10 border-l-2 border-l-red-500"
                              : showFraudSignals && transaction.riskFlag
                                ? "bg-orange-500/5 border-l-2 border-l-orange-500"
                                : transaction.isDuplicate
                                  ? "bg-yellow-500/5 border-l-2 border-l-yellow-500"
                                  : ""
                          }`}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {transaction.date}
                              {transaction.balanceMismatch && (
                                <Tooltip>
                                  <TooltipTrigger aria-label="Balance mismatch warning">
                                    <ShieldAlert className="w-4 h-4 tone-bad-text" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {actionCopy.balanceMismatchExpected} {transaction.expectedBalance == null ? actionCopy.na : formatAmountNoSymbol(transaction.expectedBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {showFraudSignals && transaction.riskFlag && !transaction.balanceMismatch && (
                                <Tooltip>
                                  <TooltipTrigger aria-label="Risk flag warning">
                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>{actionCopy.riskFlag} {transaction.riskFlag}</TooltipContent>
                                </Tooltip>
                              )}
                              {transaction.isDuplicate && !transaction.balanceMismatch && !transaction.riskFlag && (
                                <Tooltip>
                                  <TooltipTrigger aria-label="Potential duplicate warning">
                                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {actionCopy.potentialDuplicate} (Group #{transaction.duplicateGroup})
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {transaction.description}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${categoryColors[transaction.category] || categoryColors.Other} border`}
                            >
                              {transaction.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.debit > 0 ? (
                              <span className="inline-flex items-center justify-end rounded-md tone-bad-bg tone-bad-text px-2 py-0.5 font-semibold tabular-nums">
                                {formatAmountNoSymbol(transaction.debit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {transaction.credit > 0 ? (
                              <span className="inline-flex items-center justify-end rounded-md tone-excellent-bg tone-excellent-text px-2 py-0.5 font-semibold tabular-nums">
                                {formatAmountNoSymbol(transaction.credit, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right ${transaction.balanceMismatch ? "tone-bad-text" : ""}`}>
                            {formatAmountNoSymbol(transaction.balance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {transaction.balanceMismatch && transaction.expectedBalance && (
                              <div className="text-xs text-muted-foreground">
                                {actionCopy.expected} {formatAmountNoSymbol(transaction.expectedBalance, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </Card>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="rounded-xl border border-white/20 bg-[#191919]/70 p-3 shadow-none">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-sky-300" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              {localizedCopy.textBasedTitle}
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-sky-50/75">
            {localizedCopy.textBasedDesc}
          </p>
        </Card>

        <Card className="rounded-xl border border-sky-500/15 bg-sky-500/[0.06] p-3 shadow-none">
          <div className="flex items-center gap-2">
            <ScanSearch className="h-4 w-4 text-sky-300" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-200">
              {localizedCopy.scannedTitle}
            </p>
          </div>
          <p className="mt-2 text-xs leading-5 text-sky-50/75">
            {localizedCopy.scannedDesc}
          </p>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="subtle-border-glow flex items-start gap-3 p-4 rounded-lg bg-[#191919]/70 backdrop-blur-lg border border-white/80">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">{localizedCopy.step1Title}</p>
            <p className="text-xs text-muted-foreground">{localizedCopy.step1Desc}</p>
          </div>
        </div>

        <div className="subtle-border-glow flex items-start gap-3 p-4 rounded-lg bg-[#191919]/70 backdrop-blur-lg border border-secondary/20">
          <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
            <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">{localizedCopy.step2Title}</p>
            <p className="text-xs text-muted-foreground">{localizedCopy.step2Desc}</p>
          </div>
        </div>

        <div className="subtle-border-glow flex items-start gap-3 p-4 rounded-lg bg-[#191919]/70 backdrop-blur-lg border border-green-500/20">
          <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4 tone-excellent-text" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-sm">{localizedCopy.step3Title}</p>
            <p className="text-xs text-muted-foreground">{localizedCopy.step3Desc}</p>
          </div>
        </div>
      </div>

      <div className="text-center pt-8 border-t border-muted">
        <p className="text-sm text-muted-foreground mb-4">
          {localizedCopy.banksCompatible}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {supportedBanks.map((bank) => (
            <span
              key={bank}
              className="px-3 py-1 text-xs rounded-full bg-muted/50 text-muted-foreground transition-all"
            >
              {bank}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
          {localizedCopy.manyMore}
        </p>
      </div>
    </>
  );
};
