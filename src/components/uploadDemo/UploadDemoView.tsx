import { UsageLimitBanner } from "../UsageLimitBanner";
import { ResultsSection } from "./ResultsSection";
import { UploadDemoHeader } from "./UploadDemoHeader";
import { UploadDemoUploadCard } from "./UploadDemoUploadCard";
import { UploadDemoPasswordCard } from "./UploadDemoPasswordCard";
import { UploadDemoPasswordErrorCard } from "./UploadDemoPasswordErrorCard";
import { UploadDemoEditedWarningCard } from "./UploadDemoEditedWarningCard";
import { UploadDemoErrorCard } from "./UploadDemoErrorCard";
import { UploadDemoConvertActions } from "./UploadDemoConvertActions";
import { UploadDemoDialogs } from "./UploadDemoDialogs";
import type {
  Analytics,
  MergeInfo,
  Transaction,
} from "./types";
import type { ChangeEventHandler, RefObject } from "react";

type ConversionMode = "standard" | "tally_only";
type PremiumFormat = "tally" | "quickbooks" | "xero" | "zoho";

type UploadDemoViewProps = {
  remaining?: number;
  conversionsLimit?: number;
  isAuthenticated: boolean;
  limitReached: boolean;
  planType?: string;
  selectedFiles: File[];
  selectedFile: File | null;
  uploading: boolean;
  converting: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleUploadClick: () => void;
  handleFileSelect: ChangeEventHandler<HTMLInputElement>;
  handleRemoveSelectedFile: (index: number) => void;
  handleClearSelectedFiles: () => void;
  uploadPrepActive: boolean;
  uploadPrepProgress: number;
  uploadPrepLabel: string;
  uploadPrepFileName: string | null;
  showPasswordInput: boolean;
  pdfPassword: string;
  showPassword: boolean;
  passwordError: boolean;
  passwordUnlocking: boolean;
  handlePasswordChange: (value: string) => void;
  handleUnlockPassword: () => void;
  handleTogglePassword: () => void;
  hasEditPdfDetectorAccess: boolean;
  editedPdfWarning: { fileName: string; reason: string } | null;
  handleProceedEditedPdfWarning: () => void;
  handleCancelEditedPdfWarning: () => void;
  lastError: { message: string; canRetry: boolean } | null;
  handleRetryLastConversion: () => void;
  hasTallyAccess: boolean;
  hasPremiumFormatsAccess: boolean;
  hasIntegrationsAccess: boolean;
  handleRunStandardConversion: () => void;
  handleRunPremiumConversion: (format: PremiumFormat) => void;
  pluralize: (count: number, singular: string, plural?: string) => string;
  batchResults: Array<{ status: "success" | "error" }>;
  batchDownloading: boolean;
  mergeInfo: MergeInfo | null;
  mergeResult: { excelData?: string; resultPath?: string | null; fileName: string } | null;
  mergeDownloading: boolean;
  handleBatchDownload: () => Promise<void>;
  handleMergedDownload: () => Promise<void>;
  conversionResult: { id: string | null; resultPath: string | null; excelData?: string } | null;
  singleDownloadFileName: string;
  downloading: boolean;
  handleDownload: () => Promise<void>;
  transactions: Transaction[];
  isPaidUser: boolean;
  exportAsCSV: () => Promise<void>;
  handleTallyExport: () => Promise<boolean>;
  handlePremiumExport: (format: "json" | "mt940" | "quickbooks" | "xero" | "zoho" | "tally") => void;
  analytics: Analytics | null;
  currencyCode: string;
  showDuplicatesOnly: boolean;
  setShowDuplicatesOnly: (value: boolean) => void;
  formatAmountNoSymbol: (
    value: number,
    options?: {
      minimumFractionDigits?: number;
      maximumFractionDigits?: number;
      signDisplay?: "auto" | "always" | "never";
    },
  ) => string;
  truncateDecimals: (value: number, decimals?: number) => number;
  resultMode: ConversionMode;
  editedPdfCheckResult: { fileName: string; status: "clean" | "suspected"; reason: string } | null;
  showUnderwriting: boolean;
  showFraudSignals: boolean;
  progressStep: number;
  uploadingLabel: string;
  convertingLabel: string;
  finalizingLabel: string;
  conversionProgressDetail: string;
  showImageProcessingHint: boolean;
  selectedPremiumFormat: PremiumFormat | null;
  showLimitDialog: boolean;
  setShowLimitDialog: (value: boolean) => void;
  limitDialogTitle: string;
  limitDialogMessage: string;
  limitDialogShowSignup: boolean;
  limitDialogShowPricing: boolean;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (value: boolean) => void;
  handleGoToAuth: () => void;
  handleGoToPricing: () => void;
};

