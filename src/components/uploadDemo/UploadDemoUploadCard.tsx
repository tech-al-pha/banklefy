import { Button } from "@/components/ui/button";
import { FileText, Loader2, Upload, XCircle } from "lucide-react";
import type { ChangeEventHandler, RefObject } from "react";
import { useLanguage, type Language } from "@/contexts/LanguageContext";

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
  const { language } = useLanguage();
  const selectedFileCount = selectedFiles.length;
  const labelsByLanguage: Record<
    Language,
    {
      fileSingular: string;
      filePlural: string;
      selectedSuffix: string;
      dropTitle: string;
      browseHint: string;
      dailyLimit: string;
      preparing: string;
      ready: string;
      addFiles: string;
      clearAll: string;
      limitReached: string;
    }
  > = {
    en: {
      fileSingular: "file",
      filePlural: "files",
      selectedSuffix: "selected",
      dropTitle: "Drop your bank statements here",
      browseHint: "or click to browse files | Supports PDF, PNG, JPG/JPEG | Upload multiple files",
      dailyLimit: "Daily limit reached",
      preparing: "Preparing...",
      ready: "Ready",
      addFiles: "Add Files",
      clearAll: "Clear All",
      limitReached: "Limit Reached",
    },
    ar: {
      fileSingular: "ملف",
      filePlural: "ملفات",
      selectedSuffix: "محدد",
      dropTitle: "اسحب كشف الحساب البنكي هنا",
      browseHint: "أو انقر لاختيار الملفات | يدعم PDF وPNG وJPG/JPEG | يمكن رفع عدة ملفات",
      dailyLimit: "تم الوصول للحد اليومي",
      preparing: "جارٍ التحضير...",
      ready: "جاهز",
      addFiles: "إضافة ملفات",
      clearAll: "مسح الكل",
      limitReached: "تم بلوغ الحد",
    },
    zh: {
      fileSingular: "个文件",
      filePlural: "个文件",
      selectedSuffix: "已选择",
      dropTitle: "将银行流水拖放到这里",
      browseHint: "或点击选择文件 | 支持 PDF、PNG、JPG/JPEG | 可上传多个文件",
      dailyLimit: "今日额度已用完",
      preparing: "正在准备...",
      ready: "就绪",
      addFiles: "添加文件",
      clearAll: "清空全部",
      limitReached: "已达上限",
    },
    es: {
      fileSingular: "archivo",
      filePlural: "archivos",
      selectedSuffix: "seleccionado(s)",
      dropTitle: "Suelta aquí tus extractos bancarios",
      browseHint: "o haz clic para buscar archivos | Soporta PDF, PNG, JPG/JPEG | Subir varios archivos",
      dailyLimit: "Límite diario alcanzado",
      preparing: "Preparando...",
      ready: "Listo",
      addFiles: "Agregar archivos",
      clearAll: "Limpiar todo",
      limitReached: "Límite alcanzado",
    },
    hi: {
      fileSingular: "फाइल",
      filePlural: "फाइलें",
      selectedSuffix: "चुनी गई",
      dropTitle: "अपना बैंक स्टेटमेंट यहां ड्रॉप करें",
      browseHint: "या फाइल चुनने के लिए क्लिक करें | PDF, PNG, JPG/JPEG सपोर्टेड | मल्टीपल फाइल अपलोड करें",
      dailyLimit: "डेली लिमिट पूरी हो गई",
      preparing: "तैयार किया जा रहा है...",
      ready: "तैयार",
      addFiles: "फाइल जोड़ें",
      clearAll: "सभी हटाएं",
      limitReached: "लिमिट पूरी",
    },
  };
  const labels = labelsByLanguage[language] ?? labelsByLanguage.en;

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
      className={`subtle-border-glow group relative cursor-pointer rounded-xl border-2 border-primary/20 bg-[#191919]/80 p-6 sm:p-12 text-center transition-all duration-500 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
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

        <div className="space-y-4 sm:space-y-6 relative z-10">
        <div
          className={`mx-auto w-14 h-14 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
            limitReached ? "bg-muted/10" : "bg-primary/20 group-hover:scale-110 group-hover:shadow-neon"
          }`}
        >
          <Upload
            className={`w-7 h-7 sm:w-10 sm:h-10 transition-all duration-300 ${
              limitReached ? "text-muted-foreground utility-icon-muted" : "text-primary"
            }`}
          />
        </div>

        <div className="space-y-2 sm:space-y-3">
          <p className="text-base sm:text-xl font-semibold tracking-wide text-white">
            {selectedFileCount > 0
              ? `${selectedFileCount} ${selectedFileCount === 1 ? labels.fileSingular : labels.filePlural} ${labels.selectedSuffix}`
              : labels.dropTitle}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {limitReached
              ? labels.dailyLimit
              : labels.browseHint}
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
            <span>{uploadPrepActive ? labels.preparing : labels.ready}</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button
            className="w-auto rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground active:bg-primary active:text-primary-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onUploadClick();
            }}
            disabled={uploading || converting || limitReached}
          >
            {limitReached ? labels.limitReached : labels.addFiles}
          </Button>
          {selectedFileCount > 0 && (
            <Button
              className="w-auto rounded-lg bg-accent px-8 py-3 font-medium text-accent-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onClearAll();
              }}
            >
              {labels.clearAll}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
