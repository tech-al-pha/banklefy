import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";

export const UploadDemo = () => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      toast({
        title: "File Selected",
        description: `${file.name} - Ready to convert`,
      });
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleConvert = () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a bank statement to convert",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Coming Soon!",
      description: "AI conversion engine will be implemented next. For now, upload is working!",
    });
  };

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/20 rounded-full blur-3xl" />

      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold">
            See It In
            <span className="bg-gradient-primary bg-clip-text text-transparent"> Action</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Upload, convert, and download in three simple steps
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="p-8 md:p-12 bg-card/60 backdrop-blur-lg border-primary/20">
            <div className="space-y-8">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Upload Zone */}
              <div 
                onClick={handleUploadClick}
                className="border-2 border-dashed border-primary/30 rounded-lg p-12 text-center hover:border-primary/60 transition-all duration-300 hover:bg-primary/5 cursor-pointer group"
              >
                <div className="space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">
                      {selectedFile ? selectedFile.name : "Drop your bank statement here"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse files • Supports PDF, PNG, JPG
                    </p>
                  </div>
                  <Button 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUploadClick();
                    }}
                  >
                    Choose File
                  </Button>
                </div>
              </div>

              {/* Convert Button */}
              {selectedFile && (
                <div className="text-center">
                  <Button
                    size="lg"
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-neon"
                    onClick={handleConvert}
                  >
                    Convert to Excel
                  </Button>
                </div>
              )}

              {/* Process Steps */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/20">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">1. Upload</p>
                    <p className="text-xs text-muted-foreground">
                      Drag & drop your statement
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/20">
                  <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                    <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">2. AI Processing</p>
                    <p className="text-xs text-muted-foreground">
                      Our AI extracts data
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/20">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-accent" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">3. Download</p>
                    <p className="text-xs text-muted-foreground">
                      Get your Excel file
                    </p>
                  </div>
                </div>
              </div>

              {/* Supported Languages */}
              <div className="pt-6 border-t border-primary/10">
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Supports 50+ languages including:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {["English", "Hindi", "Arabic", "Mandarin", "French", "Spanish", "Russian", "German", "+42 more"].map(
                    (lang) => (
                      <span
                        key={lang}
                        className="px-3 py-1 rounded-full bg-card text-xs text-foreground border border-primary/20"
                      >
                        {lang}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
