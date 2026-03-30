import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Loader2, Check, Eye, EyeOff, Clock, RefreshCw, Terminal, Database, Upload, Play, Trash2, FileCode, Table, Copy, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type GitHubIdentity = {
  login: string;
  name?: string | null;
  email?: string | null;
};

// ---- General Settings Tab ----
function GeneralSettingsTab() {
  const { user, signOut } = useAuth();
  const { data: profile, refetch } = useProfile();
  const [githubToken, setGithubToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState("daily");
  const [savingSync, setSavingSync] = useState(false);
  const [githubIdentity, setGithubIdentity] = useState<GitHubIdentity | null>(null);
  const [checkingIdentity, setCheckingIdentity] = useState(false);

  const hasToken = !!profile?.github_token;

  useEffect(() => {
    if (profile) {
      setAutoSync((profile as any).auto_sync_enabled ?? false);
      setSyncInterval((profile as any).sync_interval ?? "daily");
    }
  }, [profile]);

  const fetchGitHubIdentity = async (token: string): Promise<GitHubIdentity> => {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!userRes.ok) {
      throw new Error("טוקן GitHub לא תקין או ללא הרשאות");
    }

    const userData = await userRes.json();
    let resolvedEmail: string | null = userData.email || null;

    if (!resolvedEmail) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (emailRes.ok) {
        const emails = await emailRes.json();
        const primary = (emails || []).find((entry: any) => entry?.primary && entry?.verified) || (emails || [])[0];
        resolvedEmail = primary?.email || null;
      }
    }

    return {
      login: userData.login,
      name: userData.name,
      email: resolvedEmail,
    };
  };

  useEffect(() => {
    const loadIdentity = async () => {
      const token = profile?.github_token;
      if (!token) {
        setGithubIdentity(null);
        return;
      }

      setCheckingIdentity(true);
      try {
        const identity = await fetchGitHubIdentity(token);
        setGithubIdentity(identity);
      } catch {
        setGithubIdentity(null);
      }
      setCheckingIdentity(false);
    };

    loadIdentity();
  }, [profile?.github_token]);

  const handleSaveToken = async () => {
    if (!githubToken.trim()) return;
    setSaving(true);
    try {
      const token = githubToken.trim();
      const identity = await fetchGitHubIdentity(token);

      const { error } = await supabase.from("profiles").update({ github_token: token }).eq("user_id", user!.id);
      if (error) throw error;

      const githubEmail = identity.email || user?.email || "";
      const { data: existingAccount } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", user!.id)
        .ilike("service_name", "github")
        .eq("username", identity.login)
        .maybeSingle();

      if (existingAccount?.id) {
        await supabase
          .from("accounts")
          .update({
            service_name: "GitHub",
            service_type: "קוד",
            username: identity.login,
            email: githubEmail,
            api_key: token,
            notes: identity.name ? `GitHub Name: ${identity.name}` : "",
          })
          .eq("id", existingAccount.id);
      } else {
        await supabase
          .from("accounts")
          .insert({
            user_id: user!.id,
            service_name: "GitHub",
            service_type: "קוד",
            username: identity.login,
            email: githubEmail,
            api_key: token,
            notes: identity.name ? `GitHub Name: ${identity.name}` : "",
          } as any);
      }

      setGithubIdentity(identity);
      toast.success(`GitHub Token נשמר בהצלחה! חשבון: ${identity.login}`);
      setGithubToken("");
      refetch();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleRemoveToken = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ github_token: null }).eq("user_id", user!.id);
      if (error) throw error;
      toast.success("GitHub Token הוסר");
      setGithubIdentity(null);
      refetch();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const handleSaveSyncSettings = async () => {
    setSavingSync(true);
    try {
      const { error } = await supabase.from("profiles").update({ auto_sync_enabled: autoSync, sync_interval: syncInterval } as any).eq("user_id", user!.id);
      if (error) throw error;
      toast.success("הגדרות סנכרון נשמרו!");
      refetch();
    } catch (e: any) { toast.error(e.message); }
    setSavingSync(false);
  };

  const handleManualSyncAll = async () => {
    setSavingSync(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/auto-sync-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "שגיאה בסנכרון");
      toast.success(`סנכרון הושלם! ${result.commits_imported || 0} commits חדשים מ-${result.projects_synced || 0} פרויקטים`);
    } catch (e: any) { toast.error(e.message); }
    setSavingSync(false);
  };

  const intervalLabels: Record<string, string> = {
    hourly: "כל שעה", every_6h: "כל 6 שעות", every_12h: "כל 12 שעות", daily: "פעם ביום", weekly: "פעם בשבוע",
  };

  return (
    <div className="space-y-6">
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
              {checkingIdentity ? (
                <p className="text-xs text-muted-foreground">בודק פרטי חשבון GitHub...</p>
              ) : githubIdentity ? (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700">חשבון: {githubIdentity.login}</Badge>
                  {githubIdentity.email && <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">מייל: {githubIdentity.email}</Badge>}
                </div>
              ) : (
                <p className="text-xs text-amber-700">לא ניתן היה לזהות שם חשבון מהטוקן הנוכחי</p>
              )}
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
                שמור GitHub Token כדי לייבא פרויקטים ולסנכרן commits.{" "}
                <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" className="text-accent hover:underline">צור טוקן חדש</a>
              </p>
              <div><Label>GitHub Token</Label><Input className="mt-1 font-mono text-sm" type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" /></div>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSaveToken} disabled={saving || !githubToken.trim()}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> שומר...</> : "שמור טוקן"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-accent">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-accent" /> סנכרון אוטומטי מ-GitHub</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div><Label className="text-base">הפעל סנכרון אוטומטי</Label><p className="text-xs text-muted-foreground mt-0.5">סנכרן commits חדשים מכל פרויקטי GitHub אוטומטית</p></div>
            <Switch checked={autoSync} onCheckedChange={setAutoSync} />
          </div>
          {autoSync && (
            <div className="space-y-3 p-4 rounded-lg bg-secondary/50 border border-border">
              <div><Label>תדירות סנכרון</Label>
                <Select value={syncInterval} onValueChange={setSyncInterval}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(intervalLabels).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}</SelectContent>
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
        <CardContent><Button variant="destructive" onClick={signOut}><LogOut className="h-4 w-4 ml-2" /> התנתק</Button></CardContent>
      </Card>
    </div>
  );
}

// ---- Dev Console Tab ----
function DevConsoleTab() {
  const [query, setQuery] = useState("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;");
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<Array<{ query: string; time: string; success: boolean }>>([]);

  const presetQueries = [
    { label: "רשימת טבלאות", query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" },
    { label: "כל הפרויקטים", query: "SELECT id, name, platform, status, language, created_at FROM projects ORDER BY updated_at DESC;" },
    { label: "סה\"כ רשומות", query: "SELECT\n  (SELECT count(*) FROM projects) as projects,\n  (SELECT count(*) FROM accounts) as accounts,\n  (SELECT count(*) FROM tasks) as tasks,\n  (SELECT count(*) FROM changelogs) as changelogs,\n  (SELECT count(*) FROM backups) as backups;" },
    { label: "חיבורים פעילים", query: "SELECT service_name, provider, status, service_category FROM service_connections ORDER BY created_at DESC;" },
    { label: "גודל טבלאות", query: "SELECT relname as table_name, pg_size_pretty(pg_total_relation_size(relid)) as total_size FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC;" },
  ];

  const runQuery = async () => {
    if (!query.trim()) return;
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");

      const pid = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${pid}.supabase.co/functions/v1/dev-console`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: "console", query: query.trim() }),
      });
      const result = await res.json();
      if (!res.ok || result.error) throw new Error(result.error || "שגיאה");
      
      setResults(result.data || []);
      setHistory(prev => [{ query: query.trim(), time: new Date().toLocaleTimeString("he-IL"), success: true }, ...prev.slice(0, 19)]);
    } catch (e: any) {
      setError(e.message);
      setHistory(prev => [{ query: query.trim(), time: new Date().toLocaleTimeString("he-IL"), success: false }, ...prev.slice(0, 19)]);
    }
    setRunning(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-accent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="h-5 w-5 text-accent" /> קונסול מרוחק (קריאה בלבד)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset queries */}
          <div className="flex flex-wrap gap-2">
            {presetQueries.map((p) => (
              <Button key={p.label} variant="outline" size="sm" className="text-xs border-accent/50 text-accent hover:bg-accent/10" onClick={() => setQuery(p.query)}>
                {p.label}
              </Button>
            ))}
          </div>

          {/* Query input */}
          <div className="relative">
            <Textarea
              className="font-mono text-sm min-h-[120px] bg-secondary/30 border-border"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SELECT * FROM projects LIMIT 10;"
              dir="ltr"
            />
            <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
              Ctrl+Enter להרצה
            </div>
          </div>

          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={runQuery} disabled={running || !query.trim()}>
            {running ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> מריץ...</> : <><Play className="h-4 w-4 ml-2" /> הרץ שאילתה</>}
          </Button>

          {/* Error */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive font-mono" dir="ltr">
              {error}
            </div>
          )}

          {/* Results */}
          {results !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{results.length} תוצאות</span>
                <Button variant="ghost" size="sm" onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(results, null, 2));
                  toast.success("הועתק!");
                }}>
                  <Copy className="h-3.5 w-3.5 ml-1" /> העתק JSON
                </Button>
              </div>
              <div className="overflow-auto max-h-[400px] border border-border rounded-lg">
                {results.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">אין תוצאות</div>
                ) : (
                  <table className="w-full text-sm" dir="ltr">
                    <thead className="bg-secondary/50 sticky top-0">
                      <tr>
                        {Object.keys(results[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2 text-right font-medium text-foreground border-b border-border whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, i) => (
                        <tr key={i} className="hover:bg-secondary/30">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-3 py-1.5 border-b border-border/50 font-mono text-xs whitespace-nowrap max-w-[300px] truncate">
                              {val === null ? <span className="text-muted-foreground italic">NULL</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Query History */}
      {history.length > 0 && (
        <Card className="border-2 border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">היסטוריית שאילתות</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setHistory([])}><Trash2 className="h-3.5 w-3.5 ml-1" /> נקה</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {history.map((h, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer" onClick={() => setQuery(h.query)}>
                  {h.success ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs truncate" dir="ltr">{h.query}</p>
                    <p className="text-xs text-muted-foreground">{h.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- Migrations Tab ----
function MigrationsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [sql, setSql] = useState("");
  const [running, setRunning] = useState(false);

  const { data: migrations, isLoading } = useQuery({
    queryKey: ["migration_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("migration_logs" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setSql(content);
      if (!name.trim()) setName(file.name.replace(/\.sql$/i, ""));
      toast.success(`קובץ ${file.name} נטען`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleExecute = async () => {
    if (!sql.trim() || !name.trim()) return;
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");

      // Log the migration
      await supabase.from("migration_logs" as any).insert({
        user_id: user!.id,
        name: name.trim(),
        sql_content: sql.trim(),
        status: "running",
      } as any);

      // Run via dev-console (we'll use the readonly function for now - display only)
      // For actual migrations, the user should use the Supabase dashboard
      toast.info("מיגרציה נשמרה בלוג. להרצת שינויי סכמה, השתמש בכלי מיגרציות ייעודי.");
      
      // Update status
      queryClient.invalidateQueries({ queryKey: ["migration_logs"] });
      setName("");
      setSql("");
    } catch (e: any) {
      toast.error(e.message);
    }
    setRunning(false);
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: "ממתין", color: "bg-amber-100 text-amber-700 border-amber-300" },
    running: { label: "רץ", color: "bg-blue-100 text-blue-700 border-blue-300" },
    success: { label: "הצליח", color: "bg-green-100 text-green-700 border-green-300" },
    failed: { label: "נכשל", color: "bg-red-100 text-red-700 border-red-300" },
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-accent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-accent" /> יצירת מיגרציה חדשה
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>שם המיגרציה</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="add_users_table" dir="ltr" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label>SQL</Label>
              <label className="cursor-pointer">
                <input type="file" accept=".sql,.txt" className="hidden" onChange={handleFileUpload} />
                <Button variant="outline" size="sm" className="border-accent/50 text-accent hover:bg-accent/10" asChild>
                  <span><Upload className="h-3.5 w-3.5 ml-1" /> העלה קובץ SQL</span>
                </Button>
              </label>
            </div>
            <Textarea
              className="font-mono text-sm min-h-[200px] bg-secondary/30 border-border"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="CREATE TABLE public.example (&#10;  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),&#10;  name text NOT NULL,&#10;  created_at timestamptz DEFAULT now()&#10;);"
              dir="ltr"
            />
          </div>

          {/* SQL Templates */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">תבניות מהירות</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                setSql("CREATE TABLE public.table_name (\n  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),\n  user_id uuid NOT NULL,\n  name text NOT NULL,\n  created_at timestamptz DEFAULT now()\n);\n\nALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY \"Users manage own rows\" ON public.table_name\n  FOR ALL TO authenticated\n  USING (user_id = auth.uid())\n  WITH CHECK (user_id = auth.uid());");
                if (!name) setName("create_new_table");
              }}>
                <Table className="h-3 w-3 ml-1" /> טבלה חדשה + RLS
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                setSql("ALTER TABLE public.table_name\n  ADD COLUMN new_column text;");
                if (!name) setName("add_column");
              }}>
                הוסף עמודה
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                setSql("CREATE INDEX idx_table_column ON public.table_name (column_name);");
                if (!name) setName("add_index");
              }}>
                הוסף אינדקס
              </Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                setSql("CREATE OR REPLACE FUNCTION public.function_name()\nRETURNS trigger\nLANGUAGE plpgsql\nSECURITY DEFINER\nAS $$\nBEGIN\n  NEW.updated_at = now();\n  RETURN NEW;\nEND;\n$$;\n\nCREATE TRIGGER trigger_name\n  BEFORE UPDATE ON public.table_name\n  FOR EACH ROW EXECUTE FUNCTION public.function_name();");
                if (!name) setName("add_trigger");
              }}>
                <FileCode className="h-3 w-3 ml-1" /> טריגר
              </Button>
            </div>
          </div>

          <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleExecute} disabled={running || !sql.trim() || !name.trim()}>
            {running ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> שומר...</> : <><Database className="h-4 w-4 ml-2" /> שמור מיגרציה</>}
          </Button>
        </CardContent>
      </Card>

      {/* Migrations History */}
      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">היסטוריית מיגרציות</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground text-sm">טוען...</div>
          ) : !migrations?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">אין מיגרציות עדיין</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-auto">
              {migrations.map((m: any) => (
                <div key={m.id} className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4 text-accent" />
                      <span className="font-medium text-sm">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${statusLabels[m.status]?.color || ''}`}>
                        {statusLabels[m.status]?.label || m.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleDateString("he-IL")}</span>
                    </div>
                  </div>
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">הצג SQL</summary>
                    <pre className="mt-2 p-2 bg-secondary/50 rounded text-xs font-mono overflow-auto max-h-[200px]" dir="ltr">{m.sql_content}</pre>
                  </details>
                  {m.error_message && (
                    <div className="text-xs text-destructive bg-destructive/10 p-2 rounded" dir="ltr">{m.error_message}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Main Settings Page ----
export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">הגדרות</h2>

      <Tabs defaultValue="general" dir="rtl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" /> כללי
          </TabsTrigger>
          <TabsTrigger value="console" className="flex items-center gap-2">
            <Terminal className="h-4 w-4" /> קונסול פיתוח
          </TabsTrigger>
          <TabsTrigger value="migrations" className="flex items-center gap-2">
            <Database className="h-4 w-4" /> מיגרציות
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general"><GeneralSettingsTab /></TabsContent>
        <TabsContent value="console"><DevConsoleTab /></TabsContent>
        <TabsContent value="migrations"><MigrationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
