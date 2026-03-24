import { useMemo } from "react";
import { useProjects, useBackups } from "@/hooks/use-data";
import { differenceInDays } from "date-fns";

export type NotificationType = "stale_project" | "failed_backup";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  projectId: string;
  projectName: string;
}

const STALE_THRESHOLD_DAYS = 14;

export function useNotifications() {
  const { data: projects } = useProjects();
  const { data: backups } = useBackups();

  const notifications = useMemo<AppNotification[]>(() => {
    const items: AppNotification[] = [];

    // Check for stale projects (not updated in X days)
    (projects || []).forEach((p: any) => {
      const lastUpdate = p.last_synced_at || p.updated_at;
      if (!lastUpdate) return;
      const daysSince = differenceInDays(new Date(), new Date(lastUpdate));
      if (daysSince >= STALE_THRESHOLD_DAYS) {
        items.push({
          id: `stale-${p.id}`,
          type: "stale_project",
          title: "פרויקט לא עודכן",
          description: `"${p.name}" לא עודכן ${daysSince} ימים`,
          timestamp: lastUpdate,
          projectId: p.id,
          projectName: p.name,
        });
      }
    });

    // Check for failed backups
    (backups || []).forEach((b: any) => {
      if (b.status === "failed") {
        const project = (projects || []).find((p: any) => p.id === b.project_id);
        items.push({
          id: `backup-${b.id}`,
          type: "failed_backup",
          title: "גיבוי נכשל",
          description: `גיבוי של "${project?.name || "פרויקט"}" נכשל`,
          timestamp: b.created_at,
          projectId: b.project_id,
          projectName: project?.name || "פרויקט",
        });
      }
    });

    // Sort by timestamp desc
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return items;
  }, [projects, backups]);

  return {
    notifications,
    staleCount: notifications.filter((n) => n.type === "stale_project").length,
    failedBackupsCount: notifications.filter((n) => n.type === "failed_backup").length,
    totalCount: notifications.length,
  };
}
