import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Lock, Sparkles } from "lucide-react";

type PremiumFormat = "tally" | "quickbooks" | "xero" | "zoho";

type UploadDemoConvertActionsProps = {
  selectedFilesCount: number;
  uploading: boolean;
  converting: boolean;
  uploadPrepActive: boolean;
  limitReached: boolean;
  hasPremiumFormatsAccess: boolean;
  hasTallyAccess: boolean;
  hasIntegrationsAccess: boolean;
  editedPdfWarningActive: boolean;
  lastErrorActive: boolean;
  onConvertStandard: () => void;
  onConvertPremium: (format: PremiumFormat) => void;
  pluralize: (count: number, singular: string, plural?: string) => string;
};

export const UploadDemoConvertActions = ({
  selectedFilesCount,
  uploading,
  converting,
  uploadPrepActive,
  limitReached,
  hasPremiumFormatsAccess,
  hasTallyAccess,
  hasIntegrationsAccess,
  editedPdfWarningActive,
  lastErrorActive,
  onConvertStandard,
  onConvertPremium,
  pluralize,
}: UploadDemoConvertActionsProps) => {
  const [showPremiumOptions, setShowPremiumOptions] = useState(false);

  if (selectedFilesCount === 0 || limitReached || lastErrorActive || uploadPrepActive) {
    return null;
  }

  const disabled = uploading || converting || uploadPrepActive || editedPdfWarningActive;
  const premiumFormats: Array<{ key: PremiumFormat; label: string; className: string }> = [
    ...(hasTallyAccess ? [{ key: "tally" as const, label: "Tally", className: "border-[#6a5b3a]/70 bg-[#211b12] text-[#ead8a7] hover:border-[#8a7650] hover:bg-[#282015]" }] : []),
    ...(hasIntegrationsAccess ? [
      { key: "quickbooks" as const, label: "QuickBooks", className: "border-[#395947]/70 bg-[#16211b] text-[#c7ddcf] hover:border-[#4b735b] hover:bg-[#1a2821]" },
      { key: "xero" as const, label: "Xero", className: "border-[#365566]/70 bg-[#131f27] text-[#c5d8e4] hover:border-[#496d81] hover:bg-[#182630]" },
      { key: "zoho" as const, label: "Zoho", className: "border-[#6c5148]/70 bg-[#221815] text-[#e2cbc3] hover:border-[#866258] hover:bg-[#2a1d19]" },
    ] : []),
  ];

  return (
    <div className="text-center space-y-3">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="convert-button w-full md:w-auto"
            onClick={onConvertStandard}
            disabled={disabled}
          >
            {uploading || converting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {uploading ? "Uploading..." : "Converting..."}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Basic Formats
              </>
            )}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className={`w-full md:w-auto ${
              !hasPremiumFormatsAccess
                ? "border-sky-300/40 bg-sky-500/10 text-sky-100 hover:border-sky-200/60 hover:bg-sky-500/20"
                : "border-white/15 bg-[#161616] text-white hover:border-white/25 hover:bg-[#1b1b1b]"
            }`}
            onClick={() => hasPremiumFormatsAccess && setShowPremiumOptions((current) => !current)}
            disabled={disabled}
          >
            <FileText className="mr-2 h-5 w-5" />
            Premium Formats
            {!hasPremiumFormatsAccess && <Lock className="ml-2 h-4 w-4" />}
          </Button>
        </div>
        {hasPremiumFormatsAccess && showPremiumOptions && (
          <div className="flex flex-wrap justify-center gap-2">
            {premiumFormats.map((format) => (
              <Button
                key={format.key}
                size="sm"
                variant="outline"
                className={`min-w-[122px] border backdrop-blur-sm ${format.className}`}
                onClick={() => onConvertPremium(format.key)}
                disabled={disabled}
              >
                {format.label}
              </Button>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {selectedFilesCount} {pluralize(selectedFilesCount, "file")} ready to convert
        </p>
      </div>
    </div>
  );
};