export const UploadDemoView = ({
  remaining,
  conversionsLimit,
  isAuthenticated,
  limitReached,
  planType,
  selectedFiles,
  selectedFile,
  uploading,
  converting,
  fileInputRef,
  handleUploadClick,
  handleFileSelect,
  handleRemoveSelectedFile,
  handleClearSelectedFiles,
  uploadPrepActive,
  uploadPrepProgress,
  uploadPrepLabel,
  uploadPrepFileName,
  showPasswordInput,
  pdfPassword,
  showPassword,
  passwordError,
  passwordUnlocking,
  handlePasswordChange,
  handleUnlockPassword,
  handleTogglePassword,
  hasEditPdfDetectorAccess,
  editedPdfWarning,
  handleProceedEditedPdfWarning,
  handleCancelEditedPdfWarning,
  lastError,
  handleRetryLastConversion,
  hasTallyAccess,
  hasPremiumFormatsAccess,
  hasIntegrationsAccess,
  handleRunStandardConversion,
  handleRunPremiumConversion,
  pluralize,
  batchResults,
  batchDownloading,
  mergeInfo,
  mergeResult,
  mergeDownloading,
  handleBatchDownload,
  handleMergedDownload,
  conversionResult,
  singleDownloadFileName,
  downloading,
  handleDownload,
  transactions,
  isPaidUser,
  exportAsCSV,
  handleTallyExport,
  handlePremiumExport,
  analytics,
  currencyCode,
  showDuplicatesOnly,
  setShowDuplicatesOnly,
  formatAmountNoSymbol,
  truncateDecimals,
  resultMode,
  editedPdfCheckResult,
  showUnderwriting,
  showFraudSignals,
  progressStep,
  uploadingLabel,
  convertingLabel,
  finalizingLabel,
  conversionProgressDetail,
  showImageProcessingHint,
  selectedPremiumFormat,
  showLimitDialog,
  setShowLimitDialog,
  limitDialogTitle,
  limitDialogMessage,
  limitDialogShowSignup,
  limitDialogShowPricing,
  showUpgradeDialog,
  setShowUpgradeDialog,
  handleGoToAuth,
  handleGoToPricing,
}: UploadDemoViewProps) => {
  return (
    <>
      <section className="relative bg-background px-4 py-16">
        <div className="container mx-auto relative z-10">
          <UploadDemoHeader />

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              <UsageLimitBanner
                remaining={remaining ?? 0}
                limit={conversionsLimit ?? 0}
                isAuthenticated={isAuthenticated}
                limitReached={limitReached}
                planType={planType}
              />

              <div className="space-y-8">
                <UploadDemoUploadCard
                  selectedFiles={selectedFiles}
                  limitReached={limitReached}
                  uploading={uploading}
                  converting={converting}
                  fileInputRef={fileInputRef}
                  onUploadClick={handleUploadClick}
                  onFileSelect={handleFileSelect}
                  onRemoveFile={handleRemoveSelectedFile}
                  onClearAll={handleClearSelectedFiles}
                  uploadPrepActive={uploadPrepActive}
                  uploadPrepProgress={uploadPrepProgress}
                  uploadPrepLabel={uploadPrepLabel}
                  uploadPrepFileName={uploadPrepFileName}
                  pluralize={pluralize}
                />

                <UploadDemoPasswordCard
                  selectedFile={selectedFile}
                  selectedFiles={selectedFiles}
                  showPasswordInput={showPasswordInput}
                  limitReached={limitReached}
                  pdfPassword={pdfPassword}
                  showPassword={showPassword}
                  passwordError={passwordError}
                  uploading={uploading}
                  converting={converting}
                  passwordUnlocking={passwordUnlocking}
                  onPasswordChange={handlePasswordChange}
                  onUnlock={handleUnlockPassword}
                  onTogglePassword={handleTogglePassword}
                />

                <UploadDemoPasswordErrorCard
                  selectedFile={selectedFile}
                  selectedFiles={selectedFiles}
                  passwordError={passwordError}
                  limitReached={limitReached}
                  uploading={uploading}
                  converting={converting}
                />

                <UploadDemoEditedWarningCard
                  hasEditPdfDetectorAccess={hasEditPdfDetectorAccess}
                  editedPdfWarning={editedPdfWarning}
                  selectedFile={selectedFile}
                  uploading={uploading}
                  converting={converting}
                  onProceed={handleProceedEditedPdfWarning}
                  onCancel={handleCancelEditedPdfWarning}
                />

                <UploadDemoErrorCard
                  lastError={lastError}
                  selectedFile={selectedFile}
                  selectedFilesCount={selectedFiles.length}
                  uploading={uploading}
                  converting={converting}
                  onRetry={handleRetryLastConversion}
                />

                <UploadDemoConvertActions
                  selectedFilesCount={selectedFiles.length}
                  uploading={uploading}
                  converting={converting}
                  uploadPrepActive={uploadPrepActive}
                  limitReached={limitReached}
                  hasPremiumFormatsAccess={hasPremiumFormatsAccess}
                  hasTallyAccess={hasTallyAccess}
                  hasIntegrationsAccess={hasIntegrationsAccess}
                  editedPdfWarningActive={Boolean(editedPdfWarning)}
                  lastErrorActive={Boolean(lastError)}
                  onConvertStandard={handleRunStandardConversion}
                  onConvertPremium={handleRunPremiumConversion}
                  pluralize={pluralize}
                />

                <ResultsSection
                  batchResults={batchResults}
                  batchDownloading={batchDownloading}
                  mergeInfo={mergeInfo}
                  mergeResult={mergeResult}
                  mergeDownloading={mergeDownloading}
                  handleBatchDownload={handleBatchDownload}
                  handleMergedDownload={handleMergedDownload}
                  conversionResult={conversionResult}
                  singleDownloadFileName={singleDownloadFileName}
                  downloading={downloading}
                  handleDownload={handleDownload}
                  transactions={transactions}
                  isPaidUser={isPaidUser}
                  hasTallyAccess={hasTallyAccess}
                  hasIntegrationsAccess={hasIntegrationsAccess}
                  exportAsCSV={exportAsCSV}
                  handleTallyExport={handleTallyExport}
                  handlePremiumExport={handlePremiumExport}
                  converting={converting}
                  analytics={analytics}
                  currencyCode={currencyCode}
                  showDuplicatesOnly={showDuplicatesOnly}
                  setShowDuplicatesOnly={setShowDuplicatesOnly}
                  formatAmountNoSymbol={formatAmountNoSymbol}
                  truncateDecimals={truncateDecimals}
                  showEditDetectorSignals={hasEditPdfDetectorAccess}
                  resultMode={resultMode}
                  editedPdfCheckResult={editedPdfCheckResult}
                  showUnderwriting={showUnderwriting}
                  showFraudSignals={showFraudSignals}
                  conversionProgressPercent={progressStep}
                  conversionProgressLabel={
                    uploading
                      ? uploadingLabel
                      : converting
                        ? convertingLabel
                        : finalizingLabel
                  }
                  conversionProgressSubLabel={conversionProgressDetail}
                  showImageProcessingHint={showImageProcessingHint}
                  selectedPremiumFormat={selectedPremiumFormat}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <UploadDemoDialogs
        showLimitDialog={showLimitDialog}
        setShowLimitDialog={setShowLimitDialog}
        limitDialogTitle={limitDialogTitle}
        limitDialogMessage={limitDialogMessage}
        limitDialogShowSignup={limitDialogShowSignup}
        limitDialogShowPricing={limitDialogShowPricing}
        showUpgradeDialog={showUpgradeDialog}
        setShowUpgradeDialog={setShowUpgradeDialog}
        onGoToAuth={handleGoToAuth}
        onGoToPricing={handleGoToPricing}
      />
    </>
  );
};
