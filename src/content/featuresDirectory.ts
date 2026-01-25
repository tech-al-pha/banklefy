import type { LucideIcon } from "lucide-react";
import {
  Globe,
  Brain,
  Zap,
  FileSpreadsheet,
  Lock,
  Clock,
  MessageCircle,
  Calculator,
  ShieldCheck,
  FileText,
  PieChart,
  BarChart3,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  Eye,
  Layers,
  Database,
  CheckCircle2,
} from "lucide-react";

export type FeatureCategoryId =
  | "core"
  | "financial"
  | "risk"
  | "assistant"
  | "export"
  | "performance"
  | "security"
  | "privacy"
  | "accessibility"
  | "technology"
  | "usage";

export const featureCategoryOrder: FeatureCategoryId[] = [
  "core",
  "financial",
  "risk",
  "assistant",
  "export",
  "performance",
  "security",
  "privacy",
  "accessibility",
  "technology",
  "usage",
];

export const featureCategoryLabelKey: Record<FeatureCategoryId, string> = {
  core: "featuresPage.categories.core",
  financial: "featuresPage.categories.financial",
  risk: "featuresPage.categories.risk",
  assistant: "featuresPage.categories.assistant",
  export: "featuresPage.categories.export",
  performance: "featuresPage.categories.performance",
  security: "featuresPage.categories.security",
  privacy: "featuresPage.categories.privacy",
  accessibility: "featuresPage.categories.accessibility",
  technology: "featuresPage.categories.technology",
  usage: "featuresPage.categories.usage",
};

export type FeatureItem = {
  id: string;
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  categoryId: FeatureCategoryId;
};

export const featureItems: FeatureItem[] = [
  // Core Technology
  {
    id: "ai_ocr",
    icon: Brain,
    titleKey: "featuresPage.items.aiOcr.title",
    descriptionKey: "featuresPage.items.aiOcr.desc",
    categoryId: "core",
  },
  {
    id: "excel_csv",
    icon: FileSpreadsheet,
    titleKey: "featuresPage.items.excelCsv.title",
    descriptionKey: "featuresPage.items.excelCsv.desc",
    categoryId: "export",
  },
  {
    id: "pdf_report",
    icon: FileText,
    titleKey: "featuresPage.items.pdfReport.title",
    descriptionKey: "featuresPage.items.pdfReport.desc",
    categoryId: "export",
  },

  // Financial Analysis
  {
    id: "foir",
    icon: Calculator,
    titleKey: "featuresPage.items.foir.title",
    descriptionKey: "featuresPage.items.foir.desc",
    categoryId: "financial",
  },
  {
    id: "emi_detection",
    icon: CreditCard,
    titleKey: "featuresPage.items.emiDetection.title",
    descriptionKey: "featuresPage.items.emiDetection.desc",
    categoryId: "financial",
  },
  {
    id: "salary_analysis",
    icon: TrendingUp,
    titleKey: "featuresPage.items.salaryAnalysis.title",
    descriptionKey: "featuresPage.items.salaryAnalysis.desc",
    categoryId: "financial",
  },
  {
    id: "cashflow",
    icon: PieChart,
    titleKey: "featuresPage.items.cashflow.title",
    descriptionKey: "featuresPage.items.cashflow.desc",
    categoryId: "financial",
  },
  {
    id: "adb_amb",
    icon: BarChart3,
    titleKey: "featuresPage.items.adbAmb.title",
    descriptionKey: "featuresPage.items.adbAmb.desc",
    categoryId: "financial",
  },

  // Fraud & Risk
  {
    id: "fraud_detection",
    icon: AlertTriangle,
    titleKey: "featuresPage.items.fraudDetection.title",
    descriptionKey: "featuresPage.items.fraudDetection.desc",
    categoryId: "risk",
  },
  {
    id: "integrity_scoring",
    icon: ShieldCheck,
    titleKey: "featuresPage.items.integrityScoring.title",
    descriptionKey: "featuresPage.items.integrityScoring.desc",
    categoryId: "risk",
  },
  {
    id: "underwriting_panel",
    icon: Eye,
    titleKey: "featuresPage.items.underwritingPanel.title",
    descriptionKey: "featuresPage.items.underwritingPanel.desc",
    categoryId: "risk",
  },

  // User Experience / Assistant
  {
    id: "languages",
    icon: Globe,
    titleKey: "featuresPage.items.languages.title",
    descriptionKey: "featuresPage.items.languages.desc",
    categoryId: "accessibility",
  },
  {
    id: "instant_processing",
    icon: Zap,
    titleKey: "featuresPage.items.instantProcessing.title",
    descriptionKey: "featuresPage.items.instantProcessing.desc",
    categoryId: "performance",
  },
  {
    id: "batch_processing",
    icon: RefreshCw,
    titleKey: "featuresPage.items.batchProcessing.title",
    descriptionKey: "featuresPage.items.batchProcessing.desc",
    categoryId: "performance",
  },
  {
    id: "chat_aura",
    icon: MessageCircle,
    titleKey: "featuresPage.items.chatAura.title",
    descriptionKey: "featuresPage.items.chatAura.desc",
    categoryId: "assistant",
  },

  // Security & Privacy
  {
    id: "encryption",
    icon: Lock,
    titleKey: "featuresPage.items.encryption.title",
    descriptionKey: "featuresPage.items.encryption.desc",
    categoryId: "security",
  },
  {
    id: "zero_retention",
    icon: Database,
    titleKey: "featuresPage.items.zeroRetention.title",
    descriptionKey: "featuresPage.items.zeroRetention.desc",
    categoryId: "privacy",
  },

  // Technical
  {
    id: "categorization",
    icon: Layers,
    titleKey: "featuresPage.items.categorization.title",
    descriptionKey: "featuresPage.items.categorization.desc",
    categoryId: "technology",
  },
  {
    id: "export_formats",
    icon: Download,
    titleKey: "featuresPage.items.exportFormats.title",
    descriptionKey: "featuresPage.items.exportFormats.desc",
    categoryId: "export",
  },
  {
    id: "rule_based",
    icon: CheckCircle2,
    titleKey: "featuresPage.items.ruleBased.title",
    descriptionKey: "featuresPage.items.ruleBased.desc",
    categoryId: "technology",
  },
  {
    id: "daily_limits",
    icon: Clock,
    titleKey: "featuresPage.items.dailyLimits.title",
    descriptionKey: "featuresPage.items.dailyLimits.desc",
    categoryId: "usage",
  },
];
