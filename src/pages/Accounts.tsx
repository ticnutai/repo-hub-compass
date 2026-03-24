import { useState, useRef } from "react";
import { Plus, Eye, EyeOff, Search, Key, User, Pencil, Trash2, Upload, X, Check, FileText, Copy, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from "@/hooks/use-data";
import { toast } from "sonner";

interface AccountForm {
  service_name: string;
  service_type: string;
  username: string;
  email: string;
  password: string;
  api_key: string;
  notes: string;
}

const emptyForm: AccountForm = {
  service_name: "", service_type: "", username: "", email: "", password: "", api_key: "", notes: "",
};

// Service presets with their required fields and links
const servicePresets = [
  { name: "GitHub", type: "קוד", url: "https://github.com/settings/tokens", fields: ["username", "email", "password", "api_key"], icon: "🐙", hint: "צור Personal Access Token בהגדרות GitHub" },
  { name: "Vercel", type: "אחסון", url: "https://vercel.com/account/tokens", fields: ["email", "api_key"], icon: "▲", hint: "צור Access Token מהגדרות החשבון" },
  { name: "Netlify", type: "אחסון", url: "https://app.netlify.com/user/applications#personal-access-tokens", fields: ["email", "api_key"], icon: "🌐", hint: "Personal Access Token" },
  { name: "AWS", type: "ענן", url: "https://console.aws.amazon.com/iam/home#/security_credentials", fields: ["username", "password", "api_key"], icon: "☁️", hint: "Access Key ID + Secret Access Key" },
  { name: "Google Cloud", type: "ענן", url: "https://console.cloud.google.com/apis/credentials", fields: ["email", "api_key", "notes"], icon: "🔵", hint: "Service Account Key או API Key" },
  { name: "Firebase", type: "ענן", url: "https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk", fields: ["email", "api_key", "notes"], icon: "🔥", hint: "Project ID + Service Account JSON" },
  { name: "Supabase", type: "בקנד", url: "https://supabase.com/dashboard/project/_/settings/api", fields: ["email", "password", "api_key", "notes"], icon: "⚡", hint: "Project URL + anon/service keys" },
  { name: "OpenAI", type: "AI", url: "https://platform.openai.com/api-keys", fields: ["api_key"], icon: "🤖", hint: "API Key מדף ה-API Keys" },
  { name: "Stripe", type: "תשלומים", url: "https://dashboard.stripe.com/apikeys", fields: ["api_key", "notes"], icon: "💳", hint: "Publishable + Secret Key" },
  { name: "Twilio", type: "תקשורת", url: "https://console.twilio.com/", fields: ["username", "password", "api_key"], icon: "📱", hint: "Account SID + Auth Token" },
  { name: "SendGrid", type: "אימייל", url: "https://app.sendgrid.com/settings/api_keys", fields: ["email", "api_key"], icon: "📧", hint: "API Key לשליחת מיילים" },
  { name: "Cloudflare", type: "CDN", url: "https://dash.cloudflare.com/profile/api-tokens", fields: ["email", "api_key"], icon: "🛡️", hint: "API Token או Global API Key" },
  { name: "Docker Hub", type: "קונטיינרים", url: "https://hub.docker.com/settings/security", fields: ["username", "password", "api_key"], icon: "🐳", hint: "Access Token" },
  { name: "MongoDB Atlas", type: "מסד נתונים", url: "https://cloud.mongodb.com/", fields: ["username", "password", "notes"], icon: "🍃", hint: "Connection String + Database User" },
  { name: "Redis Cloud", type: "מסד נתונים", url: "https://app.redislabs.com/", fields: ["username", "password", "notes"], icon: "🔴", hint: "Endpoint + Password" },
  { name: "Cloudinary", type: "מדיה", url: "https://console.cloudinary.com/settings/api-keys", fields: ["username", "api_key", "notes"], icon: "🖼️", hint: "Cloud Name + API Key + Secret" },
  { name: "WhatsApp Business", type: "תקשורת", url: "https://business.facebook.com/settings/", fields: ["username", "api_key", "notes"], icon: "💬", hint: "Phone Number ID + Access Token" },
  { name: "Slack", type: "תקשורת", url: "https://api.slack.com/apps", fields: ["api_key", "notes"], icon: "💼", hint: "Bot Token (xoxb-...)" },
  { name: "Discord", type: "תקשורת", url: "https://discord.com/developers/applications", fields: ["api_key", "notes"], icon: "🎮", hint: "Bot Token" },
  { name: "Notion", type: "ניהול", url: "https://www.notion.so/my-integrations", fields: ["api_key", "notes"], icon: "📝", hint: "Internal Integration Token" },
  { name: "Linear", type: "ניהול", url: "https://linear.app/settings/api", fields: ["api_key"], icon: "🔷", hint: "Personal API Key" },
  { name: "Jira", type: "ניהול", url: "https://id.atlassian.com/manage-profile/security/api-tokens", fields: ["email", "api_key", "notes"], icon: "🔵", hint: "Email + API Token" },
  { name: "DigitalOcean", type: "ענן", url: "https://cloud.digitalocean.com/account/api/tokens", fields: ["api_key"], icon: "🌊", hint: "Personal Access Token" },
  { name: "Heroku", type: "אחסון", url: "https://dashboard.heroku.com/account", fields: ["email", "api_key"], icon: "🟣", hint: "API Key מהגדרות החשבון" },
];

// Parse credentials from text content (env files, CSV, JSON, plain text)
function parseCredentials(content: string, fileName: string): Partial<AccountForm>[] {
  const results: Partial<AccountForm>[] = [];

  // Try JSON
  try {
    const json = JSON.parse(content);
    const items = Array.isArray(json) ? json : [json];
    for (const item of items) {
      const entry: Partial<AccountForm> = {};
      entry.service_name = item.service || item.service_name || item.name || item.site || item.host || "";
      entry.username = item.username || item.user || item.login || "";
      entry.email = item.email || item.mail || "";
      entry.password = item.password || item.pass || item.token || item.secret || "";
      entry.api_key = item.api_key || item.apiKey || item.key || "";
      entry.notes = item.notes || item.note || item.description || "";
      entry.service_type = item.type || item.service_type || item.category || "";
      if (entry.service_name || entry.username || entry.password || entry.api_key) {
        results.push(entry);
      }
    }
    if (results.length > 0) return results;
  } catch { /* not JSON */ }

  // Try .env format (KEY=VALUE)
  const envLines = content.split("\n").filter(l => l.trim() && !l.trim().startsWith("#"));
  const envPairs: Record<string, string> = {};
  let isEnv = false;
  for (const line of envLines) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)[\s]*=[\s]*(.*)$/i);
    if (match) {
      envPairs[match[1]] = match[2].replace(/^["']|["']$/g, "");
      isEnv = true;
    }
  }
  if (isEnv && Object.keys(envPairs).length > 0) {
    // Group env vars as a single account
    const entry: Partial<AccountForm> = {
      service_name: fileName.replace(/\.(env|txt|cfg|conf|ini)$/i, "") || "Environment File",
      service_type: "env",
      notes: Object.entries(envPairs).map(([k, v]) => `${k}=${v}`).join("\n"),
    };
    // Try to detect specific keys
    for (const [k, v] of Object.entries(envPairs)) {
      const kl = k.toLowerCase();
      if (kl.includes("password") || kl.includes("pass")) entry.password = v;
      else if (kl.includes("user") || kl.includes("login")) entry.username = v;
      else if (kl.includes("email") || kl.includes("mail")) entry.email = v;
      else if (kl.includes("api_key") || kl.includes("apikey") || kl.includes("token") || kl.includes("secret")) entry.api_key = v;
      else if (kl.includes("host") || kl.includes("service") || kl.includes("url")) entry.service_name = v;
    }
    results.push(entry);
    return results;
  }

  // Try CSV format
  const lines = content.split("\n").filter(l => l.trim());
  if (lines.length >= 2 && (lines[0].includes(",") || lines[0].includes("\t"))) {
    const sep = lines[0].includes("\t") ? "\t" : ",";
    const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/["']/g, ""));
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(sep).map(v => v.trim().replace(/["']/g, ""));
      const entry: Partial<AccountForm> = {};
      headers.forEach((h, idx) => {
        const v = vals[idx] || "";
        if (h.includes("service") || h.includes("name") || h.includes("site") || h.includes("url")) entry.service_name = v;
        else if (h.includes("user") || h.includes("login")) entry.username = v;
        else if (h.includes("email") || h.includes("mail")) entry.email = v;
        else if (h.includes("pass") || h.includes("password") || h.includes("token")) entry.password = v;
        else if (h.includes("api") || h.includes("key") || h.includes("secret")) entry.api_key = v;
        else if (h.includes("note") || h.includes("comment")) entry.notes = v;
        else if (h.includes("type") || h.includes("category")) entry.service_type = v;
      });
      if (entry.service_name || entry.username || entry.password) {
        results.push(entry);
      }
    }
    if (results.length > 0) return results;
  }

  // Fallback: treat whole content as notes
  results.push({
    service_name: fileName || "Imported File",
    notes: content.slice(0, 2000),
  });
  return results;
}

export default function Accounts() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [searchQuery, setSearchQuery] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>({ ...emptyForm });
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = (accounts || []).filter(a =>
    a.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.username || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.service_type || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const setField = (key: keyof AccountForm, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setOpen(true);
  };

  const openEdit = (account: any) => {
    setEditId(account.id);
    setForm({
      service_name: account.service_name || "",
      service_type: account.service_type || "",
      username: account.username || "",
      email: account.email || "",
      password: account.password || "",
      api_key: account.api_key || "",
      notes: account.notes || "",
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.service_name.trim()) return;
    try {
      if (editId) {
        await updateAccount.mutateAsync({ id: editId, ...form });
        toast.success("חשבון עודכן בהצלחה!");
      } else {
        await createAccount.mutateAsync(form);
        toast.success("חשבון נוסף בהצלחה!");
      }
      setOpen(false);
      setForm({ ...emptyForm });
      setEditId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteAccount.mutateAsync(deleteId);
      toast.success("חשבון נמחק!");
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    let totalImported = 0;
    for (const file of Array.from(files)) {
      try {
        const content = await file.text();
        const parsed = parseCredentials(content, file.name);
        for (const entry of parsed) {
          if (entry.service_name) {
            await createAccount.mutateAsync({
              service_name: entry.service_name,
              service_type: entry.service_type || "",
              username: entry.username || "",
              email: entry.email || "",
              password: entry.password || "",
              api_key: entry.api_key || "",
              notes: entry.notes || "",
            });
            totalImported++;
          }
        }
      } catch { /* skip file */ }
    }
    toast.success(`${totalImported} חשבונות יובאו מהקבצים!`);
    setImportOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("הועתק!");
  };

  const toggleShow = (key: string) =>
    setShowPasswords(s => ({ ...s, [key]: !s[key] }));

  const SecretField = ({ label, value, id }: { label: string; value: string; id: string }) => (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-mono text-xs truncate max-w-[140px]">
        {showPasswords[id] ? value : "••••••••"}
      </span>
      <div className="flex gap-0.5 mr-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleShow(id)}>
                {showPasswords[id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showPasswords[id] ? "הסתר" : "הצג"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(value)}>
                <Copy className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>העתק</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-foreground">ניהול חשבונות</h2>
        <div className="flex gap-2">
          {/* Import from file */}
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
                <Upload className="h-4 w-4 ml-2" /> ייבוא מקובץ
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl" className="border-2 border-accent">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> ייבוא חשבונות מקובץ</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  העלה קובץ עם סיסמאות וחשבונות. פורמטים נתמכים:
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-secondary rounded-md border">
                    <p className="font-medium text-primary">JSON</p>
                    <p className="text-muted-foreground">[{`{service, username, password}`}]</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-md border">
                    <p className="font-medium text-primary">CSV</p>
                    <p className="text-muted-foreground">service,username,password</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-md border">
                    <p className="font-medium text-primary">ENV</p>
                    <p className="text-muted-foreground">KEY=value (קבצי .env)</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-md border">
                    <p className="font-medium text-primary">טקסט</p>
                    <p className="text-muted-foreground">כל קובץ טקסט</p>
                  </div>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".json,.csv,.env,.txt,.cfg,.conf,.ini,.yaml,.yml"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 ml-2" /> בחר קבצים
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create new */}
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={openCreate}>
            <Plus className="h-4 w-4 ml-2" /> חשבון חדש
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="חפש חשבון..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((account) => (
            <Card key={account.id} className="border-2 border-border hover:border-accent transition-colors group">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Key className="h-4 w-4 text-accent" />
                  </div>
                  <span className="truncate">{account.service_name}</span>
                  {account.service_type && <Badge variant="outline" className="mr-auto text-xs shrink-0">{account.service_type}</Badge>}
                  {/* Edit & Delete buttons */}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(account)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>ערוך</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(account.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>מחק</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {account.username && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{account.username}</span>
                  </div>
                )}
                {account.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">אימייל:</span>
                    <span className="truncate">{account.email}</span>
                  </div>
                )}
                {account.password && <SecretField label="סיסמה" value={account.password} id={account.id} />}
                {account.api_key && <SecretField label="API Key" value={account.api_key} id={`api-${account.id}`} />}
                {account.notes && <p className="text-xs text-muted-foreground italic line-clamp-2">{account.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Key className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">אין חשבונות עדיין</p>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditId(null); }}>
        <DialogContent dir="rtl" className="border-2 border-accent">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת חשבון" : "הוסף חשבון חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>שם השירות</Label><Input className="mt-1" value={form.service_name} onChange={e => setField("service_name", e.target.value)} placeholder="GitHub, Vercel..." /></div>
              <div><Label>סוג</Label><Input className="mt-1" value={form.service_type} onChange={e => setField("service_type", e.target.value)} placeholder="קוד, אחסון..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>שם משתמש</Label><Input className="mt-1" value={form.username} onChange={e => setField("username", e.target.value)} /></div>
              <div><Label>אימייל</Label><Input className="mt-1" type="email" value={form.email} onChange={e => setField("email", e.target.value)} /></div>
            </div>
            <div className="relative">
              <Label>סיסמה / טוקן</Label>
              <div className="relative mt-1">
                <Input
                  type={showPasswords["form-pw"] ? "text" : "password"}
                  value={form.password}
                  onChange={e => setField("password", e.target.value)}
                />
                <Button
                  variant="ghost" size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => toggleShow("form-pw")}
                  type="button"
                >
                  {showPasswords["form-pw"] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div className="relative">
              <Label>API Key (אופציונלי)</Label>
              <div className="relative mt-1">
                <Input
                  type={showPasswords["form-api"] ? "text" : "password"}
                  value={form.api_key}
                  onChange={e => setField("api_key", e.target.value)}
                />
                <Button
                  variant="ghost" size="icon"
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => toggleShow("form-api")}
                  type="button"
                >
                  {showPasswords["form-api"] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            <div><Label>הערות</Label><Textarea className="mt-1" value={form.notes} onChange={e => setField("notes", e.target.value)} placeholder="הערות נוספות..." /></div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={createAccount.isPending || updateAccount.isPending}>
              {(createAccount.isPending || updateAccount.isPending) ? "שומר..." : editId ? "שמור שינויים" : "הוסף חשבון"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת חשבון</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
