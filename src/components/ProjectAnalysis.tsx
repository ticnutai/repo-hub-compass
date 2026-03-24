import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectLinks, useProjectServices, useProjectEnvVars } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ScanSearch, Loader2, Globe, Github, Star, GitFork, HardDrive, GitBranch,
  FileText, Terminal, Package, Tag, Code, User, ExternalLink, Eye, EyeOff,
  Database, Shield, CreditCard, Palette, Server, Mail, Brain, BarChart,
  Layers, Zap, CheckCircle, AlertTriangle, Navigation, Radio, Phone, Cloud,
  BookOpen, AlertCircle,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  github: Github, globe: Globe, star: Star, "git-fork": GitFork,
  "hard-drive": HardDrive, "git-branch": GitBranch, "file-text": FileText,
  terminal: Terminal, package: Package, tag: Tag, code: Code, user: User,
  database: Database, shield: Shield, "credit-card": CreditCard, palette: Palette,
  server: Server, mail: Mail, brain: Brain, "bar-chart": BarChart, layers: Layers,
  zap: Zap, "check-circle": CheckCircle, "alert-triangle": AlertTriangle,
  navigation: Navigation, radio: Radio, phone: Phone, cloud: Cloud,
  book: BookOpen, "alert-circle": AlertCircle,
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  framework: "פריימוורק", backend: "בקאנד", database: "מסד נתונים", orm: "ORM",
  auth: "אימות", payment: "תשלומים", styling: "עיצוב", http: "HTTP",
  server: "שרת", realtime: "Realtime", cache: "Cache", cloud: "ענן",
  storage: "אחסון", email: "אימייל", sms: "SMS", ai: "בינה מלאכותית",
  analytics: "אנליטיקס", routing: "ניווט", build: "Build", testing: "טסטים",
  devops: "DevOps", monitoring: "ניטור", linting: "Linting", formatting: "Formatting",
  language: "שפה", hosting: "אירוח", "ci-cd": "CI/CD", dependency: "תלות",
};

const SERVICE_TYPE_COLORS: Record<string, string> = {
  framework: "border-blue-300 text-blue-700 bg-blue-50",
  backend: "border-green-300 text-green-700 bg-green-50",
  database: "border-purple-300 text-purple-700 bg-purple-50",
  orm: "border-purple-300 text-purple-700 bg-purple-50",
  auth: "border-red-300 text-red-700 bg-red-50",
  payment: "border-yellow-300 text-yellow-700 bg-yellow-50",
  styling: "border-pink-300 text-pink-700 bg-pink-50",
  build: "border-orange-300 text-orange-700 bg-orange-50",
  testing: "border-teal-300 text-teal-700 bg-teal-50",
  devops: "border-gray-300 text-gray-700 bg-gray-50",
  hosting: "border-indigo-300 text-indigo-700 bg-indigo-50",
  ai: "border-violet-300 text-violet-700 bg-violet-50",
};

interface Props {
  projectId: string;
  isGithub: boolean;
}

