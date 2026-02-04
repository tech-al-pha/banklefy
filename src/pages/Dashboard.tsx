import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, ArrowLeft, Loader2, Home } from "lucide-react";
import { format } from "date-fns";
import akromedaLogo from "@/assets/akromeda-logo.png";

interface Conversion {
  id: string;
  original_filename: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  result_path: string | null;
  error_message: string | null;
  file_path: string;
}

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchConversions();
  }, [user, navigate]);

  const fetchConversions = async () => {
    if (!user) return;
    
    try {
      // Query conversions table - RLS ensures only user's own data is returned
      const { data, error } = await supabase
        .from("conversions")
        .select("id, original_filename, status, created_at, completed_at, result_path, error_message, file_path")
        .eq("user_id", user.id) // Explicit filter even though RLS handles it
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Conversions query error:", error);
        throw error;
      }
      setConversions(data || []);
    } catch (error: any) {
      console.error("Error fetching conversions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load conversion history.",
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async (conversion: Conversion) => {
    if (!conversion.result_path) return;

    setDownloadingId(conversion.id);
    try {
      const { data, error } = await supabase.storage
        .from("bank-statements")
        .download(conversion.result_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${conversion.original_filename.replace(/\.[^/.]+$/, "")}_converted.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Downloaded!",
        description: "Excel file downloaded successfully.",
      });
    } catch (error: any) {
      console.error("Download error:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: error.message || "Failed to download the file.",
      });
    } finally {
      setDownloadingId(null);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0502] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0502] text-foreground relative overflow-hidden">
      {/* 3D Background */}
      <div className="dashboard-3d" aria-hidden="true">
        <div className="dashboard-3d-layer layer-1" />
        <div className="dashboard-3d-layer layer-2" />
        <div className="dashboard-3d-layer layer-3" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-primary/10 relative">
        <div className="container mx-auto px-6 py-4 bg-[#1a120b]/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2">
                <img src={akromedaLogo} alt="Akromeda" className="h-10 w-10 md:h-12 md:w-12" />
                <span className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Akromeda Dashboard
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
              >
                <Home className="mr-2 h-4 w-4" />
                Home
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                className="border-primary/50 hover:bg-primary/10"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-28 pb-16 relative z-10">
        <div className="max-w-7xl mx-auto space-y-10">
          <div>
            <h1 className="text-4xl font-bold mb-2">Conversion History</h1>
            <p className="text-muted-foreground">
              View and download all your converted bank statements in Excel format.
              For CSV and JSON exports, use the converter on the home page.
            </p>
          </div>

          <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
            {conversions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No conversions yet</p>
                <Button onClick={() => navigate("/")}>
                  Start Converting
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.map((conversion) => (
                    <TableRow key={conversion.id}>
                      <TableCell className="font-medium">
                        {conversion.original_filename}
                      </TableCell>
                      <TableCell>{getStatusBadge(conversion.status)}</TableCell>
                      <TableCell>
                        {format(new Date(conversion.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {conversion.completed_at
                          ? format(new Date(conversion.completed_at), "MMM d, yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {conversion.status === "completed" && conversion.result_path ? (
                          <Button
                            size="sm"
                            onClick={() => downloadExcel(conversion)}
                            disabled={downloadingId === conversion.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {downloadingId === conversion.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <FileSpreadsheet className="mr-2 h-4 w-4" />
                            )}
                            Download Excel
                          </Button>
                        ) : conversion.status === "failed" ? (
                          <span className="text-sm text-destructive">
                            {conversion.error_message || "Conversion failed"}
                          </span>
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
