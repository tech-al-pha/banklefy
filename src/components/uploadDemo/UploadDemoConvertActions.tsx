import { Button } from "@/components/ui/button";
import { FileText, Loader2, Lock, Sparkles } from "lucide-react";

type UploadDemoConvertActionsProps = {
  selectedFilesCount: number;
  uploading: boolean;
  converting: boolean;
  uploadPrepActive: boolean;
  limitReached: boolean;
  hasTallyAccess: boolean;
  editedPdfWarningActive: boolean;
  lastErrorActive: boolean;
  onConvertStandard: () => void;
  onConvertTally: () => void;
  pluralize: (count: number, singular: string, plural?: string) => string;
};

export const UploadDemoConvertActions = ({
  selectedFilesCount,
  uploading,
  converting,
  uploadPrepActive,
  limitReached,
  hasTallyAccess,
  editedPdfWarningActive,
  lastErrorActive,
  onConvertStandard,
  onConvertTally,
  pluralize,
}: UploadDemoConvertActionsProps) => {
  if (selectedFilesCount === 0 || limitReached || lastErrorActive || uploadPrepActive) {
    return null;
  }

  return (
    <div className="text-center space-y-3">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="convert-button w-full md:w-auto"
            onClick={onConvertStandard}
            disabled={uploading || converting || uploadPrepActive || editedPdfWarningActive}
          >
            {uploading || converting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {uploading ? "Uploading..." : "Converting..."}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                {selectedFilesCount === 1 ? "Convert" : "Convert All Statements"}
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className={`w-full md:w-auto ${
              !hasTallyAccess
                ? "border-sky-300/40 bg-sky-500/10 text-sky-100 hover:border-sky-200/60 hover:bg-sky-500/20"
                : "border-primary/30 text-primary"
            }`}
            onClick={onConvertTally}
            disabled={uploading || converting || uploadPrepActive || editedPdfWarningActive}
          >
            <FileText className="mr-2 h-5 w-5" />
            Tally XML
            {!hasTallyAccess && <Lock className="ml-2 h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedFilesCount} {pluralize(selectedFilesCount, "file")} ready to convert
        </p>
      </div>
    </div>
  );
};
