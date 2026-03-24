import { useState, useRef } from "react";
import {
  Plus, Search, Eye, EyeOff, Pencil, Trash2, Upload, Copy, Check, X,
  Cloud, MessageSquare, Database, Phone, Shield, Globe, Server, Zap,
  FileJson, TestTube, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useServiceConnections, useCreateServiceConnection, useUpdateServiceConnection, useDeleteServiceConnection } from "@/hooks/use-data";
import { toast } from "sonner";

// Service categories with icons
const categories = [
  { id: "cloud", label: "ענן", icon: Cloud },
  { id: "messaging", label: "הודעות", icon: MessageSquare },
  { id: "storage", label: "אחסון", icon: Database },
  { id: "voice", label: "קול/AI", icon: Phone },
  { id: "auth", label: "אימות", icon: Shield },
  { id: "hosting", label: "אירוח", icon: Globe },
  { id: "api", label: "API כללי", icon: Server },
  { id: "other", label: "אחר", icon: Zap },
];

// Service templates
const serviceTemplates = [
  { name: "Google Cloud Platform", category: "cloud", provider: "google", fields: ["project_id", "client_email", "private_key", "token_uri"] },
  { name: "AWS", category: "cloud", provider: "aws", fields: ["access_key_id", "secret_access_key", "region"] },
  { name: "Azure", category: "cloud", provider: "azure", fields: ["tenant_id", "client_id", "client_secret", "subscription_id"] },
  { name: "WhatsApp Business", category: "messaging", provider: "whatsapp", fields: ["phone_number_id", "access_token", "verify_token", "webhook_url"] },
  { name: "Twilio", category: "messaging", provider: "twilio", fields: ["account_sid", "auth_token", "phone_number"] },
  { name: "Telegram Bot", category: "messaging", provider: "telegram", fields: ["bot_token", "chat_id"] },
  { name: "SendGrid", category: "messaging", provider: "sendgrid", fields: ["api_key", "from_email", "from_name"] },
  { name: "Google Cloud Storage", category: "storage", provider: "gcs", fields: ["bucket_name", "project_id", "service_account_key"] },
  { name: "AWS S3", category: "storage", provider: "s3", fields: ["bucket", "access_key_id", "secret_access_key", "region"] },
  { name: "Cloudflare R2", category: "storage", provider: "r2", fields: ["account_id", "access_key_id", "secret_access_key", "bucket"] },
  { name: "Firebase", category: "cloud", provider: "firebase", fields: ["project_id", "api_key", "auth_domain", "messaging_sender_id"] },
  { name: "OpenAI", category: "voice", provider: "openai", fields: ["api_key", "organization_id"] },
  { name: "ElevenLabs", category: "voice", provider: "elevenlabs", fields: ["api_key", "voice_id"] },
  { name: "Google TTS", category: "voice", provider: "google_tts", fields: ["api_key", "project_id"] },
  { name: "Stripe", category: "api", provider: "stripe", fields: ["secret_key", "publishable_key", "webhook_secret"] },
  { name: "Vercel", category: "hosting", provider: "vercel", fields: ["token", "team_id"] },
  { name: "Netlify", category: "hosting", provider: "netlify", fields: ["access_token", "site_id"] },
  { name: "Auth0", category: "auth", provider: "auth0", fields: ["domain", "client_id", "client_secret"] },
  { name: "Supabase", category: "cloud", provider: "supabase", fields: ["url", "anon_key", "service_role_key"] },
  { name: "Cloudflare", category: "hosting", provider: "cloudflare", fields: ["api_token", "zone_id", "account_id"] },
  { name: "Domain/DNS", category: "hosting", provider: "dns", fields: ["domain", "registrar", "nameservers", "api_key"] },
  { name: "Custom API", category: "api", provider: "custom", fields: ["base_url", "api_key", "auth_header"] },
];

