import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Zap, Brain, Sparkles, Bot } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIStatusPanelProps {
  aiStatus?: {
    groq?: { success: boolean; time?: number; error?: string };
    groqVision?: { success: boolean; time?: number; error?: string };
    groqText?: { success: boolean; time?: number; error?: string };
    mistral?: { success: boolean; time?: number; error?: string };
    gemini?: { success: boolean; time?: number; error?: string };
    lovable?: { success: boolean; time?: number; error?: string };
    patternFallback?: { success: boolean; time?: number; error?: string };
  };
}

const serviceInfo = {
  groqVision: {
    name: 'Groq Vision',
    icon: Zap,
    role: 'OCR & Image Extraction',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  groqText: {
    name: 'Groq Text',
    icon: Zap,
    role: 'Text-based Extraction',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  mistral: {
    name: 'Mistral AI',
    icon: Brain,
    role: 'Categorization & Cleaning',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  gemini: {
    name: 'Gemini 2.0',
    icon: Sparkles,
    role: 'Complex Reasoning & Fallback',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  lovable: {
    name: 'Lovable AI',
    icon: Bot,
    role: 'Ultimate Fallback Gateway',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
  },
  patternFallback: {
    name: 'Pattern Match',
    icon: Bot,
    role: 'Rule-based Fallback',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
  },
};

export const AIStatusPanel = ({ aiStatus }: AIStatusPanelProps) => {
  if (!aiStatus) return null;

  const services = Object.entries(aiStatus).filter(([_, data]) => data !== undefined);
  
  if (services.length === 0) return null;

  return (
    <Card className="p-4 bg-muted/20 border-border/50">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        AI Processing Pipeline
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(['groqVision', 'groqText', 'mistral', 'gemini', 'lovable', 'patternFallback'] as const).map((key) => {
          const data = aiStatus[key];
          const info = serviceInfo[key];
          const Icon = info.icon;
          
          // Skip if not used at all
          if (!data) {
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/30 opacity-50">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{info.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Not used</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{info.name}</p>
                  <p className="text-sm text-muted-foreground">{info.role}</p>
                  <p className="text-xs mt-1">Not required for this conversion</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <div className={`p-2 rounded-lg ${data.success ? info.bgColor : 'bg-destructive/10'} border ${data.success ? info.borderColor : 'border-destructive/30'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${data.success ? info.color : 'text-destructive'}`} />
                      <span className={`text-xs font-medium ${data.success ? info.color : 'text-destructive'}`}>
                        {info.name}
                      </span>
                    </div>
                    {data.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    )}
                  </div>
                  {data.time && (
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{(data.time / 1000).toFixed(1)}s</span>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p className="font-medium">{info.name}</p>
                <p className="text-sm text-muted-foreground">{info.role}</p>
                {data.error && (
                  <p className="text-xs text-destructive mt-1">Error: {data.error}</p>
                )}
                {data.time && (
                  <p className="text-xs mt-1">Processing time: {(data.time / 1000).toFixed(2)}s</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Pipeline:</span> Groq Vision (OCR) → Mistral (Clean/Categorize) → Gemini (Fallback) → Lovable (Ultimate)
        </p>
      </div>
    </Card>
  );
};
