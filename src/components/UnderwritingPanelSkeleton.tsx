import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const UnderwritingPanelSkeleton = () => {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Eligibility Summary Card */}
      <Card className="p-4 bg-[#191919]/80 border border-white/10">
        <div className="flex items-start gap-3">
          <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-3 bg-[#151515]/80 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="w-3 h-3 rounded" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-2 w-full rounded-full" />
          </Card>
        ))}
      </div>

      {/* EMI Breakdown */}
      <Card className="p-4 bg-[#191919]/80 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#151515]/80 border border-white/5">
              <Skeleton className="w-4 h-4 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Accordion placeholders */}
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 bg-[#191919]/70 border border-white/10">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-4 w-48" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
