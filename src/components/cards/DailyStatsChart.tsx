import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyStats {
  date: string;
  count: number;
}

interface DailyStatsChartProps {
  data: DailyStats[];
}

export const DailyStatsChart = ({ data }: DailyStatsChartProps) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="bg-card/60 backdrop-blur-lg border-primary/20">
      <CardHeader>
        <CardTitle>Conversions - Last 7 Days</CardTitle>
        <CardDescription>Daily conversion activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 h-32">
          {data.map((day, i) => {
            const height = (day.count / maxCount) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-primary/80 rounded-t transition-all duration-300 hover:bg-primary"
                  style={{ height: `${Math.max(height, 4)}%` }}
                />
                <span className="text-xs text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-xs font-medium">{day.count}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
