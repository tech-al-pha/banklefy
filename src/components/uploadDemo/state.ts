import type {
  AiStatus,
  Analytics,
  MergeInfo,
  Transaction,
} from "./types";

export type UploadDemoState = {
  selectedFiles: File[];
  selectedFile: File | null;
  uploading: boolean;
  converting: boolean;
  conversionResult: { id: string | null; resultPath: string | null; excelData?: string } | null;
  singleDownloadFileName: string;
  batchResults: Array<{
    fileName: string;
    downloadFileName?: string;
    status: "success" | "error";
    data?: { excelData?: string; resultPath?: string | null };
    error?: string;
  }>;
  mergeInfo: MergeInfo | null;
  mergeResult: { excelData?: string; resultPath?: string | null; fileName: string } | null;
  transactions: Transaction[];
  analytics: Analytics | null;
  currencyCode: string;
  aiStatus: AiStatus | null;
  downloading: boolean;
  batchDownloading: boolean;
  mergeDownloading: boolean;
  showDuplicatesOnly: boolean;
  pdfPassword: string;
  showPasswordInput: boolean;
  passwordError: boolean;
  lastError: { message: string; canRetry: boolean } | null;
  editedPdfWarning: { fileName: string; reason: string } | null;
  showPassword: boolean;
  showUpgradeDialog: boolean;
  showLimitDialog: boolean;
  limitDialogTitle: string;
  limitDialogMessage: string;
  limitDialogShowSignup: boolean;
  limitDialogShowPricing: boolean;
  progressStep: number;
  showProgress: boolean;
};

export const initialUploadState: UploadDemoState = {
  selectedFiles: [],
  selectedFile: null,
  uploading: false,
  converting: false,
  conversionResult: null,
  singleDownloadFileName: "bank-statement.xlsx",
  batchResults: [],
  mergeInfo: null,
  mergeResult: null,
  transactions: [],
  analytics: null,
  currencyCode: "",
  aiStatus: null,
  downloading: false,
  batchDownloading: false,
  mergeDownloading: false,
  showDuplicatesOnly: false,
  pdfPassword: "",
  showPasswordInput: false,
  passwordError: false,
  lastError: null,
  editedPdfWarning: null,
  showPassword: false,
  showUpgradeDialog: false,
  showLimitDialog: false,
  limitDialogTitle: "Daily Limit Reached",
  limitDialogMessage: "",
  limitDialogShowSignup: false,
  limitDialogShowPricing: false,
  progressStep: 0,
  showProgress: false,
};

export type UploadDemoAction =
  | { type: "set"; payload: Partial<UploadDemoState> }
  | { type: "reset" };

export const uploadDemoReducer = (
  state: UploadDemoState,
  action: UploadDemoAction,
): UploadDemoState => {
  switch (action.type) {
    case "set":
      return { ...state, ...action.payload };
    case "reset":
      return { ...initialUploadState };
    default:
      return state;
  }
};
