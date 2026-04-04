import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChatAura } from "@/components/ChatAura";
import banklefyLogo from "@/assets/banklefy-logo.svg";
import AutoHideHeader from "@/components/AutoHideHeader";

const ChatPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <AutoHideHeader as="nav" className="bg-surface-elevated/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <img src={banklefyLogo} alt="Banklefy" className="h-10 w-10" />
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Chat Aura
              </h1>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="back-pill w-full sm:w-auto"
            >
              <ArrowLeft size={18} /> Back to Home
            </Button>
          </div>
        </div>
      </AutoHideHeader>

      {/* Chat Container */}
      <div className="pt-28 pb-12 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <ChatAura />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
