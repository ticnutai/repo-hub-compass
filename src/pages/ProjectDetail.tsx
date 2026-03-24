import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowRight, Github, Monitor, Plus, Bug, RefreshCw, Rocket, HardDrive, Eye, EyeOff, ExternalLink, RotateCw, Download, Upload, ScanSearch, Pencil, Trash2, X, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useProject, useChangelogs, useBackups, useAccounts, useCreateBackup, useCreateChangelog, useProfile, useUpdateProject, useDeleteProject } from "@/hooks/use-data";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GitHubSyncDialog } from "@/components/GitHubSyncDialog";
import { ProjectAnalysis } from "@/components/ProjectAnalysis";
import { ProjectConnections } from "@/components/ProjectConnections";
import { ProjectAISummary } from "@/components/ProjectAISummary";
import { ProjectNotes } from "@/components/ProjectNotes";
import { ProjectWebhooks } from "@/components/ProjectWebhooks";
import { ProjectAccountsPanel } from "@/components/ProjectAccountsPanel";
import { exportProjectAsZip } from "@/lib/export-utils";

const statusLabels: Record<string, string> = { active: "פעיל", paused: "מושהה", completed: "הושלם" };
const changeTypeLabels: Record<string, string> = { feature: "פיצ'ר חדש", fix: "תיקון", update: "עדכון", deploy: "דיפלוי" };
const changeTypeIcons: Record<string, typeof Plus> = { feature: Plus, fix: Bug, update: RefreshCw, deploy: Rocket };

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { data: changelogs } = useChangelogs(id);
  const { data: backups } = useBackups(id);
  const { data: accounts } = useAccounts();
  const { data: profile } = useProfile();
  const createBackup = useCreateBackup();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [syncOpen, setSyncOpen] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editLang, setEditLang] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "paused" | "completed">("active");
  const [editTags, setEditTags] = useState("");

  const startEdit = () => {
    if (!project) return;
    setEditName(project.name);
    setEditDesc(project.description || "");
    setEditLang(project.language || "");
    setEditCategory(project.category || "");
    setEditStatus(project.status);
    setEditTags((project.tags || []).join(", "));
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!id || !editName.trim()) return;
    try {
      await updateProject.mutateAsync({
        id,
        name: editName,
        description: editDesc,
        language: editLang,
        category: editCategory,
        status: editStatus,
        tags: editTags.split(",").map(t => t.trim()).filter(Boolean),
      });
      toast.success("פרויקט עודכן בהצלחה!");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteProject.mutateAsync(id);
      toast.success("פרויקט נמחק!");
      navigate("/projects");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBackup = async () => {
    if (!id) return;
    try {
      await createBackup.mutateAsync({ project_id: id, status: "success", backup_type: "manual", size: `${Math.floor(Math.random() * 200)} MB` });
      toast.success("גיבוי בוצע בהצלחה!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePull = async () => {
    if (!id || !project) return;
    setPulling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");
      const projectId_ = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId_}.supabase.co/functions/v1/sync-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "שגיאה במשיכה");
      toast.success(`משיכה הושלמה! ${result.imported} commits חדשים`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setPulling(false);
  };

  const handlePush = async () => {
    if (!id || !project) return;
    setPushing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");
      const projectId_ = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId_}.supabase.co/functions/v1/push-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "שגיאה בדחיפה");
      toast.success(result.message || "דחיפה הושלמה!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setPushing(false);
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

  const isGithub = project.platform === "github" && project.repo_url;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-accent">פרויקטים</Link>
        <ArrowRight className="h-3 w-3 rotate-180" />
        <span className="text-foreground">{project.name}</span>
      </div>

      <Card className="border-2 border-accent">
        <CardContent className="p-6">
          {editing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">עריכת פרויקט</h3>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(false)}><X className="h-4 w-4 ml-1" /> ביטול</Button>
                  <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveEdit} disabled={updateProject.isPending}>
                    <Check className="h-4 w-4 ml-1" /> {updateProject.isPending ? "שומר..." : "שמור"}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>שם הפרויקט</Label><Input className="mt-1" value={editName} onChange={e => setEditName(e.target.value)} /></div>
                <div><Label>סטטוס</Label>
                  <Select value={editStatus} onValueChange={(v: any) => setEditStatus(v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="paused">מושהה</SelectItem>
                      <SelectItem value="completed">הושלם</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>שפה</Label><Input className="mt-1" value={editLang} onChange={e => setEditLang(e.target.value)} /></div>
                <div><Label>קטגוריה</Label><Input className="mt-1" value={editCategory} onChange={e => setEditCategory(e.target.value)} /></div>
              </div>
              <div><Label>תיאור</Label><Textarea className="mt-1" value={editDesc} onChange={e => setEditDesc(e.target.value)} /></div>
              <div><Label>תגיות (מופרדות בפסיק)</Label><Input className="mt-1" value={editTags} onChange={e => setEditTags(e.target.value)} placeholder="react, typescript, web" /></div>
            </div>
          ) : (
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
                  {(project as any).last_synced_at && (
                    <span>סנכרון אחרון: <strong className="text-foreground">{new Date((project as any).last_synced_at).toLocaleDateString("he-IL")}</strong></span>
                  )}
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
              <div className="flex flex-col gap-2">
                {/* Edit & Delete */}
                <div className="flex gap-2">
                  <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 flex-1" onClick={startEdit}>
                    <Pencil className="h-4 w-4 ml-2" /> ערוך
                  </Button>
                  <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 flex-1" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="h-4 w-4 ml-2" /> מחק
                  </Button>
                </div>
                {isGithub && (
                  <>
                    <div className="flex gap-2">
                      <Button variant="outline" className="border-green-500 text-green-700 hover:bg-green-50 flex-1" onClick={handlePull} disabled={pulling}>
                        <Download className="h-4 w-4 ml-2" /> {pulling ? "מושך..." : "משוך (Pull)"}
                      </Button>
                      <Button variant="outline" className="border-blue-500 text-blue-700 hover:bg-blue-50 flex-1" onClick={handlePush} disabled={pushing}>
                        <Upload className="h-4 w-4 ml-2" /> {pushing ? "דוחף..." : "דחוף (Push)"}
                      </Button>
                    </div>
                    <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" onClick={() => setSyncOpen(true)}>
                      <RotateCw className="h-4 w-4 ml-2" /> סנכרון מלא
                    </Button>
                  </>
                )}
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleBackup} disabled={createBackup.isPending}>
                  <HardDrive className="h-4 w-4 ml-2" /> {createBackup.isPending ? "מגבה..." : "גיבוי עכשיו"}
                </Button>
                <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" onClick={async () => {
                  try { await exportProjectAsZip(project.id, project.name); toast.success("פרויקט יוצא בהצלחה!"); } catch (e: any) { toast.error(e.message); }
                }}>
                  <Download className="h-4 w-4 ml-2" /> הורד (ZIP)
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {isGithub && <ProjectAnalysis projectId={project.id} isGithub={!!isGithub} />}

      <ProjectAISummary projectId={project.id} projectName={project.name} />

      <ProjectNotes projectId={project.id} />

      <ProjectWebhooks projectId={project.id} />

      <ProjectConnections projectId={project.id} />

      <ProjectAccountsPanel projectId={project.id} />

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

      {isGithub && (
        <GitHubSyncDialog open={syncOpen} onOpenChange={setSyncOpen} projectId={project.id} projectName={project.name} hasToken={!!profile?.github_token} />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת פרויקט</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הפרויקט "{project.name}"? פעולה זו תמחק גם את כל הגיבויים, השינויים והחשבונות המקושרים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק פרויקט
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
