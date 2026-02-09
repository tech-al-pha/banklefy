import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Zap, Brain, Bot } from "lucide-react";
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
    patternFallback?: { success: boolean; time?: number; error?: string };
  };
}

const serviceInfo = {
  groqVision: {
    name: 'Groq Vision',
    icon: Zap,
    role: 'OCR & Data Extraction',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  groqText: {
    name: 'Groq Text',
    icon: Zap,
    role: 'Text Extraction (Backup)',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  mistral: {
    name: 'Mistral AI',
    icon: Brain,
    role: 'Categorization',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  patternFallback: {
    name: 'Rule-Based',
    icon: Bot,
    role: 'Financial Analysis',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
};

export const AIStatusPanel = ({ aiStatus }: AIStatusPanelProps) => {
  if (!aiStatus) return null;

  const activeServices = (['groqVision', 'groqText', 'mistral', 'patternFallback'] as const)
    .filter((key) => aiStatus[key]);
  
  if (activeServices.length === 0) return null;

  return (
    <Card className="p-4 bg-muted/20 border-border/50">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        Processing Pipeline
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {(['groqVision', 'groqText', 'mistral', 'patternFallback'] as const).map((key) => {
          const data = aiStatus[key];
          const info = serviceInfo[key];
          const Icon = info.icon;
          
          if (!data) return null;

          return (
            <Tooltip key={key}>
              <TooltipTrigger
                type="button"
                aria-label={`${info.name} status`}
                className={`w-full p-2 rounded-lg text-left ${data.success ? info.bgColor : 'bg-destructive/10'} border ${data.success ? info.borderColor : 'border-destructive/30'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0502]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${data.success ? info.color : 'text-destructive'}`} aria-hidden="true" />
                    <span className={`text-xs font-medium ${data.success ? info.color : 'text-destructive'}`}>
                      {info.name}
                    </span>
                  </div>
                  {data.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" aria-hidden="true" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-destructive" aria-hidden="true" />
                  )}
                </div>
                {data.time && (
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground">{(data.time / 1000).toFixed(1)}s</span>
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p className="font-medium">{info.name}</p>
                <p className="text-sm text-muted-foreground">{info.role}</p>
                {data.error && (
                  <p className="text-xs text-destructive mt-1">Error: {data.error}</p>
                )}
                {data.time && (
                  <p className="text-xs mt-1">Time: {(data.time / 1000).toFixed(2)}s</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      
      {/* Pipeline Legend */}
      <div className="mt-3 pt-3 border-t border-border/30">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Pipeline:</span> Groq (OCR) → Mistral (Categorize) → Rule-Based (FOIR/EMI)
        </p>
        <p className="text-xs text-emerald-400 mt-1">
          ✓ Deterministic: FOIR, Salary & EMI use mathematical formulas (no AI)
        </p>
      </div>
    </Card>
  );
};
