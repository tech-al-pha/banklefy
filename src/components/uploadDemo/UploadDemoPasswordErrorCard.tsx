import { AlertTriangle } from "lucide-react";

type UploadDemoPasswordErrorCardProps = {
  selectedFile: File | null;
  selectedFiles: File[];
  passwordError: boolean;
  limitReached: boolean;
  uploading: boolean;
  converting: boolean;
};

export const UploadDemoPasswordErrorCard = ({
  selectedFile,
  selectedFiles,
  passwordError,
  limitReached,
  uploading,
  converting,
}: UploadDemoPasswordErrorCardProps) => {
  const targetFile = selectedFile ?? selectedFiles[0] ?? null;

  if (!targetFile || !passwordError || limitReached || uploading || converting) {
    return null;
  }

  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3" role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-8 w-8 rounded-full bg-red-500/15 flex items-center justify-center">
          <AlertTriangle className="h-4 w-4 text-red-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-100">Incorrect password</p>
          <p className="mt-1 text-sm text-red-100/85">
            The password entered for {targetFile.name || "this PDF"} is wrong. Check the exact password from your bank
            email or SMS and try again.
          </p>
        </div>
      </div>
      <p className="text-xs text-red-100/70">
        The error will clear automatically once you edit the password field.
      </p>
    </div>
  );
};
