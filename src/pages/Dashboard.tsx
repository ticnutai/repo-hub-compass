import { FolderGit2, Activity, AlertTriangle, HardDrive, Plus, Bug, Rocket, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProjects, useChangelogs, useBackups } from "@/hooks/use-data";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHealthAlerts } from "@/components/DashboardHealthAlerts";
import { DashboardActivityChart } from "@/components/DashboardActivityChart";
import { WeeklyReport } from "@/components/WeeklyReport";

const statusLabels: Record<string, string> = { active: "פעיל", paused: "מושהה", completed: "הושלם" };
const changeTypeLabels: Record<string, string> = { feature: "פיצ'ר חדש", fix: "תיקון", update: "עדכון", deploy: "דיפלוי" };
const changeTypeIcons: Record<string, typeof Plus> = { feature: Plus, fix: Bug, update: RefreshCw, deploy: Rocket };

export default function Dashboard() {
  const { data: projects, isLoading: loadingProjects } = useProjects();
  const { data: changelogs, isLoading: loadingChangelogs } = useChangelogs();
  const { data: backups } = useBackups();

  const totalProjects = projects?.length || 0;
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
  const failedBackups = backups?.filter(b => b.status === 'failed').length || 0;
  const successBackups = backups?.filter(b => b.status === 'success').length || 0;

  const stats = [
    { label: "סה״כ פרויקטים", value: totalProjects, icon: FolderGit2, color: "text-accent" },
    { label: "פעילים", value: activeProjects, icon: Activity, color: "text-green-600" },
    { label: "דורשים תשומת לב", value: failedBackups, icon: AlertTriangle, color: "text-orange-500" },
    { label: "גיבויים הצליחו", value: successBackups, icon: HardDrive, color: "text-accent" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">דשבורד</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-2 border-border hover:border-accent transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                {loadingProjects ? <Skeleton className="h-8 w-12" /> : <p className="text-2xl font-bold text-foreground">{stat.value}</p>}
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Smart Alerts */}
      <DashboardHealthAlerts />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              פרויקטים אחרונים
              <Link to="/projects" className="text-sm font-normal text-accent hover:underline">הצג הכל</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingProjects ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : projects?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין פרויקטים עדיין. <Link to="/projects" className="text-accent hover:underline">הוסף פרויקט ראשון</Link></p>
            ) : (
              projects?.slice(0, 4).map((project) => (
                <Link key={project.id} to={`/projects/${project.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.status === 'active' ? '#22c55e' : project.status === 'paused' ? '#f59e0b' : '#94a3b8' }} />
                    <div>
                      <p className="font-medium text-foreground">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.language} • {project.platform === 'github' ? 'GitHub' : 'מקומי'}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-accent text-accent text-xs">{statusLabels[project.status]}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Real activity chart */}
        <DashboardActivityChart />
      </div>

      {/* Weekly Report */}
      <WeeklyReport />

      <Card className="border-2 border-border">
        <CardHeader className="pb-3"><CardTitle className="text-lg">שינויים אחרונים</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loadingChangelogs ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
            ) : changelogs?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין שינויים עדיין</p>
            ) : (
              changelogs?.slice(0, 5).map((log) => {
                const Icon = changeTypeIcons[log.change_type] || RefreshCw;
                return (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{log.description}</p>
                      <p className="text-xs text-muted-foreground">{(log as any).projects?.name} • {new Date(log.created_at).toLocaleDateString("he-IL")}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">{changeTypeLabels[log.change_type]}</Badge>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
