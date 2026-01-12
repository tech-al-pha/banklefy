import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/layout";
import { ConversionsTable } from "@/components/tables";
import { PageLoader } from "@/components/common";

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
  const { user } = useAuth();
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
    try {
      const { data, error } = await supabase
        .from("conversions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
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

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-screen bg-gradient-dark text-foreground">
      <DashboardHeader title="Akromeda Dashboard" />

      {/* Main Content */}
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Conversion History</h1>
            <p className="text-muted-foreground">
              View and download all your converted bank statements in Excel format.
              For CSV and JSON exports, use the converter on the home page.
            </p>
          </div>

          <ConversionsTable 
            conversions={conversions}
            downloadingId={downloadingId}
            onDownload={downloadExcel}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
