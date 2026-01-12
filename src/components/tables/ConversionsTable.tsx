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
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

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

interface ConversionsTableProps {
  conversions: Conversion[];
  downloadingId: string | null;
  onDownload: (conversion: Conversion) => void;
}

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

export const ConversionsTable = ({ conversions, downloadingId, onDownload }: ConversionsTableProps) => {
  const navigate = useNavigate();

  if (conversions.length === 0) {
    return (
      <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
        <div className="p-12 text-center">
          <p className="text-muted-foreground mb-4">No conversions yet</p>
          <Button onClick={() => navigate("/")}>
            Start Converting
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
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
                    onClick={() => onDownload(conversion)}
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
    </Card>
  );
};
