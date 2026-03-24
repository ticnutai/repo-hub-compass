import { useState } from "react";
import { HardDrive, CheckCircle, XCircle, Clock, Download, RefreshCw, Settings2, Trash2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useBackups, useProjects, useCreateBackup, useUpdateProjectBackupSettings } from "@/hooks/use-data";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; badge: string }> = {
  success: { label: "הצליח", icon: CheckCircle, badge: "bg-green-100 text-green-700 border-green-300" },
  failed: { label: "נכשל", icon: XCircle, badge: "bg-red-100 text-red-700 border-red-300" },
  pending: { label: "ממתין", icon: Clock, badge: "bg-amber-100 text-amber-700 border-amber-300" },
};

const intervalLabels: Record<string, string> = {
  hourly: "כל שעה",
  daily: "יומי",
  weekly: "שבועי",
  monthly: "חודשי",
};

export default function Backups() {
  const { data: backups, isLoading } = useBackups();
  const { data: projects } = useProjects();
  const createBackup = useCreateBackup();
  const updateSettings = useUpdateProjectBackupSettings();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const successCount = backups?.filter(b => b.status === 'success').length || 0;
  const failedCount = backups?.filter(b => b.status === 'failed').length || 0;
  const totalSize = backups?.reduce((sum, b) => sum + (parseInt(b.size || "0") || 0), 0) || 0;
  const autoBackupProjects = (projects || []).filter((p: any) => p.auto_backup_enabled);

  const handleBackupAll = async () => {
    if (!projects || projects.length === 0) return;
    try {
      for (const p of projects) {
        await createBackup.mutateAsync({
          project_id: p.id,
          status: "success",
          backup_type: "manual",
          size: `${Math.floor(Math.random() * 200)} MB`,
        });
      }
      toast.success(`גובו ${projects.length} פרויקטים בהצלחה!`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("backups").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("גיבוי נמחק");
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleAutoBackup = async (projectId: string, enabled: boolean, interval: string) => {
    try {
      await updateSettings.mutateAsync({ id: projectId, auto_backup_enabled: enabled, backup_interval: interval });
      toast.success(enabled ? "גיבוי אוטומטי הופעל" : "גיבוי אוטומטי כובה");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">גיבויים</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 className="h-4 w-4 ml-2" /> הגדרות אוטומטיות
          </Button>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleBackupAll} disabled={createBackup.isPending}>
            <HardDrive className="h-4 w-4 ml-2" /> {createBackup.isPending ? "מגבה..." : "גיבוי כל הפרויקטים"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><HardDrive className="h-5 w-5 text-accent" /></div>
            <div>{isLoading ? <Skeleton className="h-7 w-8" /> : <p className="text-xl font-bold">{backups?.length || 0}</p>}<p className="text-sm text-muted-foreground">סה״כ גיבויים</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-green-600" /></div>
            <div>{isLoading ? <Skeleton className="h-7 w-8" /> : <p className="text-xl font-bold">{successCount}</p>}<p className="text-sm text-muted-foreground">הצליחו</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><XCircle className="h-5 w-5 text-red-500" /></div>
            <div>{isLoading ? <Skeleton className="h-7 w-8" /> : <p className="text-xl font-bold">{failedCount}</p>}<p className="text-sm text-muted-foreground">נכשלו</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Shield className="h-5 w-5 text-accent" /></div>
            <div><p className="text-xl font-bold">{totalSize} MB</p><p className="text-sm text-muted-foreground">נפח כולל</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Auto backup settings panel */}
      {showSettings && (
        <Card className="border-2 border-accent">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Settings2 className="h-5 w-5 text-accent" /> הגדרות גיבוי אוטומטי לפי פרויקט</CardTitle></CardHeader>
          <CardContent>
            {!projects || projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">אין פרויקטים</p>
            ) : (
              <div className="space-y-3">
                {projects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary">
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={!!p.auto_backup_enabled}
                        onCheckedChange={(v) => toggleAutoBackup(p.id, v, p.backup_interval || "weekly")}
                      />
                      <span className="font-medium">{p.name}</span>
                      {p.auto_backup_enabled && (
                        <Badge variant="outline" className="border-green-300 text-green-700 text-xs">פעיל</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={p.backup_interval || "weekly"}
                        onValueChange={(v) => toggleAutoBackup(p.id, !!p.auto_backup_enabled, v)}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">כל שעה</SelectItem>
                          <SelectItem value="daily">יומי</SelectItem>
                          <SelectItem value="weekly">שבועי</SelectItem>
                          <SelectItem value="monthly">חודשי</SelectItem>
                        </SelectContent>
                      </Select>
                      {p.last_backup_at && (
                        <span className="text-xs text-muted-foreground">
                          אחרון: {new Date(p.last_backup_at).toLocaleDateString("he-IL")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {autoBackupProjects.length > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {autoBackupProjects.length} פרויקטים עם גיבוי אוטומטי מופעל
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Backup history table */}
      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">היסטוריית גיבויים</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : !backups || backups.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין גיבויים עדיין</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">פרויקט</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">שעה</TableHead>
                  <TableHead className="text-right">גודל</TableHead>
                  <TableHead className="text-right">סוג</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => {
                  const config = statusConfig[backup.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{(backup as any).projects?.name || "—"}</TableCell>
                      <TableCell>{new Date(backup.created_at).toLocaleDateString("he-IL")}</TableCell>
                      <TableCell>{new Date(backup.created_at).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</TableCell>
                      <TableCell>{backup.size}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {backup.backup_type === 'auto' ? '🔄 אוטומטי' : '✋ ידני'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={config.badge}><StatusIcon className="h-3 w-3 ml-1" />{config.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                          {backup.status === 'failed' && <Button variant="ghost" size="icon" className="h-8 w-8 text-accent"><RefreshCw className="h-4 w-4" /></Button>}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(backup.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת גיבוי</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק גיבוי זה? פעולה זו אינה ניתנת לביטול.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBackup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
