import { Loader2 } from "lucide-react";

export const PageLoader = () => {
  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};
