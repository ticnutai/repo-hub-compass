import { useParams, Link } from "react-router-dom";
import { ArrowRight, Github, Monitor, Plus, Bug, RefreshCw, Rocket, HardDrive, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockProjects, mockChangeLogs, mockBackups, mockAccounts, statusLabels, changeTypeLabels } from "@/data/mock-data";
import { useState } from "react";

const changeTypeIcons = { feature: Plus, fix: Bug, update: RefreshCw, deploy: Rocket };

export default function ProjectDetail() {
  const { id } = useParams();
  const project = mockProjects.find((p) => p.id === id);
  const changes = mockChangeLogs.filter((c) => c.projectId === id);
  const backups = mockBackups.filter((b) => b.projectId === id);
  const linkedAccounts = mockAccounts.filter((a) => a.linkedProjects.includes(id || ""));
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  if (!project) {
    return (
      <div className="text-center py-16" dir="rtl">
        <p className="text-muted-foreground">פרויקט לא נמצא</p>
        <Link to="/projects" className="text-accent hover:underline mt-2 inline-block">חזור לפרויקטים</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/projects" className="hover:text-accent">פרויקטים</Link>
        <ArrowRight className="h-3 w-3 rotate-180" />
        <span className="text-foreground">{project.name}</span>
      </div>

      {/* Project Info */}
      <Card className="border-2 border-accent">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                {project.platform === "github" ? <Github className="h-5 w-5 text-accent" /> : <Monitor className="h-5 w-5 text-accent" />}
                <h2 className="text-2xl font-bold text-foreground">{project.name}</h2>
                <Badge variant="outline" className="border-accent text-accent">{statusLabels[project.status]}</Badge>
              </div>
              <p className="text-muted-foreground mb-4">{project.description}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>שפה: <strong className="text-foreground">{project.language}</strong></span>
                <span>קטגוריה: <strong className="text-foreground">{project.category}</strong></span>
                <span>נוצר: <strong className="text-foreground">{project.createdAt}</strong></span>
                <span>עודכן: <strong className="text-foreground">{project.lastUpdated}</strong></span>
              </div>
              {project.repoUrl && (
                <a href={project.repoUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 mt-3 text-sm text-accent hover:underline">
                  <ExternalLink className="h-3 w-3" /> פתח ב-GitHub
                </a>
              )}
              <div className="flex gap-2 mt-4">
                {project.tags.map(tag => <Badge key={tag} variant="outline" className="border-accent/50 text-accent">{tag}</Badge>)}
              </div>
            </div>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <HardDrive className="h-4 w-4 ml-2" /> גיבוי עכשיו
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Changelog */}
        <Card className="border-2 border-border">
          <CardHeader><CardTitle className="text-lg">לוג שינויים</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {changes.length === 0 && <p className="text-sm text-muted-foreground">אין שינויים עדיין</p>}
            {changes.map((log) => {
              const Icon = changeTypeIcons[log.type];
              return (
                <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary">
                  <Icon className="h-4 w-4 text-accent shrink-0" />
                  <div className="flex-1"><p className="text-sm">{log.description}</p><p className="text-xs text-muted-foreground">{log.date} • {changeTypeLabels[log.type]}</p></div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Linked Accounts */}
        <Card className="border-2 border-border">
          <CardHeader><CardTitle className="text-lg">חשבונות מקושרים</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {linkedAccounts.length === 0 && <p className="text-sm text-muted-foreground">אין חשבונות מקושרים</p>}
            {linkedAccounts.map((acc) => (
              <div key={acc.id} className="p-3 rounded-lg bg-secondary">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{acc.serviceName}</span>
                  <Badge variant="outline" className="text-xs">{acc.serviceType}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">משתמש: {acc.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">סיסמה:</span>
                  <span className="text-sm font-mono">{showPasswords[acc.id] ? acc.password : "••••••••"}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPasswords(s => ({ ...s, [acc.id]: !s[acc.id] }))}>
                    {showPasswords[acc.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Backups */}
      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">גיבויים</CardTitle></CardHeader>
        <CardContent>
          {backups.length === 0 && <p className="text-sm text-muted-foreground">אין גיבויים עדיין</p>}
          <div className="space-y-2">
            {backups.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-4 w-4 text-accent" />
                  <div>
                    <p className="text-sm">{b.date}</p>
                    <p className="text-xs text-muted-foreground">{b.size} • {b.type === 'auto' ? 'אוטומטי' : 'ידני'}</p>
                  </div>
                </div>
                <Badge variant={b.status === 'success' ? 'outline' : 'destructive'} className={b.status === 'success' ? 'border-green-300 text-green-700' : ''}>
                  {b.status === 'success' ? 'הצליח' : 'נכשל'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