const fieldLabels: Record<string, string> = {
  project_id: "Project ID",
  client_email: "Client Email",
  private_key: "Private Key",
  token_uri: "Token URI",
  access_key_id: "Access Key ID",
  secret_access_key: "Secret Access Key",
  region: "Region",
  tenant_id: "Tenant ID",
  client_id: "Client ID",
  client_secret: "Client Secret",
  subscription_id: "Subscription ID",
  phone_number_id: "Phone Number ID",
  access_token: "Access Token",
  verify_token: "Verify Token",
  webhook_url: "Webhook URL",
  account_sid: "Account SID",
  auth_token: "Auth Token",
  phone_number: "Phone Number",
  bot_token: "Bot Token",
  chat_id: "Chat ID",
  api_key: "API Key",
  from_email: "From Email",
  from_name: "From Name",
  bucket_name: "Bucket Name",
  service_account_key: "Service Account Key (JSON)",
  bucket: "Bucket",
  account_id: "Account ID",
  api_key_id: "API Key ID",
  auth_domain: "Auth Domain",
  messaging_sender_id: "Messaging Sender ID",
  organization_id: "Organization ID",
  voice_id: "Voice ID",
  secret_key: "Secret Key",
  publishable_key: "Publishable Key",
  webhook_secret: "Webhook Secret",
  token: "Token",
  team_id: "Team ID",
  site_id: "Site ID",
  domain: "Domain",
  url: "URL",
  anon_key: "Anon Key",
  service_role_key: "Service Role Key",
  zone_id: "Zone ID",
  api_token: "API Token",
  registrar: "Registrar",
  nameservers: "Nameservers",
  base_url: "Base URL",
  auth_header: "Auth Header",
};

// Detect if a field should be treated as secret
const isSecretField = (field: string) =>
  /key|secret|token|password|private|sid/i.test(field);

// Parse JSON service account or config file
function parseServiceFile(content: string): { services: any[]; error?: string } {
  try {
    const json = JSON.parse(content);

    // Google service account format
    if (json.type === "service_account" && json.project_id) {
      return {
        services: [{
          service_name: `GCP - ${json.project_id}`,
          service_category: "cloud",
          provider: "google",
          connection_type: "service_account",
          credentials: {
            project_id: json.project_id,
            client_email: json.client_email,
            private_key: json.private_key,
            token_uri: json.token_uri,
          },
          config: { type: json.type, auth_uri: json.auth_uri },
        }],
      };
    }

    // Firebase config
    if (json.apiKey && json.authDomain && json.projectId) {
      return {
        services: [{
          service_name: `Firebase - ${json.projectId}`,
          service_category: "cloud",
          provider: "firebase",
          connection_type: "config",
          credentials: {
            api_key: json.apiKey,
            auth_domain: json.authDomain,
            project_id: json.projectId,
            messaging_sender_id: json.messagingSenderId,
          },
          config: { storageBucket: json.storageBucket, appId: json.appId },
        }],
      };
    }

    // AWS credentials format
    if (json.accessKeyId || json.aws_access_key_id) {
      return {
        services: [{
          service_name: "AWS",
          service_category: "cloud",
          provider: "aws",
          connection_type: "api_key",
          credentials: {
            access_key_id: json.accessKeyId || json.aws_access_key_id,
            secret_access_key: json.secretAccessKey || json.aws_secret_access_key,
            region: json.region || json.aws_default_region || "",
          },
        }],
      };
    }

    // Generic array of services
    if (Array.isArray(json)) {
      return {
        services: json.map(item => ({
          service_name: item.name || item.service_name || item.service || "Imported Service",
          service_category: item.category || item.service_category || "other",
          provider: item.provider || "",
          connection_type: item.connection_type || "api_key",
          credentials: item.credentials || item,
          config: item.config || {},
          notes: item.notes || "",
        })),
      };
    }

    // Generic single object — store all as credentials
    return {
      services: [{
        service_name: json.name || json.service || "Imported Config",
        service_category: "other",
        provider: "",
        connection_type: "config",
        credentials: json,
      }],
    };
  } catch {
    return { services: [], error: "קובץ JSON לא תקין" };
  }
}

