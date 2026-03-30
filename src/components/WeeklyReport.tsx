import { useMemo, useState } from "react";
import { FileText, Download, Calendar, Clock, FolderGit2, CheckSquare, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProjects, useChangelogs, useBackups } from "@/hooks/use-data";
import { useTimeEntries } from "@/hooks/use-time-tracking";
import { useTasks } from "@/hooks/use-tasks";
import { startOfWeek, endOfWeek, subWeeks, format, differenceInDays } from "date-fns";
import { he } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";

const COLORS = ["hsl(43 76% 52%)", "hsl(200 70% 50%)", "hsl(140 60% 45%)", "hsl(280 60% 55%)", "hsl(20 80% 55%)"];

export function WeeklyReport() {
  const { data: projects } = useProjects();
  const { data: changelogs } = useChangelogs();
  const { data: backups } = useBackups();
  const { data: timeEntries } = useTimeEntries();
  const { data: tasks } = useTasks();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  const report = useMemo(() => {
    const inRange = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= weekStart && d <= weekEnd;
    };

    // Changes this week
    const weekChanges = (changelogs || []).filter((c: any) => inRange(c.created_at));
    const changesByType: Record<string, number> = {};
    weekChanges.forEach((c: any) => {
      changesByType[c.change_type] = (changesByType[c.change_type] || 0) + 1;
    });

    // Time entries this week
    const weekTimeEntries = (timeEntries || []).filter(
      (e: any) => !e.is_running && inRange(e.start_time)
    );
    const totalHours = weekTimeEntries.reduce((s: number, e: any) => s + (e.duration_seconds || 0), 0) / 3600;

    // Time by project
    const timeByProject: Record<string, { name: string; hours: number }> = {};
    weekTimeEntries.forEach((e: any) => {
      const name = (e as any).projects?.name || "ללא פרויקט";
      if (!timeByProject[name]) timeByProject[name] = { name, hours: 0 };
      timeByProject[name].hours += (e.duration_seconds || 0) / 3600;
    });

    // Daily hours
    const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    const dailyHours = days.map((day, i) => {
      const dayHours = weekTimeEntries
        .filter((e: any) => new Date(e.start_time).getDay() === i)
        .reduce((s: number, e: any) => s + (e.duration_seconds || 0), 0) / 3600;
      return { day, hours: Math.round(dayHours * 10) / 10 };
    });

    // Tasks completed this week
    const completedTasks = (tasks || []).filter(
      (t: any) => t.status === "done" && inRange(t.updated_at)
    );

    // Backups this week
    const weekBackups = (backups || []).filter((b: any) => inRange(b.created_at));
    const successBackups = weekBackups.filter((b: any) => b.status === "success");

    // Active projects this week
    const activeProjectIds = new Set([
      ...weekChanges.map((c: any) => c.project_id),
      ...weekTimeEntries.map((e: any) => e.project_id).filter(Boolean),
    ]);

    return {
      weekChanges,
      changesByType,
      totalHours,
      timeByProject: Object.values(timeByProject).sort((a, b) => b.hours - a.hours),
      dailyHours,
      completedTasks,
      weekBackups,
      successBackups,
      activeProjectCount: activeProjectIds.size,
    };
  }, [changelogs, timeEntries, tasks, backups, weekStart, weekEnd]);

  const changeTypeLabels: Record<string, string> = { feature: "פיצ'רים", fix: "תיקונים", update: "עדכונים", deploy: "דיפלויים" };

  const handleExportReport = () => {
    const lines = [
      `דוח שבועי - ${format(weekStart, "dd/MM/yyyy", { locale: he })} עד ${format(weekEnd, "dd/MM/yyyy", { locale: he })}`,
      "",
      `סה"כ שעות עבודה: ${report.totalHours.toFixed(1)}`,
      `פרויקטים פעילים: ${report.activeProjectCount}`,
      `שינויים: ${report.weekChanges.length}`,
      `משימות שהושלמו: ${report.completedTasks.length}`,
      `גיבויים: ${report.successBackups.length}/${report.weekBackups.length}`,
      "",
      "חלוקת זמן לפי פרויקט:",
      ...report.timeByProject.map((p) => `  ${p.name}: ${p.hours.toFixed(1)} שעות`),
      "",
      "שינויים לפי סוג:",
      ...Object.entries(report.changesByType).map(([type, count]) => `  ${changeTypeLabels[type] || type}: ${count}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-report-${format(weekStart, "yyyy-MM-dd")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("הדוח הורד בהצלחה!");
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            דוח שבועי
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
              ← שבוע קודם
            </Button>
            <Badge variant="outline" className="text-xs">
              {format(weekStart, "dd/MM", { locale: he })} - {format(weekEnd, "dd/MM", { locale: he })}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))} disabled={weekOffset === 0}>
              שבוע הבא →
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportReport}>
              <Download className="h-4 w-4 ml-1" /> הורד דוח
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-secondary text-center">
            <Clock className="h-4 w-4 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold">{report.totalHours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">שעות</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <FolderGit2 className="h-4 w-4 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold">{report.activeProjectCount}</p>
            <p className="text-xs text-muted-foreground">פרויקטים</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold">{report.weekChanges.length}</p>
            <p className="text-xs text-muted-foreground">שינויים</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <CheckSquare className="h-4 w-4 mx-auto text-green-500 mb-1" />
            <p className="text-lg font-bold">{report.completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">משימות</p>
          </div>
          <div className="p-3 rounded-lg bg-secondary text-center">
            <Calendar className="h-4 w-4 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold">{report.successBackups.length}</p>
            <p className="text-xs text-muted-foreground">גיבויים</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily hours chart */}
          <div>
            <p className="text-sm font-medium mb-2 text-foreground">שעות עבודה יומיות</p>
            {report.dailyHours.some((d) => d.hours > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={report.dailyHours}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => [`${v} שעות`, "זמן"]} />
                  <Bar dataKey="hours" fill="hsl(43 76% 52%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                אין נתוני זמן לשבוע זה
              </div>
            )}
          </div>

          {/* Time by project pie */}
          <div>
            <p className="text-sm font-medium mb-2 text-foreground">חלוקה לפי פרויקטים</p>
            {report.timeByProject.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={report.timeByProject} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, hours }) => `${name}: ${hours.toFixed(1)}h`}>
                    {report.timeByProject.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v.toFixed(1)} שעות`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                אין נתוני זמן לשבוע זה
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
