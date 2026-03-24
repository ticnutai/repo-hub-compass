import { useState } from "react";
import { Plus, Trash2, Webhook, ExternalLink, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useProjectWebhooks, useCreateWebhook, useDeleteWebhook } from "@/hooks/use-data";
import { toast } from "sonner";

const EVENT_TYPES = [
  { value: "push", label: "Push (דחיפה)" },
  { value: "deploy", label: "Deploy (דיפלוי)" },
  { value: "backup", label: "Backup (גיבוי)" },
  { value: "status_change", label: "שינוי סטטוס" },
  { value: "error", label: "שגיאה" },
];

interface ProjectWebhooksProps {
  projectId: string;
}

export function ProjectWebhooks({ projectId }: ProjectWebhooksProps) {
  const { data: webhooks, isLoading } = useProjectWebhooks(projectId);
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);

  const toggleEvent = (value: string) => {
    setEvents((prev) => prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value]);
  };

  const handleCreate = async () => {
    if (!name.trim() || !url.trim() || events.length === 0) {
      toast.error("נא למלא שם, URL ולבחור לפחות אירוע אחד");
      return;
    }
    try {
      await createWebhook.mutateAsync({ project_id: projectId, name, url, event_types: events });
      toast.success("Webhook נוצר!");
      setCreateOpen(false);
      setName("");
      setUrl("");
      setEvents([]);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteWebhook.mutateAsync(deleteId);
      toast.success("Webhook נמחק!");
      setDeleteId(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Webhook className="h-5 w-5 text-accent" />
            Webhooks
          </CardTitle>
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 ml-1" /> הוסף Webhook
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : !webhooks || webhooks.length === 0 ? (
          <div className="text-center py-6">
            <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">אין Webhooks מוגדרים</p>
            <p className="text-xs text-muted-foreground mt-1">הוסף Webhook לקבלת התראות על שינויים</p>
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map((wh: any) => (
              <div key={wh.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 group">
                <div className="flex items-center gap-3">
                  <Webhook className="h-4 w-4 text-accent shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{wh.name}</span>
                      <Badge variant={wh.is_active ? "outline" : "secondary"} className="text-[10px]">
                        {wh.is_active ? "פעיל" : "מושבת"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono" dir="ltr">{wh.url}</p>
                    <div className="flex gap-1 mt-1">
                      {(wh.event_types || []).map((ev: string) => (
                        <Badge key={ev} variant="outline" className="text-[10px]">{ev}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => setDeleteId(wh.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="border-2 border-accent">
          <DialogHeader><DialogTitle>הוספת Webhook</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>שם</Label><Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="שם ה-Webhook" /></div>
            <div><Label>URL</Label><Input className="mt-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://hooks.example.com/..." dir="ltr" /></div>
            <div>
              <Label>אירועים</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {EVENT_TYPES.map((ev) => (
                  <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={events.includes(ev.value)} onCheckedChange={() => toggleEvent(ev.value)} />
                    {ev.label}
                  </label>
                ))}
              </div>
            </div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={createWebhook.isPending}>
              {createWebhook.isPending ? "יוצר..." : "צור Webhook"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת Webhook</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
