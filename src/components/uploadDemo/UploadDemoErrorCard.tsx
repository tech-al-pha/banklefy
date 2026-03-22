import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, XCircle } from "lucide-react";

type UploadDemoError = {
  message: string;
  canRetry: boolean;
} | null;

type UploadDemoErrorCardProps = {
  lastError: UploadDemoError;
  selectedFile: File | null;
  selectedFilesCount: number;
  uploading: boolean;
  converting: boolean;
  onRetry: () => void;
};

export const UploadDemoErrorCard = ({
  lastError,
  selectedFile,
  selectedFilesCount,
  uploading,
  converting,
  onRetry,
}: UploadDemoErrorCardProps) => {
  const errorMessage = lastError?.message.toLowerCase() ?? "";

  if (
    !lastError ||
    (!selectedFile && selectedFilesCount === 0) ||
    converting ||
    uploading ||
    errorMessage.includes("password") ||
    errorMessage.includes("encrypted") ||
    errorMessage.includes("protected")
  ) {
    return null;
  }

  return (
    <div className="p-4 bg-[#141414] border border-white/20 rounded-xl space-y-3" role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 text-[#787878] mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-[#d3d3d3]">Conversion Failed</p>
          <p className="text-sm text-muted-foreground mt-1">{lastError.message}</p>
        </div>
      </div>
      {lastError.canRetry && (
        <Button
          variant="outline"
          className="w-full border-[#787878] bg-[#787878] text-[#141414] hover:bg-[#6f6f6f] hover:text-[#141414]"
          onClick={onRetry}
          disabled={false}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
};
