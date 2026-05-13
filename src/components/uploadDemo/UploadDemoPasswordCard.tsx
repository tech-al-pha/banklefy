import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";

type UploadDemoPasswordCardProps = {
  selectedFile: File | null;
  selectedFiles: File[];
  showPasswordInput: boolean;
  limitReached: boolean;
  pdfPassword: string;
  showPassword: boolean;
  passwordError: boolean;
  uploading: boolean;
  converting: boolean;
  passwordUnlocking?: boolean;
  onPasswordChange: (value: string) => void;
  onUnlock: () => void;
  onTogglePassword: () => void;
};

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

export const UploadDemoPasswordCard = ({
  selectedFile,
  selectedFiles,
  showPasswordInput,
  limitReached,
  pdfPassword,
  showPassword,
  passwordError,
  uploading,
  converting,
  passwordUnlocking = false,
  onPasswordChange,
  onUnlock,
  onTogglePassword,
}: UploadDemoPasswordCardProps) => {
  const targetFile = selectedFile ?? selectedFiles[0] ?? null;
  const pdfPasswordHelpId = "pdf-password-help";
  const isBusy = uploading || converting || passwordUnlocking;

  if (!targetFile || !showPasswordInput || limitReached) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/15 bg-[#141414] p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center">
          <Lock className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">
            {targetFile.name || "Password protected PDF"}
          </p>
          <p id={pdfPasswordHelpId} className="text-xs text-muted-foreground">
            {formatFileSize(targetFile.size || 0)} - Password required
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <label htmlFor="pdf-password" className="sr-only">
            PDF password
          </label>
          <Input
            id="pdf-password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={pdfPassword}
            onChange={(event) => {
              onPasswordChange(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onUnlock();
              }
            }}
            aria-invalid={passwordError}
            aria-describedby={pdfPasswordHelpId}
            className={`bg-[#0f0f0f] border pr-10 text-white placeholder:text-white/40 ${
              passwordError ? "border-red-500/60 focus:border-red-500" : "border-white/10 focus:border-white/30"
            }`}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <Button
          type="button"
          onClick={onUnlock}
          disabled={isBusy || !pdfPassword.trim()}
          className="sm:w-auto min-w-[120px]"
        >
          {isBusy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Unlocking...
            </>
          ) : (
            "Unlock"
          )}
        </Button>
      </div>
    </div>
  );
};
