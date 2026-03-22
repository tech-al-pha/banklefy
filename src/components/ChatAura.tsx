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
  Loader2,
  Upload,
} from "lucide-react";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { supabase } from "@/integrations/supabase/client";
import { getConversionResultStoragePath } from "@/lib/conversion-history";
import { getPdfWorkerSrc } from "@/lib/pdfWorker";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface RecentConversion {
  id: string;
  file_name: string | null;
  created_at: string | null;
  status: string | null;
}

interface ChatAuraProps {
  pdfContext?: string;
  pdfFileName?: string;
  onClose?: () => void;
}

type PdfTextItem = {
  str?: string;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNum: number) => Promise<{
    getTextContent?: () => Promise<{ items?: PdfTextItem[] }>;
  }>;
  destroy?: () => Promise<void> | void;
};

type PdfJsModule = {
  getDocument: (src: unknown) => { promise: Promise<PdfDocument> };
  GlobalWorkerOptions: { workerSrc: string };
};

const getChatUsage = () => {
  try {
    const stored = sessionStorage.getItem("chatAuraUsage");
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
};

const incrementChatUsage = () => {
  const current = getChatUsage();
  try {
    sessionStorage.setItem("chatAuraUsage", String(current + 1));
  } catch {
    // Ignore sessionStorage failures (privacy mode/quota)
  }
  return current + 1;
};

const safeSessionGet = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSessionSet = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Ignore sessionStorage failures (privacy mode/quota)
  }
};

const extractPdfContextFromFile = async (file: File): Promise<string> => {
  const pdfjsLib = (await import("pdfjs-dist")) as PdfJsModule;
  pdfjsLib.GlobalWorkerOptions.workerSrc = await getPdfWorkerSrc();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const maxPages = Math.min(pdf.numPages || 0, 50);
  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent?.();
    const pageText = (textContent?.items || [])
      .map((item) => (typeof item?.str === "string" ? item.str : ""))
      .map((text) => text.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join(" ")
      .trim();

    if (pageText) {
      pageTexts.push(`Page ${pageNum}: ${pageText}`);
    }
  }

  await pdf.destroy?.();
  return pageTexts.join("\n\n").trim();
};

