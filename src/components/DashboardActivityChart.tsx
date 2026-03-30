import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChangelogs } from "@/hooks/use-data";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, format, startOfDay } from "date-fns";

export function DashboardActivityChart() {
  const { data: changelogs, isLoading } = useChangelogs();

  const activityData = useMemo(() => {
    const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    const now = new Date();
    const weekAgo = subDays(now, 7);

    const dayCounts: Record<number, number> = {};
    (changelogs || []).forEach((c: any) => {
      const d = new Date(c.created_at);
      if (d >= weekAgo) {
        const day = d.getDay();
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });

    return days.map((name, i) => ({ day: name, commits: dayCounts[i] || 0 }));
  }, [changelogs]);

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">פעילות שבועית</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
              <YAxis hide />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "2px solid hsl(43 76% 52%)" }} />
              <Bar dataKey="commits" fill="hsl(43 76% 52%)" radius={[6, 6, 0, 0]} name="שינויים" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
