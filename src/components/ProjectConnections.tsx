import { useState } from "react";
import { Plug, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectServiceConnections, useServiceConnections, useLinkServiceConnection, useUnlinkServiceConnection } from "@/hooks/use-data";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  cloud: "ענן", messaging: "הודעות", storage: "אחסון", ai: "AI",
  payment: "תשלומים", analytics: "אנליטיקס", email: "אימייל",
  database: "מסד נתונים", auth: "אימות", cdn: "CDN", other: "אחר",
};

export function ProjectConnections({ projectId }: { projectId: string }) {
  const { data: linked } = useProjectServiceConnections(projectId);
  const { data: allConnections } = useServiceConnections();
  const linkMutation = useLinkServiceConnection();
  const unlinkMutation = useUnlinkServiceConnection();
  const [selectedId, setSelectedId] = useState("");
  const [showCreds, setShowCreds] = useState<Record<string, boolean>>({});

  const linkedIds = new Set((linked || []).map((l: any) => l.service_connection_id));
  const available = (allConnections || []).filter((c: any) => !linkedIds.has(c.id));

  const handleLink = async () => {
    if (!selectedId) return;
    try {
      await linkMutation.mutateAsync({ service_connection_id: selectedId, project_id: projectId });
      toast.success("חיבור קושר לפרויקט!");
      setSelectedId("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUnlink = async (id: string) => {
    try {
      await unlinkMutation.mutateAsync(id);
      toast.success("חיבור הוסר מהפרויקט");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plug className="h-5 w-5 text-accent" />
          חיבורים מקושרים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add connection */}
        <div className="flex gap-2">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="בחר חיבור לקישור..." />
            </SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <SelectItem value="_none" disabled>אין חיבורים זמינים</SelectItem>
              ) : available.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.service_name} ({categoryLabels[c.service_category] || c.service_category})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleLink} disabled={!selectedId || linkMutation.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 ml-1" /> קשר
          </Button>
        </div>

        {/* Linked connections list */}
        {!linked || linked.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין חיבורים מקושרים לפרויקט זה</p>
        ) : (
          <div className="space-y-3">
            {linked.map((link: any) => {
              const conn = link.service_connections;
              if (!conn) return null;
              const creds = conn.credentials || {};
              const credKeys = Object.keys(creds);
              const isVisible = showCreds[link.id];

              return (
                <div key={link.id} className="p-3 rounded-lg bg-secondary space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Plug className="h-4 w-4 text-accent" />
                      <span className="font-medium">{conn.service_name}</span>
                      <Badge variant="outline" className="text-xs border-accent/50 text-accent">
                        {categoryLabels[conn.service_category] || conn.service_category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{conn.provider}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {credKeys.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCreds(s => ({ ...s, [link.id]: !s[link.id] }))}>
                          {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleUnlink(link.id)} disabled={unlinkMutation.isPending}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {isVisible && credKeys.length > 0 && (
                    <div className="text-xs space-y-1 bg-background/50 p-2 rounded">
                      {credKeys.map(key => (
                        <div key={key} className="flex gap-2">
                          <span className="text-muted-foreground min-w-[100px]">{key}:</span>
                          <span className="font-mono break-all">{String(creds[key]).slice(0, 40)}{String(creds[key]).length > 40 ? "..." : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
