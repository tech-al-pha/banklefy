import { useEffect, useState, useRef, useCallback } from "react";
import { FileText, ChevronLeft, ChevronRight, Lock, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPdfWorkerSrc } from "@/lib/pdfWorker";

interface PdfPreviewProps {
  file: File;
  password: string;
  onPasswordChange: (password: string) => void;
  passwordError: boolean;
  onPasswordError: (error: boolean) => void;
}

interface PageThumbnail {
  pageNum: number;
  dataUrl: string;
}

interface PdfViewport {
  width: number;
  height: number;
}

interface PdfPage {
  getViewport: (params: { scale: number }) => PdfViewport;
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => {
    promise: Promise<void>;
  };
}

interface PdfDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PdfPage>;
}

interface PdfJsModule {
  getDocument: (src: unknown) => { promise: Promise<PdfDocument> };
  GlobalWorkerOptions: { workerSrc: string };
}

interface PdfJsError {
  name?: string;
  message?: string;
}

export const PdfPreview = ({
  file,
  password,
  onPasswordChange,
  passwordError,
  onPasswordError
}: PdfPreviewProps) => {
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [selectedPage, setSelectedPage] = useState(1);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PdfDocument | null>(null);

  const loadPdf = useCallback(async () => {
    setLoading(true);
    setPreviewError(null);
    setThumbnails([]);
    
    try {
      // Dynamically import pdf.js
      const pdfjsLib = (await import('pdfjs-dist')) as PdfJsModule;

      // Use bundled worker (same-origin) to avoid cross-origin loading issues.
      pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

      const arrayBuffer = await file.arrayBuffer();
      
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        password: password || undefined,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });

      try {
        const pdf = await loadingTask.promise;
        pdfDocRef.current = pdf;
        setPageCount(pdf.numPages);
        setIsEncrypted(false);
        onPasswordError(false);

        // Generate thumbnails for first 5 pages (for performance)
        const maxThumbnails = Math.min(pdf.numPages, 5);
        const newThumbnails: PageThumbnail[] = [];

        for (let i = 1; i <= maxThumbnails; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.3 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({
              canvasContext: context,
              viewport: viewport,
            }).promise;

            newThumbnails.push({
              pageNum: i,
              dataUrl: canvas.toDataURL(),
            });
          }
        }

        setThumbnails(newThumbnails);
        setSelectedPage(1);
        
        // Render first page in larger view
        await renderPage(pdf, 1);
        
      } catch (err: unknown) {
        const error = err as PdfJsError;
        if (error.name === 'PasswordException') {
          setIsEncrypted(true);
          if (password) {
            onPasswordError(true);
            setPreviewError('Incorrect password');
          } else {
            setPreviewError('PDF is password-protected');
          }
        } else {
          setPreviewError(error.message || 'Failed to load PDF');
        }
      }
    } catch (err: unknown) {
      setPreviewError('Failed to initialize PDF viewer');
      if (import.meta.env.DEV) { console.error('PDF load error:', err); }
    } finally {
      setLoading(false);
    }
  }, [file, password, onPasswordError]);

  const renderPage = async (pdf: PdfDocument, pageNum: number) => {
    if (!canvasRef.current) return;
    
    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Calculate scale to fit in container (max 400px width)
      const desiredWidth = 400;
      const viewport = page.getViewport({ scale: 1 });
      const scale = desiredWidth / viewport.width;
      const scaledViewport = page.getViewport({ scale });

      canvas.height = scaledViewport.height;
      canvas.width = scaledViewport.width;

      if (context) {
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;
      }
    } catch (err) {
      if (import.meta.env.DEV) { console.error('Page render error:', err); }
    }
  };

  useEffect(() => {
    loadPdf();
  }, [loadPdf]);

  const handlePageChange = async (pageNum: number) => {
    if (pageNum < 1 || pageNum > pageCount || !pdfDocRef.current) return;
    setSelectedPage(pageNum);
    await renderPage(pdfDocRef.current, pageNum);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPdf();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading PDF preview...</p>
      </div>
    );
  }

  if (isEncrypted && !thumbnails.length) {
    return (
      <div className="flex flex-col items-center p-6 bg-muted/20 rounded-lg border border-primary/20">
        <Lock className="h-10 w-10 text-primary mb-3" />
        <p className="text-sm font-medium mb-3">Password-Protected PDF</p>
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-xs space-y-3">
          <Input
            type="password"
            placeholder="Enter PDF password"
            value={password}
            onChange={(e) => {
              onPasswordChange(e.target.value);
              onPasswordError(false);
            }}
            className={passwordError ? 'border-destructive' : ''}
          />
          {passwordError && (
            <p className="text-xs text-destructive text-center">
              Incorrect password. Please try again.
            </p>
          )}
          <Button type="submit" size="sm" className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            Unlock Preview
          </Button>
        </form>
      </div>
    );
  }

  if (previewError && !thumbnails.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg border border-border">
        <FileText className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{previewError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{pageCount} page{pageCount !== 1 ? 's' : ''}</span>
        </div>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(selectedPage - 1)}
                disabled={selectedPage <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            <span className="text-sm min-w-[60px] text-center">
              {selectedPage} / {pageCount}
            </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(selectedPage + 1)}
                disabled={selectedPage >= pageCount}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
          </div>
        )}
      </div>

      {/* Main preview */}
      <div className="flex justify-center bg-muted/10 rounded-lg p-4 border border-border">
        <canvas 
          ref={canvasRef} 
          className="rounded shadow-lg max-w-full"
          style={{ maxHeight: '400px' }}
        />
      </div>

      {/* Thumbnails */}
      {thumbnails.length > 1 && (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-2">
            {thumbnails.map((thumb) => (
                <button
                  type="button"
                  key={thumb.pageNum}
                  onClick={() => handlePageChange(thumb.pageNum)}
                  aria-label={`View page ${thumb.pageNum}`}
                  aria-current={selectedPage === thumb.pageNum ? "page" : undefined}
                  className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedPage === thumb.pageNum
                    ? 'border-primary shadow-neon'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src={thumb.dataUrl}
                  alt={`Page ${thumb.pageNum}`}
                  className="h-20 w-auto"
                />
                <span className="absolute bottom-1 right-1 text-xs bg-background/80 px-1 rounded">
                  {thumb.pageNum}
                </span>
              </button>
            ))}
            {pageCount > 5 && (
              <div className="flex items-center justify-center px-4 text-sm text-muted-foreground">
                +{pageCount - 5} more
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
