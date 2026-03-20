import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

type EditedPdfWarning = {
  fileName: string;
  reason: string;
};

type UploadDemoEditedWarningCardProps = {
  hasEditPdfDetectorAccess: boolean;
  editedPdfWarning: EditedPdfWarning | null;
  selectedFile: File | null;
  uploading: boolean;
  converting: boolean;
  onProceed: () => void;
  onCancel: () => void;
};

export const UploadDemoEditedWarningCard = ({
  hasEditPdfDetectorAccess,
  editedPdfWarning,
  selectedFile,
  uploading,
  converting,
  onProceed,
  onCancel,
}: UploadDemoEditedWarningCardProps) => {
  if (!hasEditPdfDetectorAccess || !editedPdfWarning || !selectedFile || converting || uploading) {
    return null;
  }

  return (
    <div className="p-4 bg-[#191919]/80 border border-amber-500/30 rounded-xl space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-amber-300">Possible Edited PDF Detected</p>
          <p className="text-sm text-white/60 mt-1">
            This statement looks like it may have been edited. Reason: {editedPdfWarning.reason}.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="w-full border border-amber-500/40 text-amber-200 bg-amber-500/10 hover:bg-amber-500/20"
          onClick={onProceed}
          disabled={false}
        >
          Proceed Anyway
        </Button>
        <Button
          variant="ghost"
          className="w-full text-white/60 hover:text-white"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};
