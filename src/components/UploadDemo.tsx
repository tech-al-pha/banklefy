import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, Sparkles, Loader2, Download, FileSpreadsheet, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { validateFile, sanitizeFilename } from "@/lib/fileValidation";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Transaction {
  date: string;
  description: string;
  amount: number;
  balance: number;
  type: string;
}

export const UploadDemo = () => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionResult, setConversionResult] = useState<{ id: string; resultPath: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.success) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: validation.error,
      });
      return;
    }

    setSelectedFile(file);
    toast({
      title: "File Selected",
      description: `${file.name} - Ready to convert`,
    });
  };

  const handleUploadClick = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to upload files.",
      });
      navigate('/auth');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleConvert = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a bank statement to convert",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to convert files.",
      });
      navigate('/auth');
      return;
    }

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const sanitized = sanitizeFilename(selectedFile.name);
      const filePath = `${user.id}/${Date.now()}_${sanitized}`;

      const { error: uploadError } = await supabase.storage
        .from('bank-statements')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      toast({
        title: "File uploaded",
        description: "Starting conversion...",
      });

      setUploading(false);
      setConverting(true);

      // Call edge function to process conversion
      const { data, error: functionError } = await supabase.functions.invoke('convert-document', {
        body: {
          fileId: filePath,
          fileName: selectedFile.name,
        },
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Store conversion result and transaction data
      setConversionResult({
        id: data.conversionId,
        resultPath: `results/${user.id}/${data.conversionId}.xlsx`
      });
      
      if (data.transactions && Array.isArray(data.transactions)) {
        setTransactions(data.transactions);
      }

      toast({
        title: "Conversion complete!",
        description: `Extracted ${data.transactions?.length || 0} transactions. Review and download below.`,
      });

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Conversion error:', error);
      toast({
        variant: "destructive",
        title: "Conversion failed",
        description: error.message || "An error occurred during conversion.",
      });
    } finally {
      setUploading(false);
      setConverting(false);
    }
  };

  const handleDownload = async () => {
    if (!conversionResult || !user) return;

    setDownloading(true);
    try {
      // Download file from Supabase Storage
      const { data, error } = await supabase.storage
        .from('bank-statements')
        .download(conversionResult.resultPath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Your Excel file has been downloaded.",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error.message || "Failed to download the file.",
      });
    } finally {
      setDownloading(false);
    }
  };

  const exportAsCSV = () => {
    if (transactions.length === 0) return;

    // Convert transactions to CSV
    const headers = ['Date', 'Description', 'Amount', 'Balance', 'Type'];
    const csvRows = [
      headers.join(','),
      ...transactions.map(t => 
        [t.date, `"${t.description}"`, t.amount, t.balance, t.type].join(',')
      )
    ];
    const csvContent = csvRows.join('\n');

    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "CSV Downloaded",
      description: "Your transaction data has been exported to CSV.",
    });
  };

  const exportAsJSON = () => {
    if (transactions.length === 0) return;

    // Convert transactions to JSON
    const jsonContent = JSON.stringify(transactions, null, 2);

    // Create and download JSON file
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "JSON Downloaded",
      description: "Your transaction data has been exported to JSON.",
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
                    disabled={uploading || converting}
                  >
                    Choose File
                  </Button>
                </div>
              </div>

              {/* Convert Button */}
              {selectedFile && (
                <div className="text-center space-y-3">
                  <Button
                    size="lg"
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-neon w-full md:w-auto"
                    onClick={handleConvert}
                    disabled={uploading || converting}
                  >
                    {uploading || converting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {uploading ? 'Uploading...' : 'Converting...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Convert to Excel
                      </>
                    )}
                  </Button>
                  
                  {/* Download Buttons */}
                  {conversionResult && (
                    <div className="w-full space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Download As:</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          size="lg"
                          className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white flex-1"
                          onClick={handleDownload}
                          disabled={downloading}
                        >
                          {downloading ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <FileSpreadsheet className="mr-2 h-5 w-5" />
                              Excel
                            </>
                          )}
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="flex-1"
                          onClick={exportAsCSV}
                          disabled={transactions.length === 0}
                        >
                          <FileText className="mr-2 h-5 w-5" />
                          CSV
                        </Button>
                        <Button
                          size="lg"
                          variant="outline"
                          className="flex-1"
                          onClick={exportAsJSON}
                          disabled={transactions.length === 0}
                        >
                          <FileJson className="mr-2 h-5 w-5" />
                          JSON
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction Preview */}
              {transactions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Extracted Transactions</h3>
                    <span className="text-sm text-muted-foreground">
                      {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found
                    </span>
                  </div>
                  
                  <Card className="overflow-hidden border-primary/20">
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Date</TableHead>
                            <TableHead className="font-semibold">Description</TableHead>
                            <TableHead className="font-semibold text-right">Amount</TableHead>
                            <TableHead className="font-semibold text-right">Balance</TableHead>
                            <TableHead className="font-semibold">Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((transaction, index) => (
                            <TableRow key={index} className="hover:bg-muted/30">
                              <TableCell className="font-medium">
                                {transaction.date}
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate">
                                {transaction.description}
                              </TableCell>
                              <TableCell className={`text-right font-semibold ${
                                transaction.type.toLowerCase() === 'debit' 
                                  ? 'text-red-600 dark:text-red-400' 
                                  : 'text-green-600 dark:text-green-400'
                              }`}>
                                {transaction.type.toLowerCase() === 'debit' ? '-' : '+'}
                                ${Math.abs(transaction.amount).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                ${transaction.balance.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.type.toLowerCase() === 'debit'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                    : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                }`}>
                                  {transaction.type}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </Card>
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
