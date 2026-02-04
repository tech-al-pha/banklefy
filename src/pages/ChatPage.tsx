import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChatAura } from "@/components/ChatAura";
import akromedaLogo from "@/assets/akromeda-logo.png";

const ChatPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0502] text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a120b]/80 backdrop-blur-xl border-b border-primary/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={akromedaLogo} alt="Akromeda" className="h-10 w-10" />
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Chat Aura
              </h1>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')} 
              className="text-primary hover:bg-primary/10 gap-2 font-bold uppercase tracking-tighter"
            >
              <ArrowLeft size={18} /> Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Chat Container */}
      <div className="pt-28 pb-12 px-6">
        <div className="container mx-auto max-w-5xl">
          <ChatAura />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
