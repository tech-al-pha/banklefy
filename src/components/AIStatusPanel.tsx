import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, Clock, Zap, Brain, Bot } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AiStatus } from "./uploadDemo/types";

interface AIStatusPanelProps {
  aiStatus?: AiStatus;
}

const serviceInfo = {
  groqVision: {
    name: "Groq Vision",
    icon: Zap,
    role: "OCR and data extraction",
    color: "text-primary",
    bgColor: "bg-surface-elevated/20",
    borderColor: "border-border/40",
  },
  groqText: {
    name: "Groq Text",
    icon: Zap,
    role: "Text extraction fallback",
    color: "text-primary",
    bgColor: "bg-surface-elevated/20",
    borderColor: "border-border/40",
  },
  mistral: {
    name: "Mistral AI",
    icon: Brain,
    role: "Categorization",
    color: "text-primary",
    bgColor: "bg-surface-elevated/20",
    borderColor: "border-border/40",
  },
  patternFallback: {
    name: "Rule-Based",
    icon: Bot,
    role: "Financial analysis",
    color: "text-primary",
    bgColor: "bg-surface-elevated/20",
    borderColor: "border-border/40",
  },
};

export const AIStatusPanel = ({ aiStatus }: AIStatusPanelProps) => {
  if (!aiStatus) return null;

  const activeServices = (["groqVision", "groqText", "mistral", "patternFallback"] as const)
    .filter((key) => aiStatus[key]);

  if (activeServices.length === 0) return null;

  return (
    <Card className="p-4 bg-muted/20 border-border/50">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Zap className="h-4 w-4 text-primary" />
        Used in this conversion
      </h4>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {(["groqVision", "groqText", "mistral", "patternFallback"] as const).map((key) => {
          const data = aiStatus[key];
          const info = serviceInfo[key];
          const Icon = info.icon;

          if (!data) return null;

          return (
            <Tooltip key={key}>
              <TooltipTrigger
                type="button"
                aria-label={`${info.name} status`}
                className={`w-full rounded-lg border p-2 text-left ${
                  data.success ? info.bgColor : "bg-destructive/10"
                } ${
                  data.success ? info.borderColor : "border-destructive/30"
                } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#000000]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${data.success ? info.color : "text-destructive"}`} aria-hidden="true" />
                    <span className={`text-xs font-medium ${data.success ? info.color : "text-destructive"}`}>
                      {info.name}
                    </span>
                  </div>
                  {data.success ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                  )}
                </div>
                {data.time && (
                  <div className="mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground">{(data.time / 1000).toFixed(1)}s</span>
                  </div>
                )}
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p className="font-medium">{info.name}</p>
                <p className="text-sm text-muted-foreground">{info.role}</p>
                {data.error && (
                  <p className="mt-1 text-xs text-destructive">Error: {data.error}</p>
                )}
                {data.time && (
                  <p className="mt-1 text-xs">Time: {(data.time / 1000).toFixed(2)}s</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border/30 pt-3">
        <p className="text-xs text-muted-foreground">
          These cards show the stages used in the current conversion report.
        </p>
      </div>
    </Card>
  );
};
