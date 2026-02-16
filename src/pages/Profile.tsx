import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  const { profileData, updateProfile, sendPasswordReset, saving } = useSettings();
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

  const getExpiryLabel = (createdAt: string) => {
    const expiresAt = new Date(new Date(createdAt).getTime() + 24 * 60 * 60 * 1000);
    const msLeft = expiresAt.getTime() - Date.now();
    if (msLeft <= 0) return "Expired";
    const hours = Math.floor(msLeft / (1000 * 60 * 60));
    const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m left`;
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

  const downloadAsOds = async (item: RecentConversion) => {
    try {
      setDownloadingId(item.id);
      const buffer = await fetchResultBuffer(item);
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      const wbout = XLSX.write(workbook, { bookType: "ods", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.oasis.opendocument.spreadsheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFileBaseName(item.original_filename)}.ods`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "ODS export failed",
        description: error instanceof Error ? error.message : "Failed to export ODS.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const downloadAsDocx = async (item: RecentConversion) => {
    try {
      setDownloadingId(item.id);
      const buffer = await fetchResultBuffer(item);
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: (string | number)[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel } = await import("docx");

      const safeRows = rows.slice(0, 100);
      const header = safeRows[0] ?? [];
      const bodyRows = safeRows.slice(1);

      const headerRow = new TableRow({
        children: header.map((cell) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? ""), bold: true })] })],
          })
        ),
      });

      const dataRows = bodyRows.map((row) =>
        new TableRow({
          children: header.map((_, idx) =>
            new TableCell({ children: [new Paragraph(String(row[idx] ?? ""))] })
          ),
        })
      );

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({ text: "Banklefy Export", heading: HeadingLevel.HEADING_1 }),
              new Table({ rows: [headerRow, ...dataRows] }),
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sanitizeFileBaseName(item.original_filename)}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      toast({
        variant: "destructive",
        title: "DOCX export failed",
        description: error instanceof Error ? error.message : "Failed to export DOCX.",
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
              Your latest converted files (newest first).
            </p>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pages processed yet.</p>
            ) : (
              <div className="space-y-3">
                {recent.map((item) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.original_filename}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(item.created_at), "MMM d, yyyy HH:mm")}</p>
                      <p className="text-[11px] text-muted-foreground">{getExpiryLabel(item.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      {item.status === "completed" && item.result_path ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => downloadExcel(item)} disabled={downloadingId === item.id}>
                            {downloadingId === item.id ? "Downloading..." : "Excel"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadAsCsv(item)} disabled={downloadingId === item.id}>
                            CSV
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadAsOds(item)} disabled={downloadingId === item.id}>
                            ODS
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => downloadAsDocx(item)} disabled={downloadingId === item.id}>
                            DOCX
                          </Button>
                        </>
                      ) : item.status === "failed" ? (
                        <span className="text-xs text-destructive">{item.error_message || "Conversion failed"}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{item.status}</span>
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
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Profile;
