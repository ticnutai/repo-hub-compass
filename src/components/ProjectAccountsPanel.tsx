import { useState } from "react";
import { Key, Eye, EyeOff, Copy, Check, Plus, Trash2, ExternalLink, User, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectAccounts, useAccounts, useLinkAccountToProject, useUnlinkAccountFromProject } from "@/hooks/use-data";
import { toast } from "sonner";

const serviceUrls: Record<string, string> = {
  "GitHub": "https://github.com/settings/tokens",
  "Vercel": "https://vercel.com/account/tokens",
  "Netlify": "https://app.netlify.com/user/applications#personal-access-tokens",
  "AWS": "https://console.aws.amazon.com/iam/home#/security_credentials",
  "Google Cloud": "https://console.cloud.google.com/apis/credentials",
  "Firebase": "https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk",
  "Supabase": "https://supabase.com/dashboard/project/_/settings/api",
  "OpenAI": "https://platform.openai.com/api-keys",
  "Stripe": "https://dashboard.stripe.com/apikeys",
  "Twilio": "https://console.twilio.com/",
  "Cloudflare": "https://dash.cloudflare.com/profile/api-tokens",
  "Docker Hub": "https://hub.docker.com/settings/security",
  "MongoDB Atlas": "https://cloud.mongodb.com/",
  "WhatsApp Business": "https://business.facebook.com/settings/",
  "Slack": "https://api.slack.com/apps",
};

const fieldLabels: Record<string, string> = {
  username: "שם משתמש",
  email: "אימייל",
  password: "סיסמה / Token",
  api_key: "API Key",
  notes: "הערות",
  service_type: "סוג שירות",
};

const secretFields = ["password", "api_key"];

function CredentialField({ label, value, isSecret }: { label: string; value: string; isSecret: boolean }) {
  const [visible, setVisible] = useState(!isSecret);
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`${fieldLabels[label] || label} הועתק!`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-border/50 group">
      <Key className="h-3.5 w-3.5 text-accent shrink-0" />
      <span className="text-xs text-muted-foreground min-w-[80px] shrink-0">{fieldLabels[label] || label}:</span>
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

export function ProjectAccountsPanel({ projectId }: { projectId: string }) {
  const { data: linked } = useProjectAccounts(projectId);
  const { data: allAccounts } = useAccounts();
  const linkMutation = useLinkAccountToProject();
  const unlinkMutation = useUnlinkAccountFromProject();
  const [selectedId, setSelectedId] = useState("");

  const linkedAccountIds = new Set((linked || []).map((l: any) => l.account_id));
  const available = (allAccounts || []).filter((a: any) => !linkedAccountIds.has(a.id));

  const handleLink = async () => {
    if (!selectedId) return;
    try {
      await linkMutation.mutateAsync({ account_id: selectedId, project_id: projectId });
      toast.success("חשבון קושר לפרויקט!");
      setSelectedId("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUnlink = async (id: string) => {
    try {
      await unlinkMutation.mutateAsync(id);
      toast.success("חשבון הוסר מהפרויקט");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const displayFields = ["username", "email", "password", "api_key", "notes"];

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          חשבונות ופרטי גישה ({linked?.length || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Link account */}
        <div className="flex gap-2">
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="בחר חשבון לקישור..." />
            </SelectTrigger>
            <SelectContent>
              {available.length === 0 ? (
                <SelectItem value="_none" disabled>אין חשבונות זמינים</SelectItem>
              ) : available.map((a: any) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.service_name} {a.service_type ? `(${a.service_type})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleLink} disabled={!selectedId || linkMutation.isPending} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 ml-1" /> קשר
          </Button>
        </div>

        {/* Linked accounts with full credentials */}
        {linked && linked.length > 0 && (
          <div className="space-y-4">
            {linked.map((link: any) => {
              const acc = link.accounts;
              if (!acc) return null;
              const serviceUrl = serviceUrls[acc.service_name];

              return (
                <div key={link.id} className="p-4 rounded-xl bg-secondary/50 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="h-4 w-4 text-accent" />
                      <span className="font-semibold text-foreground">{acc.service_name}</span>
                      {acc.service_type && (
                        <Badge variant="outline" className="text-xs border-accent/50 text-accent">
                          {acc.service_type}
                        </Badge>
                      )}
                      {serviceUrl && (
                        <a href={serviceUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-accent">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleUnlink(link.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {displayFields.map(field => {
                      const value = acc[field];
                      if (!value) return null;
                      return (
                        <CredentialField
                          key={field}
                          label={field}
                          value={String(value)}
                          isSecret={secretFields.includes(field)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(!linked || linked.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">אין חשבונות מקושרים לפרויקט זה</p>
        )}
      </CardContent>
    </Card>
  );
}
