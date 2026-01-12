import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield } from "lucide-react";
import akromedaLogo from "@/assets/akromeda-logo.png";

export const AdminHeader = () => {
  const navigate = useNavigate();

  return (
    <header className="border-b border-primary/10 bg-background/80 backdrop-blur-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <img src={akromedaLogo} alt="Akromeda" className="h-8 w-8" />
              <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Admin Dashboard
              </span>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/50 text-primary">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        </div>
      </div>
    </header>
  );
};
