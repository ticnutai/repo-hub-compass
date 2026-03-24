import { useState } from "react";
import { Globe, Plus, Trash2, Activity, CheckCircle, XCircle, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useUptimeMonitors, useCreateMonitor, useDeleteMonitor, useCheckMonitor } from "@/hooks/use-data";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

export default function UptimeMonitoring() {
  const { data: monitors, isLoading } = useUptimeMonitors();
  const createMonitor = useCreateMonitor();
  const deleteMonitor = useDeleteMonitor();
  const checkMonitor = useCheckMonitor();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState("300");

  const handleCreate = async () => {
    if (!name.trim() || !url.trim()) return;
    try {
      await createMonitor.mutateAsync({ name, url, check_interval: parseInt(interval) });
      toast.success("מוניטור נוצר!");
      setCreateOpen(false);
      setName("");
      setUrl("");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleCheck = async (monitor: any) => {
    setCheckingId(monitor.id);
    try {
      await checkMonitor.mutateAsync(monitor.id);
      toast.success(`בדיקה של "${monitor.name}" הושלמה!`);
    } catch (e: any) { toast.error(e.message); }
    setCheckingId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMonitor.mutateAsync(deleteId);
      toast.success("מוניטור נמחק!");
      setDeleteId(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "up": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "down": return <XCircle className="h-5 w-5 text-destructive" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "up": return "פעיל";
      case "down": return "נפל";
      default: return "לא נבדק";
    }
  };

  const upCount = (monitors || []).filter((m: any) => m.last_status === "up").length;
  const downCount = (monitors || []).filter((m: any) => m.last_status === "down").length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">ניטור זמינות</h2>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 ml-2" /> הוסף מוניטור
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Globe className="h-5 w-5 text-accent" /></div>
            <div><p className="text-xl font-bold">{(monitors || []).length}</p><p className="text-sm text-muted-foreground">מוניטורים</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xl font-bold">{upCount}</p><p className="text-sm text-muted-foreground">פעילים</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><XCircle className="h-5 w-5 text-destructive" /></div>
            <div><p className="text-xl font-bold">{downCount}</p><p className="text-sm text-muted-foreground">נפלו</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Activity className="h-5 w-5 text-accent" /></div>
            <div>
              <p className="text-xl font-bold">
                {(monitors || []).length > 0 ? `${((monitors || []).reduce((sum: number, m: any) => sum + (parseFloat(m.uptime_percentage) || 0), 0) / (monitors || []).length).toFixed(1)}%` : "—"}
              </p>
              <p className="text-sm text-muted-foreground">ממוצע Uptime</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monitors list */}
      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">מוניטורים</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">טוען...</p>
          ) : !monitors || monitors.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground">אין מוניטורים עדיין</p>
              <p className="text-xs text-muted-foreground mt-1">הוסף URL של אתר או API לניטור</p>
            </div>
          ) : (
            <div className="space-y-2">
              {monitors.map((monitor: any) => (
                <div key={monitor.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 group">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(monitor.last_status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{monitor.name}</span>
                        <Badge variant={monitor.last_status === "up" ? "outline" : monitor.last_status === "down" ? "destructive" : "secondary"} className="text-xs">
                          {getStatusLabel(monitor.last_status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{monitor.url}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {monitor.last_response_time && <span>זמן תגובה: {monitor.last_response_time}ms</span>}
                        {monitor.last_checked_at && <span>בדיקה אחרונה: {formatDistanceToNow(new Date(monitor.last_checked_at), { addSuffix: true, locale: he })}</span>}
                        <span>Uptime: {parseFloat(monitor.uptime_percentage).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCheck(monitor)} disabled={checkingId === monitor.id}>
                      <RefreshCw className={`h-4 w-4 ${checkingId === monitor.id ? "animate-spin" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(monitor.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="border-2 border-accent">
          <DialogHeader><DialogTitle>הוספת מוניטור חדש</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>שם</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="שם המוניטור" /></div>
            <div><Label>URL</Label><Input className="mt-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" dir="ltr" /></div>
            <div>
              <Label>תדירות בדיקה</Label>
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">כל דקה</SelectItem>
                  <SelectItem value="300">כל 5 דקות</SelectItem>
                  <SelectItem value="600">כל 10 דקות</SelectItem>
                  <SelectItem value="1800">כל 30 דקות</SelectItem>
                  <SelectItem value="3600">כל שעה</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={createMonitor.isPending}>
              {createMonitor.isPending ? "יוצר..." : "צור מוניטור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת מוניטור</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק מוניטור זה?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
