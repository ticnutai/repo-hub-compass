import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Loader2, Check, Eye, EyeOff, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { data: profile, refetch } = useProfile();
  const [githubToken, setGithubToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState("daily");
  const [savingSync, setSavingSync] = useState(false);

  const hasToken = !!profile?.github_token;

  useEffect(() => {
    if (profile) {
      setAutoSync((profile as any).auto_sync_enabled ?? false);
      setSyncInterval((profile as any).sync_interval ?? "daily");
    }
  }, [profile]);

  const handleSaveToken = async () => {
    if (!githubToken.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ github_token: githubToken.trim() })
        .eq("user_id", user!.id);
      if (error) throw error;
      toast.success("GitHub Token נשמר בהצלחה!");
      setGithubToken("");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const handleRemoveToken = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ github_token: null })
        .eq("user_id", user!.id);
      if (error) throw error;
      toast.success("GitHub Token הוסר");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const handleSaveSyncSettings = async () => {
    setSavingSync(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          auto_sync_enabled: autoSync, 
          sync_interval: syncInterval 
        } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
      toast.success("הגדרות סנכרון נשמרו!");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
    setSavingSync(false);
  };

  const handleManualSyncAll = async () => {
    setSavingSync(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/auto-sync-github`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "שגיאה בסנכרון");
      toast.success(`סנכרון הושלם! ${result.commits_imported || 0} commits חדשים מ-${result.projects_synced || 0} פרויקטים`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSavingSync(false);
  };

  const intervalLabels: Record<string, string> = {
    "hourly": "כל שעה",
    "every_6h": "כל 6 שעות",
    "every_12h": "כל 12 שעות",
    "daily": "פעם ביום",
    "weekly": "פעם בשבוע",
  };

  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">הגדרות</h2>

      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">פרופיל</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>אימייל</Label><Input className="mt-1" type="email" defaultValue={user?.email || ""} disabled /></div>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">שמור שינויים</Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">חיבור GitHub</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {hasToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">GitHub Token מחובר</span>
              </div>
              <div className="flex items-center gap-2">
                <Input className="flex-1 font-mono text-sm" type={showToken ? "text" : "password"} value={profile?.github_token || ""} disabled />
                <Button variant="ghost" size="icon" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="destructive" size="sm" onClick={handleRemoveToken} disabled={saving}>הסר טוקן</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                שמור GitHub Token כדי לייבא פרויקטים ולסנכרן commits בלי להזין אותו כל פעם.{" "}
                <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" className="text-accent hover:underline">צור טוקן חדש</a>
              </p>
              <div>
                <Label>GitHub Token</Label>
                <Input className="mt-1 font-mono text-sm" type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" />
              </div>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSaveToken} disabled={saving || !githubToken.trim()}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> שומר...</> : "שמור טוקן"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-accent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" /> סנכרון אוטומטי מ-GitHub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">הפעל סנכרון אוטומטי</Label>
              <p className="text-xs text-muted-foreground mt-0.5">סנכרן commits חדשים מכל פרויקטי GitHub אוטומטית</p>
            </div>
            <Switch checked={autoSync} onCheckedChange={setAutoSync} />
          </div>

          {autoSync && (
            <div className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
              <div>
                <Label>תדירות סנכרון</Label>
                <Select value={syncInterval} onValueChange={setSyncInterval}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(intervalLabels).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSaveSyncSettings} disabled={savingSync}>
              {savingSync ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> שומר...</> : "שמור הגדרות"}
            </Button>
            <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" onClick={handleManualSyncAll} disabled={savingSync || !hasToken}>
              <RefreshCw className="h-4 w-4 ml-2" /> סנכרן הכל עכשיו
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">גיבויים אוטומטיים</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between"><Label>הפעל גיבויים אוטומטיים</Label><Switch defaultChecked /></div>
          <div className="flex items-center justify-between"><Label>קבל התראות על גיבויים שנכשלו</Label><Switch defaultChecked /></div>
        </CardContent>
      </Card>

      <Card className="border-2 border-destructive/50">
        <CardHeader><CardTitle className="text-lg text-destructive">יציאה מהמערכת</CardTitle></CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={signOut}><LogOut className="h-4 w-4 ml-2" /> התנתק</Button>
        </CardContent>
      </Card>
    </div>
  );
}
