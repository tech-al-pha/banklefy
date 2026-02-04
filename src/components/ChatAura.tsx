import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  FileText, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { invokeEdgeFunction } from "@/lib/supabaseApi";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatAuraProps {
  pdfContext?: string;
  pdfFileName?: string;
  onClose?: () => void;
}

// Session-based usage tracking (resets on refresh)
const getChatUsage = () => {
  const stored = sessionStorage.getItem("chatAuraUsage");
  return stored ? parseInt(stored, 10) : 0;
};

const incrementChatUsage = () => {
  const current = getChatUsage();
  sessionStorage.setItem("chatAuraUsage", String(current + 1));
  return current + 1;
};

export const ChatAura = ({ pdfContext, pdfFileName, onClose }: ChatAuraProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatUsed, setChatUsed] = useState(getChatUsage());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load context from sessionStorage if props not provided (for cross-page access)
  const storedContext = sessionStorage.getItem('chatAuraContext');
  const storedFileName = sessionStorage.getItem('chatAuraFileName');
  
  const effectivePdfContext = pdfContext || storedContext;
  const effectiveFileName = pdfFileName || storedFileName;

  // Free users: 1 interaction lifetime (until refresh)
  // Authenticated users: unlimited (until refresh)
  const isLimitReached = !user && chatUsed >= 1;
  const remainingChats = user ? "∞" : Math.max(0, 1 - chatUsed);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    const greeting: Message = {
      id: "greeting",
      role: "assistant",
      content: effectivePdfContext 
        ? t('chatAura.greetingWithPdf').replace('{fileName}', effectiveFileName || 'document')
        : t('chatAura.greeting'),
      timestamp: new Date()
    };
    setMessages([greeting]);
  }, [effectivePdfContext, effectiveFileName, t]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isLimitReached) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await invokeEdgeFunction<{ response: string }>("chat-aura", {
        body: {
          message: userMessage.content,
          pdfContext: effectivePdfContext || null,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.response || t('chatAura.errorResponse'),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Increment usage for free users
      if (!user) {
        const newUsage = incrementChatUsage();
        setChatUsed(newUsage);
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: t('chatAura.errorResponse'),
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-[#1a120b]/90 border-primary/20 backdrop-blur-xl">
      <CardHeader className="border-b border-primary/20 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Chat Aura</CardTitle>
              <p className="text-xs text-muted-foreground">{t('chatAura.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {effectivePdfContext && (
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                <FileText className="h-3 w-3" />
                {effectiveFileName || "PDF"}
              </Badge>
            )}
            <Badge variant="outline" className="border-primary/30">
              {remainingChats} {t('chatAura.remaining')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-80 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="p-2 rounded-full bg-primary/20 h-fit">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs opacity-50 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="p-2 rounded-full bg-muted h-fit">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="p-2 rounded-full bg-primary/20 h-fit">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted/50 rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-primary/20">
          {isLimitReached ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{t('chatAura.limitReached')}</p>
                <p className="text-xs text-muted-foreground">{t('chatAura.signUpForMore')}</p>
              </div>
              <Button size="sm" onClick={() => window.location.href = '/auth'}>
                {t('chatAura.signUp')}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder={t('chatAura.placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading}
                className="flex-1 bg-background/50 border-primary/20"
              />
              <Button 
                onClick={handleSend} 
                disabled={!input.trim() || isLoading}
                className="bg-primary hover:bg-primary/90"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatAura;
