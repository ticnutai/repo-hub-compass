import { useState } from "react";
import { Plug, Plus, Trash2, Eye, EyeOff, Copy, Check, Key, Globe, Database, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectServiceConnections, useServiceConnections, useLinkServiceConnection, useUnlinkServiceConnection, useProjectEnvVars } from "@/hooks/use-data";
import { toast } from "sonner";

const categoryLabels: Record<string, string> = {
  cloud: "ענן", messaging: "הודעות", storage: "אחסון", ai: "AI",
  payment: "תשלומים", analytics: "אנליטיקס", email: "אימייל",
  database: "מסד נתונים", auth: "אימות", cdn: "CDN", other: "אחר",
};

const credLabelMap: Record<string, string> = {
  api_key: "API Key", url: "URL", token: "Token", secret: "Secret",
  password: "סיסמה", username: "משתמש", host: "Host", port: "Port",
  database: "Database", project_id: "Project ID", client_id: "Client ID",
  client_secret: "Client Secret", access_token: "Access Token",
  refresh_token: "Refresh Token", webhook_url: "Webhook URL",
  endpoint: "Endpoint", region: "Region", bucket: "Bucket",
  account_sid: "Account SID", auth_token: "Auth Token",
  sender_id: "Sender ID", domain: "Domain",
};

function CopyableField({ label, value, isSecret }: { label: string; value: string; isSecret?: boolean }) {
  const [visible, setVisible] = useState(!isSecret);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${label} הועתק!`);
    setTimeout(() => setCopied(false), 1500);
  };

  const displayLabel = credLabelMap[label] || label.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/50 group">
      <Key className="h-3.5 w-3.5 text-accent shrink-0" />
      <span className="text-xs text-muted-foreground min-w-[100px] shrink-0">{displayLabel}:</span>
      <span className="text-xs font-mono flex-1 break-all select-all">
        {visible ? value : "•".repeat(Math.min(value.length, 30))}
      </span>
      <div className="flex gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
        {isSecret && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

export function ProjectConnections({ projectId }: { projectId: string }) {
  const { data: linked } = useProjectServiceConnections(projectId);
  const { data: allConnections } = useServiceConnections();
  const { data: envVars } = useProjectEnvVars(projectId);
  const linkMutation = useLinkServiceConnection();
  const unlinkMutation = useUnlinkServiceConnection();
  const [selectedId, setSelectedId] = useState("");

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

  const secretKeys = ["api_key", "token", "secret", "password", "client_secret", "access_token", "refresh_token", "auth_token"];
  const isSecretKey = (key: string) => secretKeys.some(s => key.toLowerCase().includes(s));

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Plug className="h-5 w-5 text-accent" />
          חיבורים וקודים ({(linked?.length || 0)} חיבורים{envVars?.length ? `, ${envVars.length} משתנים` : ""})
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

        {/* Linked connections with full credentials */}
        {linked && linked.length > 0 && (
          <div className="space-y-4">
            {linked.map((link: any) => {
              const conn = link.service_connections;
              if (!conn) return null;
              const creds = conn.credentials || {};
              const config = conn.config || {};
              const credKeys = Object.keys(creds).filter(k => creds[k]);
              const configKeys = Object.keys(config).filter(k => config[k]);

              return (
                <div key={link.id} className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Plug className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-foreground">{conn.service_name}</span>
                      <Badge variant="outline" className="text-xs border-accent/50 text-accent">
                        {categoryLabels[conn.service_category] || conn.service_category}
                      </Badge>
                      {conn.provider && <Badge variant="outline" className="text-xs">{conn.provider}</Badge>}
                      <Badge variant="outline" className={`text-xs ${conn.status === 'active' ? 'border-green-300 text-green-700' : 'border-muted text-muted-foreground'}`}>
                        {conn.status === 'active' ? 'פעיל' : conn.status}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleUnlink(link.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* All Credentials */}
                  {credKeys.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Shield className="h-3 w-3" /> פרטי גישה
                      </p>
                      {credKeys.map(key => (
                        <CopyableField
                          key={key}
                          label={key}
                          value={String(creds[key])}
                          isSecret={isSecretKey(key)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Config/Settings */}
                  {configKeys.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Database className="h-3 w-3" /> הגדרות
                      </p>
                      {configKeys.map(key => (
                        <CopyableField
                          key={key}
                          label={key}
                          value={String(config[key])}
                          isSecret={false}
                        />
                      ))}
                    </div>
                  )}

                  {conn.notes && (
                    <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded">{conn.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Environment Variables from analysis */}
        {envVars && envVars.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-accent" />
              משתני סביבה ({envVars.length})
            </p>
            <div className="space-y-1.5">
              {envVars.map((ev) => (
                <CopyableField
                  key={ev.id}
                  label={ev.var_name}
                  value={ev.var_value || "(לא ידוע)"}
                  isSecret={ev.is_secret ?? true}
                />
              ))}
            </div>
          </div>
        )}

        {(!linked || linked.length === 0) && (!envVars || envVars.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">אין חיבורים או קודים מקושרים לפרויקט זה</p>
        )}
      </CardContent>
    </Card>
  );
}
