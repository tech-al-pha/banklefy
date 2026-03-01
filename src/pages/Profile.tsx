import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { buildMt940, buildStatementJson, downloadTextFile } from "@/lib/statement-export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import { Loader2, LogOut } from "lucide-react";
import { formatPlanLabel } from "@/lib/planLabels";
import { useToast } from "@/hooks/use-toast";

interface RecentConversion {
  id: string;
  original_filename: string;
  status: string;
  created_at: string;
  completed_at?: string | null;
  result_path?: string | null;
  file_path?: string;
  error_message?: string | null;
}

const Profile = () => {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { conversionsUsed, conversionsLimit, remaining, planType, loading: usageLoading } = useUsageLimit();
  const { settings, profileData, updateProfile, sendPasswordReset, saving, updateSetting } = useSettings();
  const [recent, setRecent] = useState<RecentConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [nameChanged, setNameChanged] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const workbookCache = useState(() => new Map<string, ArrayBuffer>())[0];
  const authFlags = user as { email_confirmed_at?: string | null; confirmed_at?: string | null } | null;
  const isVerified = Boolean(authFlags?.email_confirmed_at || authFlags?.confirmed_at);

  const fetchRecent = useCallback(async (showLoading = false) => {
    if (!user) return;
    if (showLoading) {
      setLoading(true);
    }
    const { data, error } = await supabase
      .from("conversions")
      .select("id, original_filename, status, created_at, completed_at, result_path, file_path, error_message")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!error) {
      setRecent(data || []);
    }
    if (showLoading) {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchRecent(true);
  }, [user, navigate, fetchRecent]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-conversions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversions", filter: `user_id=eq.${user.id}` },
        () => {
          fetchRecent();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchRecent]);

  useEffect(() => {
    const name = profileData?.full_name || user?.user_metadata?.full_name || "";
    setDisplayName(name);
    setNameChanged(false);
  }, [profileData, user]);

  const visibleRecent = useMemo(() => recent, [recent]);

  const handleSaveName = async () => {
    await updateProfile(displayName);
    setNameChanged(false);
  };

  const handlePasswordReset = async () => {
    if (user?.email) {
      await sendPasswordReset(user.email);
    }
  };

  const sanitizeFileBaseName = (value?: string | null, fallback = "bank-statement") => {
    const source = (value ?? "").trim();
    const noExtension = source.replace(/\.[^/.\\]+$/, "");
    const safe = noExtension
      .replace(/[<>:"/\\|?*]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\.+$/g, "")
      .trim();
    return safe || fallback;
  };

  const parseAmount = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/,/g, "").trim();
      if (!cleaned) return 0;
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const parseWorkbookExportData = async (buffer: ArrayBuffer) => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
    }) as (string | number)[][];

    const bankMeta: {
      bankName?: string;
      accountNumber?: string;
      accountHolder?: string;
      currency?: string;
      iban?: string;
      statementPeriod?: string;
    } = {};

    const hasLabel = (label: string, rowValue: string) => rowValue.trim().toLowerCase() === label;
    for (const row of rows.slice(0, 16)) {
      const key = String(row[0] ?? "").trim().toLowerCase();
      const value = String(row[1] ?? "").trim();
      if (!value) continue;

      if (hasLabel("bank name", key)) bankMeta.bankName = value;
      if (hasLabel("currency type", key)) bankMeta.currency = value;
      if (hasLabel("account number", key)) bankMeta.accountNumber = value;
      if (hasLabel("account holder name", key)) bankMeta.accountHolder = value;
      if (hasLabel("statement period", key)) bankMeta.statementPeriod = value;
      if (hasLabel("iban", key)) bankMeta.iban = value;
    }

    const headerRowIndex = rows.findIndex((row) => {
      const cells = row.map((cell) => String(cell ?? "").trim().toLowerCase());
      return (
        cells.some((cell) => cell === "date" || cell.includes("transaction date")) &&
        cells.some((cell) => cell.includes("description") || cell.includes("narration")) &&
        cells.some((cell) => cell.includes("debit")) &&
        cells.some((cell) => cell.includes("credit")) &&
        cells.some((cell) => cell.includes("balance"))
      );
    });

    if (headerRowIndex < 0) {
      throw new Error("Could not locate transaction table in workbook.");
    }

    const headers = rows[headerRowIndex].map((cell) => String(cell ?? "").trim().toLowerCase());
    const dateIndex = headers.findIndex((header) => header === "date" || header.includes("transaction date"));
    const referenceIndex = headers.findIndex((header) => header.includes("reference"));
    const descriptionIndex = headers.findIndex((header) => header.includes("description") || header.includes("narration"));
    const debitIndex = headers.findIndex((header) => header.includes("debit"));
    const creditIndex = headers.findIndex((header) => header.includes("credit"));
    const balanceIndex = headers.findIndex((header) => header.includes("balance"));

    if (dateIndex < 0 || descriptionIndex < 0 || debitIndex < 0 || creditIndex < 0 || balanceIndex < 0) {
      throw new Error("Workbook columns are missing required transaction fields.");
    }

    const transactions = rows
      .slice(headerRowIndex + 1)
      .map((row) => {
        const description = String(row[descriptionIndex] ?? "").trim();
        const date = String(row[dateIndex] ?? "").trim();
        if (!date || !description) return null;
        if (description.toLowerCase() === "total") return null;

        const referenceText = referenceIndex >= 0 ? String(row[referenceIndex] ?? "").trim() : "";
        return {
          date,
          description,
          refNumber: referenceText || undefined,
          debit: parseAmount(row[debitIndex]),
          credit: parseAmount(row[creditIndex]),
          balance: parseAmount(row[balanceIndex]),
          category: "Uncategorized",
        };
      })
      .filter((item): item is {
        date: string;
        description: string;
        refNumber?: string;
        debit: number;
        credit: number;
        balance: number;
        category: string;
      } => Boolean(item));

    if (transactions.length === 0) {
      throw new Error("No transactions found in workbook.");
    }

    return { transactions, bankMeta };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "processing":
        return <Badge className="bg-yellow-600">Processing</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const fetchResultBuffer = async (item: RecentConversion) => {
    if (!item.result_path) {
      throw new Error("Result not available yet.");
    }
    const cached = workbookCache.get(item.id);
    if (cached) return cached;

    const { data, error } = await supabase.storage
      .from("bank-statements")
      .download(item.result_path);

    if (error || !data) {
      throw new Error(error?.message || "Failed to download result file.");
    }
    const buffer = await data.arrayBuffer();
    workbookCache.set(item.id, buffer);
    return buffer;
  };

  const downloadExcel = async (item: RecentConversion) => {
    try {
      setDownloadingId(item.id);
      const buffer = await fetchResultBuffer(item);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFileBaseName(item.original_filename)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error instanceof Error ? error.message : "Failed to download file.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadAsCsv = async (item: RecentConversion) => {
    try {
      setDownloadingId(item.id);
      const buffer = await fetchResultBuffer(item);
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFileBaseName(item.original_filename)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "CSV export failed",
        description: error instanceof Error ? error.message : "Failed to export CSV.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadAsJson = async (item: RecentConversion) => {
    try {
      setDownloadingId(item.id);
      const buffer = await fetchResultBuffer(item);
      const { transactions, bankMeta } = await parseWorkbookExportData(buffer);
      const content = buildStatementJson({
        transactions,
        bankInfo: bankMeta,
        currencyCode: bankMeta.currency,
      });

      downloadTextFile(
        content,
        `${sanitizeFileBaseName(item.original_filename)}.json`,
        "application/json;charset=utf-8",
      );
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "JSON export failed",
        description: error instanceof Error ? error.message : "Failed to export JSON.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadAsMt940 = async (item: RecentConversion) => {
    try {
      setDownloadingId(item.id);
      const buffer = await fetchResultBuffer(item);
      const { transactions, bankMeta } = await parseWorkbookExportData(buffer);
      const content = buildMt940({
        transactions,
        bankInfo: bankMeta,
        currencyCode: bankMeta.currency,
        statementReference: item.id,
      });

      downloadTextFile(
        content,
        `${sanitizeFileBaseName(item.original_filename)}.mt940`,
        "text/plain;charset=utf-8",
      );
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "MT940 export failed",
        description: error instanceof Error ? error.message : "Failed to export MT940.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteConversion = async (item: RecentConversion) => {
    if (!session?.access_token) {
      toast({
        variant: "destructive",
        title: "Not authorized",
        description: "Please sign in again to delete this file.",
      });
      return;
    }
    try {
      setDeletingId(item.id);
      const { error } = await supabase.functions.invoke("delete-conversion", {
        body: { conversionId: item.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw new Error(error.message || "Failed to delete conversion");
      setRecent((prev) => prev.filter((c) => c.id !== item.id));
      toast({ title: "Deleted", description: "File and data deleted successfully." });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete conversion.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!user || loading || usageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-elevated/60 backdrop-blur-lg border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
            className="border-primary/50 bg-[#141414]"
          >
            Back to Home
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card className="p-6 glass-card">
            <h1 className="text-2xl font-bold mb-4">Account</h1>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <p className="text-base font-semibold text-foreground">{user.email}</p>
                  {isVerified && <Badge variant="secondary">Verified</Badge>}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Display Name</p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setNameChanged(e.target.value !== (user?.user_metadata?.full_name || ""));
                    }}
                    placeholder="Enter your name"
                  />
                  {nameChanged && (
                    <Button size="sm" onClick={handleSaveName} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Password</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={handlePasswordReset} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Reset Password
                </Button>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Edited PDF Warning Timing</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose when the edited-PDF warning should appear.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={settings.editedPdfWarningTiming === "upload" ? "default" : "outline"}
                    onClick={() => updateSetting("editedPdfWarningTiming", "upload")}
                  >
                    After Upload
                  </Button>
                  <Button
                    size="sm"
                    variant={settings.editedPdfWarningTiming === "convert" ? "default" : "outline"}
                    onClick={() => updateSetting("editedPdfWarningTiming", "convert")}
                  >
                    On Convert
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="border-primary/50 bg-[#141414]"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </Card>

          <Card className="p-6 glass-card">
            <h2 className="text-xl font-semibold mb-4">Usage</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Plan</p>
                <p className="text-base font-semibold text-foreground">{formatPlanLabel(planType)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pages Today</p>
                <p className="text-base font-semibold text-foreground">
                  {conversionsUsed}/{conversionsLimit}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Remaining</p>
                <p className="text-base font-semibold text-foreground">{remaining}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 glass-card">
            <h2 className="text-xl font-semibold mb-2">Processing History</h2>
            <p className="text-sm text-muted-foreground mb-4">
              View and manage all converted files.
            </p>
            {visibleRecent.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">No pages processed yet.</p>
                <Button onClick={() => navigate("/?next=demo")}>Start Converting</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[920px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRecent.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium max-w-[280px] truncate">
                          {item.original_filename}
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>{format(new Date(item.created_at), "MMM d, yyyy HH:mm")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            {item.status === "completed" && item.result_path ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadExcel(item)}
                                  disabled={downloadingId === item.id}
                                >
                                  {downloadingId === item.id ? "Downloading..." : "Excel"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadAsCsv(item)}
                                  disabled={downloadingId === item.id}
                                >
                                  CSV
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadAsJson(item)}
                                  disabled={downloadingId === item.id}
                                >
                                  JSON
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadAsMt940(item)}
                                  disabled={downloadingId === item.id}
                                >
                                  MT940
                                </Button>
                              </>
                            ) : item.status === "failed" ? (
                              <span className="text-xs text-destructive max-w-[220px] truncate">
                                {item.error_message || "Conversion failed"}
                              </span>
                            ) : (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/40 text-red-300 hover:text-red-200"
                              onClick={() => handleDeleteConversion(item)}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