export const ChatAura = ({ pdfContext, pdfFileName }: ChatAuraProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { executeRecaptcha } = useRecaptcha();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatUsed, setChatUsed] = useState(getChatUsage());
  const [recentConversions, setRecentConversions] = useState<RecentConversion[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [activePdfContext, setActivePdfContext] = useState<string | null>(
    () => pdfContext || safeSessionGet("chatAuraContext"),
  );
  const [activeFileName, setActiveFileName] = useState<string | null>(
    () => pdfFileName || safeSessionGet("chatAuraFileName"),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const greetingInitializedRef = useRef(false);

  const isLimitReached = !user && chatUsed >= 1;
  const remainingChats = user ? "?" : Math.max(0, 1 - chatUsed);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (greetingInitializedRef.current) {
      return;
    }
    greetingInitializedRef.current = true;

    const greeting: Message = {
      id: "greeting",
      role: "assistant",
      content: activePdfContext
        ? t("chatAura.greetingWithPdf").replace("{fileName}", activeFileName || "document")
        : t("chatAura.greeting"),
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [activeFileName, activePdfContext, t]);

  useEffect(() => {
    if (!user) {
      setRecentConversions([]);
      return;
    }

    let isMounted = true;

    const loadRecent = async () => {
      setRecentLoading(true);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("conversions")
        .select("id, original_filename, created_at, status")
        .eq("user_id", user.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (!error && data) {
        setRecentConversions(data.map((d: Record<string, unknown>) => ({
          id: String(d.id ?? ''),
          file_name: String(d.original_filename ?? ''),
          created_at: String(d.created_at ?? ''),
          status: String(d.status ?? ''),
        })));
      }
      setRecentLoading(false);
    };

    loadRecent();

    const channel = supabase
      .channel(`chat-aura-conversions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversions", filter: `user_id=eq.${user.id}` },
        () => {
          loadRecent();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const findConversionFromMessage = (message: string) => {
    if (!recentConversions.length) return null;
    const normalizedMessage = message.toLowerCase();
    const normalize = (name: string) => name.toLowerCase().replace(/\.[^/.]+$/, "");
    const candidates = [...recentConversions].sort(
      (a, b) => (b.file_name?.length ?? 0) - (a.file_name?.length ?? 0),
    );
    return candidates.find((conv) =>
      (conv.file_name ? normalizedMessage.includes(conv.file_name.toLowerCase()) : false) ||
      (conv.file_name ? normalizedMessage.includes(normalize(conv.file_name)) : false),
    ) || null;
  };

  const appendAssistantMessage = (content: string) => {
    const message: Message = {
      id: `${Date.now()}-assistant`,
      role: "assistant",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPdfUploadError(null);

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPdfUploadError("Please upload a PDF file.");
      event.target.value = "";
      return;
    }

    setIsPreparingPdf(true);
    try {
      const extractedContext = await extractPdfContextFromFile(file);
      if (!extractedContext) {
        setPdfUploadError("Could not read text from this PDF. Please upload a text-based PDF.");
        return;
      }

      setActivePdfContext(extractedContext);
      setActiveFileName(file.name);
      safeSessionSet("chatAuraContext", extractedContext);
      safeSessionSet("chatAuraFileName", file.name);
      appendAssistantMessage(`Loaded ${file.name}. You can now ask questions from this statement.`);
    } catch (error) {
      if (import.meta.env.DEV) { console.error("Chat Aura PDF upload failed:", error); }
      setPdfUploadError("Failed to read this PDF. Please try another file.");
    } finally {
      setIsPreparingPdf(false);
      event.target.value = "";
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || isLimitReached) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    const matchedConversion = findConversionFromMessage(userMessage.content);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const sessionToken = user
        ? (await supabase.auth.getSession()).data.session?.access_token
        : null;

      let recaptchaToken: string | null = null;
      if (!sessionToken) {
        recaptchaToken = await executeRecaptcha("chat_aura");
        if (!recaptchaToken) {
          throw new Error("CAPTCHA not ready");
        }
      }

      const { data, error } = await supabase.functions.invoke<{ response: string }>("chat-aura", {
        body: {
          message: userMessage.content,
          pdfContext: activePdfContext || null,
          recentConversions: recentConversions.map((conv) => ({
            id: conv.id,
            fileName: conv.file_name ?? "document",
            createdAt: conv.created_at ?? "",
            status: conv.status,
            resultPath: user ? getConversionResultStoragePath(user.id, conv.id) : null,
          })),
          selectedConversion: matchedConversion
            ? {
                id: matchedConversion.id,
                fileName: matchedConversion.file_name ?? "document",
                createdAt: matchedConversion.created_at ?? "",
                status: matchedConversion.status,
                resultPath: user ? getConversionResultStoragePath(user.id, matchedConversion.id) : null,
              }
            : null,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
          recaptchaToken: sessionToken ? null : recaptchaToken,
        },
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined,
      });

      if (error) {
        throw new Error(error.message || "Failed to send message");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.response || t("chatAura.errorResponse"),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!user) {
        const newUsage = incrementChatUsage();
        setChatUsed(newUsage);
      }
    } catch (err) {
      if (import.meta.env.DEV) { console.error("Chat error:", err); }
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: t("chatAura.errorResponse"),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
    <Card className="w-full max-w-2xl mx-auto bg-surface-elevated/90 border-primary/20 backdrop-blur-xl">
      <CardHeader className="border-b border-primary/20 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Chat Aura</CardTitle>
              <p className="text-xs text-muted-foreground">{t("chatAura.subtitle")}</p>
              {user && (
                <p className="text-[11px] text-muted-foreground">
                  {recentLoading
                    ? "Syncing your recent activity..."
                    : `${recentConversions.length} recent file${recentConversions.length === 1 ? "" : "s"} indexed.`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-primary/30"
              disabled={isPreparingPdf}
              onClick={() => fileInputRef.current?.click()}
            >
              {isPreparingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span className="ml-2">Upload PDF</span>
            </Button>
            <Badge variant="outline" className="border-primary/30">
              {remainingChats} {t("chatAura.remaining")}
            </Badge>
          </div>
        </div>
        {activeFileName && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="truncate">Using: {activeFileName}</span>
          </div>
        )}
        {pdfUploadError && (
          <div className="mt-3 text-xs text-destructive">{pdfUploadError}</div>
        )}
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
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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

        <div className="p-4 border-t border-primary/20">
          {isLimitReached ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">{t("chatAura.limitReached")}</p>
                <p className="text-xs text-muted-foreground">{t("chatAura.signUpForMore")}</p>
              </div>
              <Button size="sm" onClick={() => (window.location.href = "/auth")}>
                {t("chatAura.signUp")}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder={t("chatAura.placeholder")}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                disabled={isLoading || isPreparingPdf}
                className="flex-1 border-primary/20"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || isPreparingPdf}
                className="bg-primary"
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
