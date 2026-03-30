import { useMemo } from "react";
import { AlertTriangle, Clock, Shield, TrendingUp, Zap, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useProjects, useBackups } from "@/hooks/use-data";
import { useTimeEntries } from "@/hooks/use-time-tracking";
import { differenceInDays, subDays, startOfWeek, endOfWeek } from "date-fns";

interface HealthAlert {
  id: string;
  type: "warning" | "danger" | "info" | "success";
  title: string;
  description: string;
  action?: { label: string; link: string };
}

export function DashboardHealthAlerts() {
  const { data: projects } = useProjects();
  const { data: backups } = useBackups();
  const { data: timeEntries } = useTimeEntries();

  const alerts = useMemo<HealthAlert[]>(() => {
    const items: HealthAlert[] = [];
    const now = new Date();

    // Stale projects (not updated 14+ days)
    const staleProjects = (projects || []).filter((p: any) => {
      const lastUpdate = p.last_synced_at || p.updated_at;
      return lastUpdate && differenceInDays(now, new Date(lastUpdate)) >= 14 && p.status === "active";
    });
    if (staleProjects.length > 0) {
      items.push({
        id: "stale",
        type: "warning",
        title: `${staleProjects.length} פרויקטים לא עודכנו`,
        description: `הפרויקטים ${staleProjects.slice(0, 3).map((p: any) => `"${p.name}"`).join(", ")} לא עודכנו מעל 14 ימים`,
        action: { label: "צפה בפרויקטים", link: "/projects" },
      });
    }

    // Failed backups
    const recentFailedBackups = (backups || []).filter(
      (b: any) => b.status === "failed" && differenceInDays(now, new Date(b.created_at)) <= 7
    );
    if (recentFailedBackups.length > 0) {
      items.push({
        id: "failed-backups",
        type: "danger",
        title: `${recentFailedBackups.length} גיבויים נכשלו השבוע`,
        description: "יש גיבויים שנכשלו לאחרונה. מומלץ לבדוק ולגבות מחדש.",
        action: { label: "עבור לגיבויים", link: "/backups" },
      });
    }

    // Projects without backup
    const projectsWithBackup = new Set((backups || []).map((b: any) => b.project_id));
    const projectsWithoutBackup = (projects || []).filter((p: any) => !projectsWithBackup.has(p.id));
    if (projectsWithoutBackup.length > 0 && (projects || []).length > 0) {
      items.push({
        id: "no-backup",
        type: "warning",
        title: `${projectsWithoutBackup.length} פרויקטים ללא גיבוי`,
        description: `הפרויקטים ${projectsWithoutBackup.slice(0, 2).map((p: any) => `"${p.name}"`).join(", ")} מעולם לא גובו`,
        action: { label: "גבה עכשיו", link: "/backups" },
      });
    }

    // Projects without auto-backup
    const noAutoBackup = (projects || []).filter((p: any) => !p.auto_backup_enabled);
    if (noAutoBackup.length > 0 && (projects || []).length > 2) {
      items.push({
        id: "no-auto-backup",
        type: "info",
        title: "מומלץ להפעיל גיבוי אוטומטי",
        description: `${noAutoBackup.length} פרויקטים ללא גיבוי אוטומטי. הפעל כדי להגן על הקוד שלך.`,
        action: { label: "הגדרות גיבוי", link: "/backups" },
      });
    }

    // Weekly productivity
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEntries = (timeEntries || []).filter(
      (e: any) => !e.is_running && new Date(e.start_time) >= weekStart
    );
    const weekHours = weekEntries.reduce((s: number, e: any) => s + (e.duration_seconds || 0), 0) / 3600;
    if (weekHours > 0) {
      items.push({
        id: "productivity",
        type: "success",
        title: `${weekHours.toFixed(1)} שעות עבודה השבוע`,
        description: `עבדת על ${new Set(weekEntries.map((e: any) => e.project_id).filter(Boolean)).size} פרויקטים שונים השבוע. כל הכבוד!`,
        action: { label: "צפה בדוחות", link: "/time" },
      });
    }

    // All good!
    if (items.length === 0 && (projects || []).length > 0) {
      items.push({
        id: "all-good",
        type: "success",
        title: "הכל תקין! 🎉",
        description: "כל הפרויקטים מעודכנים, הגיבויים תקינים, ואין בעיות.",
      });
    }

    return items;
  }, [projects, backups, timeEntries]);

  const iconMap = {
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    danger: <Shield className="h-5 w-5 text-destructive" />,
    info: <Zap className="h-5 w-5 text-blue-500" />,
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  };

  const borderMap = {
    warning: "border-amber-300",
    danger: "border-destructive/50",
    info: "border-blue-300",
    success: "border-green-300",
  };

  if (alerts.length === 0) return null;

  return (
    <Card className="border-2 border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          תובנות והמלצות
          <Badge variant="outline" className="border-accent text-accent text-xs mr-auto">
            {alerts.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${borderMap[alert.type]} bg-secondary/30`}
          >
            <div className="mt-0.5 shrink-0">{iconMap[alert.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
            </div>
            {alert.action && (
              <Button asChild variant="outline" size="sm" className="shrink-0 text-xs">
                <Link to={alert.action.link}>{alert.action.label}</Link>
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