export default function Services() {
  const { data: connections, isLoading } = useServiceConnections();
  const createConnection = useCreateServiceConnection();
  const updateConnection = useUpdateServiceConnection();
  const deleteConnection = useDeleteServiceConnection();

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("other");
  const [formProvider, setFormProvider] = useState("");
  const [formType, setFormType] = useState("api_key");
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [formNotes, setFormNotes] = useState("");
  const [formFields, setFormFields] = useState<string[]>([]);
  // Custom field
  const [customFieldName, setCustomFieldName] = useState("");

  const filtered = (connections || []).filter(c => {
    const matchSearch = c.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.provider.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === "all" || c.service_category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const getCategoryIcon = (cat: string) => {
    const found = categories.find(c => c.id === cat);
    return found?.icon || Zap;
  };

  const getCategoryLabel = (cat: string) => {
    return categories.find(c => c.id === cat)?.label || cat;
  };

  const resetForm = () => {
    setSelectedTemplate("");
    setFormName("");
    setFormCategory("other");
    setFormProvider("");
    setFormType("api_key");
    setFormCredentials({});
    setFormNotes("");
    setFormFields([]);
    setEditId(null);
    setCustomFieldName("");
  };

  const applyTemplate = (templateName: string) => {
    const tpl = serviceTemplates.find(t => t.name === templateName);
    if (!tpl) return;
    setSelectedTemplate(templateName);
    setFormName(tpl.name);
    setFormCategory(tpl.category);
    setFormProvider(tpl.provider);
    setFormFields(tpl.fields);
    setFormCredentials({});
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (conn: any) => {
    setEditId(conn.id);
    setFormName(conn.service_name);
    setFormCategory(conn.service_category);
    setFormProvider(conn.provider);
    setFormType(conn.connection_type);
    setFormCredentials(conn.credentials || {});
    setFormNotes(conn.notes || "");
    setFormFields(Object.keys(conn.credentials || {}));
    setDialogOpen(true);
  };

  const addCustomField = () => {
    const key = customFieldName.trim().toLowerCase().replace(/\s+/g, "_");
    if (!key || formFields.includes(key)) return;
    setFormFields(prev => [...prev, key]);
    setCustomFieldName("");
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    try {
      const payload = {
        service_name: formName,
        service_category: formCategory,
        provider: formProvider,
        connection_type: formType,
        credentials: formCredentials,
        config: {},
        notes: formNotes,
      };
      if (editId) {
        await updateConnection.mutateAsync({ id: editId, ...payload });
        toast.success("חיבור עודכן בהצלחה!");
      } else {
        await createConnection.mutateAsync(payload);
        toast.success("חיבור נוסף בהצלחה!");
      }
      setDialogOpen(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteConnection.mutateAsync(deleteId);
      toast.success("חיבור נמחק!");
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    let totalImported = 0;
    for (const file of Array.from(files)) {
      const content = await file.text();
      const { services, error } = parseServiceFile(content);
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }
      for (const svc of services) {
        try {
          await createConnection.mutateAsync({
            service_name: svc.service_name,
            service_category: svc.service_category || "other",
            provider: svc.provider || "",
            connection_type: svc.connection_type || "config",
            credentials: svc.credentials || {},
            config: svc.config || {},
            notes: svc.notes || `Imported from ${file.name}`,
          });
          totalImported++;
        } catch { /* skip */ }
      }
    }
    toast.success(`${totalImported} חיבורים יובאו בהצלחה!`);
    setImportOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleSecret = (key: string) => setShowSecrets(s => ({ ...s, [key]: !s[key] }));

  const copyValue = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success("הועתק!");
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-foreground">ניהול חיבורים ושירותים</h2>
        <div className="flex gap-2">
          <Dialog open={importOpen} onOpenChange={setImportOpen}>
            <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" onClick={() => setImportOpen(true)}>
              <FileJson className="h-4 w-4 ml-2" /> ייבוא מקובץ
            </Button>
            <DialogContent dir="rtl" className="border-2 border-accent">
              <DialogHeader><DialogTitle className="flex items-center gap-2"><FileJson className="h-5 w-5" /> ייבוא חיבורים מקובץ</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">העלה קבצי JSON של חיבורים ושירותים. המערכת תזהה אוטומטית:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-secondary rounded-md border"><p className="font-medium text-primary">Google Service Account</p><p className="text-muted-foreground">קבצי .json מ-GCP Console</p></div>
                  <div className="p-2 bg-secondary rounded-md border"><p className="font-medium text-primary">Firebase Config</p><p className="text-muted-foreground">firebaseConfig object</p></div>
                  <div className="p-2 bg-secondary rounded-md border"><p className="font-medium text-primary">AWS Credentials</p><p className="text-muted-foreground">accessKeyId / secretAccessKey</p></div>
                  <div className="p-2 bg-secondary rounded-md border"><p className="font-medium text-primary">JSON כללי</p><p className="text-muted-foreground">כל קובץ JSON עם פרטי חיבור</p></div>
                </div>
                <input ref={fileInputRef} type="file" multiple accept=".json" onChange={handleFileImport} className="hidden" />
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 ml-2" /> בחר קבצים
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={openCreate}>
            <Plus className="h-4 w-4 ml-2" /> חיבור חדש
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חפש חיבור..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10" />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקטגוריות</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Category summary chips */}
      {!isLoading && connections && connections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => {
            const count = connections.filter(c => c.service_category === cat.id).length;
            if (count === 0) return null;
            const Icon = cat.icon;
            return (
              <Badge
                key={cat.id}
                variant={categoryFilter === cat.id ? "default" : "outline"}
                className="cursor-pointer px-3 py-1 gap-1.5"
                onClick={() => setCategoryFilter(categoryFilter === cat.id ? "all" : cat.id)}
              >
                <Icon className="h-3 w-3" /> {cat.label} ({count})
              </Badge>
            );
          })}
        </div>
      )}

      {/* Connection cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((conn) => {
            const Icon = getCategoryIcon(conn.service_category);
            const isExpanded = expandedId === conn.id;
            const creds = (conn.credentials || {}) as Record<string, string>;
            const credKeys = Object.keys(creds);

            return (
              <Card key={conn.id} className="border-2 border-border hover:border-accent transition-colors group">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="truncate block">{conn.service_name}</span>
                      <span className="text-xs text-muted-foreground font-normal">{conn.provider}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">{getCategoryLabel(conn.service_category)}</Badge>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <TooltipProvider>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(conn)}><Pencil className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>ערוך</TooltipContent></Tooltip>
                        <Tooltip><TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(conn.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </TooltipTrigger><TooltipContent>מחק</TooltipContent></Tooltip>
                      </TooltipProvider>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Show first 2 credential fields, rest collapsed */}
                  {credKeys.slice(0, isExpanded ? credKeys.length : 2).map(key => {
                    const val = String(creds[key] || "");
                    const secret = isSecretField(key);
                    const showKey = `${conn.id}-${key}`;
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground text-xs shrink-0 min-w-[70px]">{fieldLabels[key] || key}:</span>
                        <span className="font-mono text-xs truncate max-w-[120px]">
                          {secret && !showSecrets[showKey] ? "••••••••" : val.length > 30 ? val.slice(0, 30) + "..." : val}
                        </span>
                        <div className="flex gap-0.5 mr-auto shrink-0">
                          {secret && (
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => toggleSecret(showKey)}>
                              {showSecrets[showKey] ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyValue(val)}>
                            <Copy className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {credKeys.length > 2 && (
                    <Button variant="ghost" size="sm" className="w-full text-xs h-6" onClick={() => setExpandedId(isExpanded ? null : conn.id)}>
                      {isExpanded ? <><ChevronUp className="h-3 w-3 ml-1" /> הסתר</> : <><ChevronDown className="h-3 w-3 ml-1" /> עוד {credKeys.length - 2} שדות</>}
                    </Button>
                  )}
                  {conn.notes && <p className="text-xs text-muted-foreground italic line-clamp-2">{conn.notes}</p>}
                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <Badge variant={conn.status === "active" ? "outline" : "secondary"} className={conn.status === "active" ? "border-green-300 text-green-700 text-[10px]" : "text-[10px]"}>
                      {conn.status === "active" ? "פעיל" : conn.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{new Date(conn.created_at).toLocaleDateString("he-IL")}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">אין חיבורים עדיין</p>
          <p className="text-sm text-muted-foreground mt-1">הוסף חיבורים לשירותים שלך כמו Google Cloud, WhatsApp, אחסון ועוד</p>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent dir="rtl" className="border-2 border-accent max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "עריכת חיבור" : "הוסף חיבור חדש"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Template selector (only for new) */}
            {!editId && (
              <div>
                <Label>בחר שירות מוכר (אופציונלי)</Label>
                <Select value={selectedTemplate} onValueChange={applyTemplate}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="בחר תבנית..." /></SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    {categories.map(cat => {
                      const tpls = serviceTemplates.filter(t => t.category === cat.id);
                      if (tpls.length === 0) return null;
                      return tpls.map(t => (
                        <SelectItem key={t.name} value={t.name}>
                          {cat.label} — {t.name}
                        </SelectItem>
                      ));
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div><Label>שם החיבור</Label><Input className="mt-1" value={formName} onChange={e => setFormName(e.target.value)} placeholder="Google Cloud - פרויקט ראשי" /></div>
              <div><Label>קטגוריה</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><Label>ספק (Provider)</Label><Input className="mt-1" value={formProvider} onChange={e => setFormProvider(e.target.value)} placeholder="google, aws..." /></div>
              <div><Label>סוג חיבור</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api_key">API Key</SelectItem>
                    <SelectItem value="oauth">OAuth</SelectItem>
                    <SelectItem value="service_account">Service Account</SelectItem>
                    <SelectItem value="token">Token</SelectItem>
                    <SelectItem value="config">Config File</SelectItem>
                    <SelectItem value="credentials">Username/Password</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Credential fields */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">פרטי גישה</Label>
              {formFields.map(field => (
                <div key={field} className="relative">
                  <Label className="text-xs">{fieldLabels[field] || field}</Label>
                  <div className="relative mt-0.5">
                    <Input
                      type={isSecretField(field) && !showSecrets[`form-${field}`] ? "password" : "text"}
                      value={formCredentials[field] || ""}
                      onChange={e => setFormCredentials(prev => ({ ...prev, [field]: e.target.value }))}
                      className="text-sm pr-2 pl-16"
                      placeholder={fieldLabels[field] || field}
                    />
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                      {isSecretField(field) && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" type="button" onClick={() => toggleSecret(`form-${field}`)}>
                          {showSecrets[`form-${field}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" type="button" onClick={() => {
                        setFormFields(prev => prev.filter(f => f !== field));
                        setFormCredentials(prev => { const n = { ...prev }; delete n[field]; return n; });
                      }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add custom field */}
              <div className="flex gap-2">
                <Input
                  className="text-sm flex-1"
                  placeholder="שם שדה חדש..."
                  value={customFieldName}
                  onChange={e => setCustomFieldName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCustomField()}
                />
                <Button variant="outline" size="sm" onClick={addCustomField} disabled={!customFieldName.trim()}>
                  <Plus className="h-3 w-3 ml-1" /> הוסף שדה
                </Button>
              </div>
            </div>

            <div><Label>הערות</Label><Textarea className="mt-1" value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="הערות נוספות..." /></div>

            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={createConnection.isPending || updateConnection.isPending}>
              {(createConnection.isPending || updateConnection.isPending) ? "שומר..." : editId ? "שמור שינויים" : "הוסף חיבור"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת חיבור</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח? פעולה זו אינה ניתנת לביטול.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
