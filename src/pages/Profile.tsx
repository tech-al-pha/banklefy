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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Camera, Loader2, LogOut } from "lucide-react";
import { formatPlanLabel } from "@/lib/planLabels";
import { useToast } from "@/hooks/use-toast";
import LoadingScreen from "@/components/LoadingScreen";

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
  const { profileData, updateProfile, sendPasswordReset, saving } = useSettings();
  const [recent, setRecent] = useState<RecentConversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [nameChanged, setNameChanged] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [emailChanged, setEmailChanged] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [totalConversions, setTotalConversions] = useState<number | null>(null);
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
    const { count } = await supabase
      .from("conversions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (typeof count === "number") {
      setTotalConversions(count);
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
    setEmail(user?.email ?? "");
    setEmailChanged(false);
    setAvatarUrl(profileData?.avatar_url ?? (user?.user_metadata?.avatar_url as string | undefined) ?? null);
  }, [profileData, user]);

  const visibleRecent = useMemo(() => recent, [recent]);

  const handleSaveName = async () => {
    await updateProfile(displayName);
    setNameChanged(false);
  };

  const handleSaveEmail = async () => {
    if (!user) return;
    const nextEmail = email.trim();
    if (!nextEmail) return;
    if (nextEmail === user.email) {
      setEmailChanged(false);
      return;
    }
    setEmailSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) throw error;

      await supabase
        .from("profiles")
        .update({ email: nextEmail })
        .eq("id", user.id);

      toast({
        title: "Email update requested",
        description: "Check your inbox to confirm the new email address.",
      });
      setEmailChanged(false);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Email update failed",
        description: error instanceof Error ? error.message : "Could not update email.",
      });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Unsupported file",
        description: "Please upload a JPG, PNG, or WEBP image.",
      });
      return;
    }
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("profile-photos").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (profileError) throw profileError;

      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setAvatarUrl(publicUrl);
      toast({ title: "Profile photo updated" });
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Could not upload photo.",
      });
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const handlePasswordReset = async () => {
    if (user?.email) {
      await sendPasswordReset(user.email);
    }
  };

  const memberSince = user?.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—";
  const planLabel = formatPlanLabel(planType);
  const displayNameFallback = profileData?.full_name || user?.user_metadata?.full_name || "Member";
  const userEmailFallback = user?.email ?? "â€”";

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
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

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
    return <LoadingScreen />;
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
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <Avatar className="h-20 w-20 border border-primary/30">
                    <AvatarImage src={avatarUrl ?? undefined} />
                    <AvatarFallback>{displayName ? displayName[0]?.toUpperCase() : "U"}</AvatarFallback>
                  </Avatar>
                  <label className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-neon">
                    {avatarUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                    />
                  </label>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Profile</h1>
                  <p className="text-sm text-muted-foreground">Member since {memberSince}</p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="text-[0.65rem] uppercase tracking-[0.35em] text-muted-foreground">
                  Account Type
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/20 text-primary border-primary/30">{planLabel}</Badge>
                  {isVerified && <Badge variant="secondary">Verified</Badge>}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Name</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setNameChanged(e.target.value !== (user?.user_metadata?.full_name || ""));
                    }}
                    placeholder={displayNameFallback}
                  />
                  {nameChanged && (
                    <Button size="sm" onClick={handleSaveName} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Input
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailChanged(e.target.value !== (user?.email ?? ""));
                    }}
                    placeholder={userEmailFallback}
                  />
                  {emailChanged && (
                    <Button size="sm" onClick={handleSaveEmail} disabled={emailSaving}>
                      {emailSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
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
            <div className="flex flex-col gap-1 mb-5">
              <h2 className="text-xl font-semibold">Usage & Achievements</h2>
              <p className="text-sm text-muted-foreground">Track your credits and lifetime conversions at a glance.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-primary/20 bg-[#121212] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Credits Remaining</p>
                <p className="mt-2 text-3xl font-bold text-primary">{remaining}</p>
                <p className="text-xs text-muted-foreground mt-1">Available conversions</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-[#121212] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Pages Today</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {conversionsUsed}/{conversionsLimit}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Daily usage</p>
              </div>
              <div className="rounded-xl border border-primary/20 bg-[#121212] p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Total Conversions</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{totalConversions ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Lifetime statements processed</p>
              </div>
            </div>
          </Card>

        </div>
      </main>
    </div>
  );
};

export default Profile;
