import { Button } from "@/components/ui/button";
import { FileText, Loader2, Upload, XCircle } from "lucide-react";
import type { ChangeEventHandler, RefObject } from "react";

type UploadDemoUploadCardProps = {
  selectedFiles: File[];
  limitReached: boolean;
  uploading: boolean;
  converting: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onUploadClick: () => void;
  onFileSelect: ChangeEventHandler<HTMLInputElement>;
  onRemoveFile: (index: number) => void;
  onClearAll: () => void;
  uploadPrepActive: boolean;
  uploadPrepProgress: number;
  uploadPrepLabel: string;
  uploadPrepFileName: string | null;
  pluralize: (count: number, singular: string, plural?: string) => string;
};

export const UploadDemoUploadCard = ({
  selectedFiles,
  limitReached,
  uploading,
  converting,
  fileInputRef,
  onUploadClick,
  onFileSelect,
  onRemoveFile,
  onClearAll,
  uploadPrepActive,
  uploadPrepProgress,
  uploadPrepLabel,
  uploadPrepFileName,
  pluralize,
}: UploadDemoUploadCardProps) => {
  const selectedFileCount = selectedFiles.length;

  return (
    <div
      onClick={onUploadClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onUploadClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-disabled={limitReached}
      data-hover
      className={`subtle-border-glow bg-[#191919]/80 border-2 border-primary/20 hover:border-primary/40 rounded-xl p-6 sm:p-10 md:p-12 text-center transition-all duration-500 cursor-pointer group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        limitReached ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={onFileSelect}
        multiple
        className="hidden"
      />

      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-primary/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="space-y-6 relative z-10">
        <div
          className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
            limitReached ? "bg-muted/10" : "bg-primary/20 group-hover:scale-110 group-hover:shadow-neon"
          }`}
        >
          <Upload
            className={`w-10 h-10 transition-all duration-300 ${
              limitReached ? "text-muted-foreground utility-icon-muted" : "text-primary"
            }`}
          />
        </div>

        <div className="space-y-3">
          <p className="text-xl font-semibold tracking-wide text-white">
            {selectedFileCount > 0
              ? `${selectedFileCount} ${pluralize(selectedFileCount, "file")} selected`
              : "Drop your bank statements here"}
          </p>
          <p className="text-sm text-muted-foreground">
            {limitReached
              ? "Daily limit reached"
              : "or click to browse files | Supports PDF, PNG, JPG/JPEG | Upload multiple files"}
          </p>
        </div>

        {selectedFileCount > 0 && (
          <div className="mt-6 space-y-2 max-h-48 overflow-y-auto">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-primary/10 p-3 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="flex-1 min-w-0 text-sm text-white truncate">{file.name}</span>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveFile(idx);
                  }}
                  className="text-white/85 hover:text-white"
                  aria-label={`Remove ${file.name}`}
                  title={`Remove ${file.name}`}
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {uploadPrepActive && (selectedFileCount > 0 || uploadPrepFileName) && (
          <div className="mx-auto mt-4 w-full max-w-xl space-y-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-sm text-white truncate">
              {uploadPrepFileName ?? selectedFiles[0]?.name}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, uploadPrepProgress))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{uploadPrepLabel}</p>
          </div>
        )}

        {selectedFileCount > 0 && (
          <div className="mx-auto mt-2 flex w-full max-w-xl items-center justify-center gap-2 text-xs text-muted-foreground">
            {uploadPrepActive ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
            )}
            <span>{uploadPrepActive ? "Preparing..." : "Ready"}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            className="bg-primary text-primary-foreground font-medium px-8 py-3 rounded-lg w-full sm:w-auto active:bg-primary active:text-primary-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onUploadClick();
            }}
            disabled={uploading || converting || limitReached}
          >
            {limitReached ? "Limit Reached" : "Add Files"}
          </Button>
          {selectedFileCount > 0 && (
            <Button
              className="bg-accent text-accent-foreground font-medium px-8 py-3 rounded-lg w-full sm:w-auto"
              onClick={(event) => {
                event.stopPropagation();
                onClearAll();
              }}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