export function ProjectAnalysis({ projectId, isGithub }: Props) {
  const { data: links, isLoading: linksLoading } = useProjectLinks(projectId);
  const { data: services, isLoading: servicesLoading } = useProjectServices(projectId);
  const { data: envVars, isLoading: envLoading } = useProjectEnvVars(projectId);
  const [analyzing, setAnalyzing] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");

      const projectId_ = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId_}.supabase.co/functions/v1/analyze-project`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ project_id: projectId }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "שגיאה בניתוח");
      toast.success(`ניתוח הושלם! ${result.links_found} לינקים, ${result.services_found} שירותים, ${result.env_vars_found} משתני סביבה`);
      queryClient.invalidateQueries({ queryKey: ["project_links"] });
      queryClient.invalidateQueries({ queryKey: ["project_services"] });
      queryClient.invalidateQueries({ queryKey: ["project_env_vars"] });
    } catch (e: any) {
      toast.error(e.message);
    }
    setAnalyzing(false);
  };

  const isLoading = linksLoading || servicesLoading || envLoading;
  const hasData = (links && links.length > 0) || (services && services.length > 0) || (envVars && envVars.length > 0);

  // Group links by type
  const urlLinks = links?.filter(l => l.url && ["repo", "website", "wiki", "issues"].includes(l.link_type)) || [];
  const infoLinks = links?.filter(l => l.link_type === "info") || [];
  const scriptLinks = links?.filter(l => l.link_type === "script") || [];
  const contributors = links?.filter(l => l.link_type === "contributor") || [];
  const languages = links?.filter(l => l.link_type === "language") || [];

  // Group services by type
  const servicesByType: Record<string, typeof services> = {};
  services?.forEach(s => {
    const type = s.service_type;
    if (!servicesByType[type]) servicesByType[type] = [];
    servicesByType[type]!.push(s);
  });

  return (
    <div className="space-y-4">
      {isGithub && (
        <Button
          className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={handleAnalyze}
          disabled={analyzing}
          size="lg"
        >
          {analyzing ? (
            <><Loader2 className="h-5 w-5 animate-spin ml-2" /> מנתח פרויקט...</>
          ) : (
            <><ScanSearch className="h-5 w-5 ml-2" /> {hasData ? "נתח מחדש" : "נתח פרויקט"} - זהה שירותים, טכנולוגיות ולינקים</>
          )}
        </Button>
      )}

      {isLoading && <Skeleton className="h-40 w-full" />}

      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* URLs & Links */}
          {urlLinks.length > 0 && (
            <Card className="border-2 border-accent/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-accent" /> לינקים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {urlLinks.map((link) => {
                  const Icon = ICON_MAP[link.icon || "globe"] || Globe;
                  return (
                    <a
                      key={link.id}
                      href={link.url!}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors group"
                    >
                      <Icon className="h-4 w-4 text-accent shrink-0" />
                      <span className="text-sm font-medium flex-1">{link.label}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Repo Info */}
          {infoLinks.length > 0 && (
            <Card className="border-2 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-accent" /> מידע על הפרויקט
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {infoLinks.map((link) => {
                    const Icon = ICON_MAP[link.icon || "code"] || Code;
                    return (
                      <div key={link.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                        <Icon className="h-3.5 w-3.5 text-accent shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{link.label}</p>
                          <p className="text-sm font-medium truncate">{link.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Services & Technologies */}
          {services && services.length > 0 && (
            <Card className="border-2 border-accent/50 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-accent" /> טכנולוגיות ושירותים ({services.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(servicesByType).map(([type, typeServices]) => (
                    <div key={type}>
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">
                        {SERVICE_TYPE_LABELS[type] || type}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {typeServices!.map((s) => {
                          const details = s.details as Record<string, unknown> | null;
                          const iconName = (details?.icon as string) || "layers";
                          const Icon = ICON_MAP[iconName] || Layers;
                          const colorClass = SERVICE_TYPE_COLORS[type] || "border-border text-foreground bg-secondary/50";
                          return (
                            <Badge
                              key={s.id}
                              variant="outline"
                              className={`text-xs px-2 py-1 gap-1 ${colorClass}`}
                            >
                              <Icon className="h-3 w-3" />
                              {s.service_name}
                              {s.version && <span className="opacity-60">@{s.version.replace("^", "")}</span>}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <Card className="border-2 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code className="h-4 w-4 text-accent" /> שפות תכנות
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {languages.map((lang) => (
                    <div key={lang.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{lang.label}</span>
                      <span className="text-xs text-muted-foreground">{lang.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contributors */}
          {contributors.length > 0 && (
            <Card className="border-2 border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-accent" /> תורמים
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contributors.map((c) => (
                  <a
                    key={c.id}
                    href={c.url!}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <span className="text-sm font-medium">{c.label}</span>
                    <span className="text-xs text-muted-foreground">{c.value}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Environment Variables */}
          {envVars && envVars.length > 0 && (
            <Card className="border-2 border-accent/50 lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" /> משתני סביבה ({envVars.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {envVars.map((ev) => (
                    <div key={ev.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-secondary px-1.5 py-0.5 rounded">{ev.var_name}</code>
                        {ev.is_secret && <Badge variant="outline" className="text-xs border-red-200 text-red-600">סודי</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{ev.source_file}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Scripts */}
          {scriptLinks.length > 0 && (
            <Card className="border-2 border-border lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-accent" /> סקריפטים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {scriptLinks.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/30">
                      <code className="text-xs font-mono text-accent font-medium whitespace-nowrap">{s.label}</code>
                      <code className="text-xs font-mono text-muted-foreground truncate">{s.value}</code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!isLoading && !hasData && isGithub && (
        <div className="text-center py-8 text-muted-foreground">
          <ScanSearch className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">לחץ "נתח פרויקט" כדי לזהות טכנולוגיות, שירותים ולינקים</p>
        </div>
      )}
    </div>
  );
}
