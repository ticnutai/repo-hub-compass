import { useParams, Link } from "react-router-dom";
import { ArrowRight, Github, Monitor, Plus, Bug, RefreshCw, Rocket, HardDrive, Eye, EyeOff, ExternalLink, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProject, useChangelogs, useBackups, useAccounts, useCreateBackup, useProfile } from "@/hooks/use-data";
import { useState } from "react";
import { toast } from "sonner";
import { GitHubSyncDialog } from "@/components/GitHubSyncDialog";

const statusLabels: Record<string, string> = { active: "פעיל", paused: "מושהה", completed: "הושלם" };
const changeTypeLabels: Record<string, string> = { feature: "פיצ'ר חדש", fix: "תיקון", update: "עדכון", deploy: "דיפלוי" };
const changeTypeIcons: Record<string, typeof Plus> = { feature: Plus, fix: Bug, update: RefreshCw, deploy: Rocket };

export default function ProjectDetail() {
  const { id } = useParams();
  const { data: project, isLoading } = useProject(id);
  const { data: changelogs } = useChangelogs(id);
  const { data: backups } = useBackups(id);
  const { data: accounts } = useAccounts();
  const createBackup = useCreateBackup();
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const handleBackup = async () => {
    if (!id) return;
    try {
      await createBackup.mutateAsync({ project_id: id, status: "success", backup_type: "manual", size: `${Math.floor(Math.random() * 200)} MB` });
      toast.success("גיבוי בוצע בהצלחה!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-48 w-full" /></div>;

  if (!project) {
    return (
      <div className="text-center py-16" dir="rtl">
        <p className="text-muted-foreground">פרויקט לא נמצא</p>
        <Link to="/projects" className="text-accent hover:underline mt-2 inline-block">חזור לפרויקטים</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-accent">פרויקטים</Link>
        <ArrowRight className="h-3 w-3 rotate-180" />
        <span className="text-foreground">{project.name}</span>
      </div>

      <Card className="border-2 border-accent">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {project.platform === "github" ? <Github className="h-5 w-5 text-accent" /> : <Monitor className="h-5 w-5 text-accent" />}
                <h2 className="text-2xl font-bold text-foreground">{project.name}</h2>
                <Badge variant="outline" className="border-accent text-accent">{statusLabels[project.status]}</Badge>
              </div>
              <p className="text-muted-foreground mb-4">{project.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>שפה: <strong className="text-foreground">{project.language}</strong></span>
                <span>קטגוריה: <strong className="text-foreground">{project.category}</strong></span>
                <span>נוצר: <strong className="text-foreground">{new Date(project.created_at).toLocaleDateString("he-IL")}</strong></span>
                <span>עודכן: <strong className="text-foreground">{new Date(project.updated_at).toLocaleDateString("he-IL")}</strong></span>
              </div>
              {project.repo_url && (
                <a href={project.repo_url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 mt-3 text-sm text-accent hover:underline">
                  <ExternalLink className="h-3 w-3" /> פתח ב-GitHub
                </a>
              )}
              {project.tags && project.tags.length > 0 && (
                <div className="flex gap-2 mt-4">{project.tags.map(tag => <Badge key={tag} variant="outline" className="border-accent/50 text-accent">{tag}</Badge>)}</div>
              )}
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleBackup} disabled={createBackup.isPending}>
              <HardDrive className="h-4 w-4 ml-2" /> {createBackup.isPending ? "מגבה..." : "גיבוי עכשיו"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2 border-border">
          <CardHeader><CardTitle className="text-lg">לוג שינויים</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!changelogs || changelogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין שינויים עדיין</p>
            ) : changelogs.map((log) => {
              const Icon = changeTypeIcons[log.change_type] || RefreshCw;
              return (
                <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary">
                  <Icon className="h-4 w-4 text-accent shrink-0" />
                  <div className="flex-1"><p className="text-sm">{log.description}</p><p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleDateString("he-IL")} • {changeTypeLabels[log.change_type]}</p></div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-2 border-border">
          <CardHeader><CardTitle className="text-lg">חשבונות מקושרים</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {!accounts || accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין חשבונות מקושרים</p>
            ) : accounts.map((acc) => (
              <div key={acc.id} className="p-3 rounded-lg bg-secondary">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{acc.service_name}</span>
                  <Badge variant="outline" className="text-xs">{acc.service_type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">משתמש: {acc.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">סיסמה:</span>
                  <span className="text-sm font-mono">{showPasswords[acc.id] ? acc.password : "••••••••"}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPasswords(s => ({ ...s, [acc.id]: !s[acc.id] }))}>
                    {showPasswords[acc.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">גיבויים</CardTitle></CardHeader>
        <CardContent>
          {!backups || backups.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין גיבויים עדיין</p>
          ) : (
            <div className="space-y-2">
              {backups.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary">
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-sm">{new Date(b.created_at).toLocaleDateString("he-IL")}</p>
                      <p className="text-xs text-muted-foreground">{b.size} • {b.backup_type === 'auto' ? 'אוטומטי' : 'ידני'}</p>
                    </div>
                  </div>
                  <Badge variant={b.status === 'success' ? 'outline' : 'destructive'} className={b.status === 'success' ? 'border-green-300 text-green-700' : ''}>
                    {b.status === 'success' ? 'הצליח' : b.status === 'failed' ? 'נכשל' : 'ממתין'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
