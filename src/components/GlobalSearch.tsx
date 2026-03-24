import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, FolderGit2, Users, Plug, FileText, Globe, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProjects, useAccounts, useServiceConnections, useFolders } from "@/hooks/use-data";
import { useNavigate } from "react-router-dom";

interface SearchResult {
  id: string;
  type: "project" | "account" | "connection" | "folder";
  title: string;
  subtitle?: string;
  path: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const { data: projects } = useProjects();
  const { data: accounts } = useAccounts();
  const { data: connections } = useServiceConnections();
  const { data: folders } = useFolders();

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const items: SearchResult[] = [];

    (projects || []).forEach((p: any) => {
      if (p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.language?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)) {
        items.push({ id: p.id, type: "project", title: p.name, subtitle: `${p.language || ""} • ${p.platform}`, path: `/projects/${p.id}` });
      }
    });

    (accounts || []).forEach((a: any) => {
      if (a.service_name?.toLowerCase().includes(q) || a.username?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q)) {
        items.push({ id: a.id, type: "account", title: a.service_name, subtitle: a.username || a.email || "", path: "/accounts" });
      }
    });

    (connections || []).forEach((c: any) => {
      if (c.service_name?.toLowerCase().includes(q) || c.provider?.toLowerCase().includes(q)) {
        items.push({ id: c.id, type: "connection", title: c.service_name, subtitle: `${c.provider} • ${c.service_category}`, path: "/services" });
      }
    });

    (folders || []).forEach((f: any) => {
      if (f.name?.toLowerCase().includes(q)) {
        items.push({ id: f.id, type: "folder", title: f.name, subtitle: "תיקייה", path: "/folders" });
      }
    });

    return items.slice(0, 15);
  }, [query, projects, accounts, connections, folders]);

  const typeIcons: Record<string, typeof FolderGit2> = {
    project: FolderGit2,
    account: Users,
    connection: Plug,
    folder: FileText,
  };

  const typeLabels: Record<string, string> = {
    project: "פרויקט",
    account: "חשבון",
    connection: "חיבור",
    folder: "תיקייה",
  };

  const typeColors: Record<string, string> = {
    project: "bg-accent/10 text-accent",
    account: "bg-primary/10 text-primary",
    connection: "bg-green-100 text-green-700",
    folder: "bg-amber-100 text-amber-700",
  };

  const handleSelect = useCallback((result: SearchResult) => {
    navigate(result.path);
    setOpen(false);
    setQuery("");
  }, [navigate]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-input bg-background text-muted-foreground text-sm hover:bg-secondary transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">חיפוש...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-mono">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 max-w-lg" dir="rtl">
          <div className="flex items-center border-b border-border px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפש פרויקטים, חשבונות, חיבורים..."
              className="border-0 focus-visible:ring-0 shadow-none text-sm"
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {!query.trim() ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>הקלד לחיפוש בכל האפליקציה</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <p>לא נמצאו תוצאות עבור "{query}"</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {results.map((result) => {
                  const Icon = typeIcons[result.type];
                  return (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary transition-colors text-right"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeColors[result.type]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{result.title}</p>
                        {result.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">{typeLabels[result.type]}</Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
