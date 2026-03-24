import { useState, useEffect, useMemo } from "react";
import { Github, Loader2, Check, Search, GitBranch, Lock, Globe, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProject, useProfile } from "@/hooks/use-data";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GitHubBranch {
  name: string;
  protected: boolean;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  updated_at: string;
  topics: string[];
  private: boolean;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubImportDialog({ open, onOpenChange }: Props) {
  const { data: profile } = useProfile();
  const [token, setToken] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"token" | "select">("token");
  const createProject = useCreateProject();

  // Search & filter state
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [visFilter, setVisFilter] = useState<"all" | "public" | "private">("all");

  // Branch details
  const [branches, setBranches] = useState<Record<number, GitHubBranch[]>>({});
  const [loadingBranches, setLoadingBranches] = useState<Set<number>>(new Set());
  const [expandedRepo, setExpandedRepo] = useState<number | null>(null);

  const savedToken = profile?.github_token;

  useEffect(() => {
    if (open && savedToken && step === "token" && repos.length === 0) {
      fetchRepos(savedToken);
    }
  }, [open, savedToken]);

  const fetchRepos = async (useToken?: string) => {
    const t = useToken || token.trim();
    if (!t) return;
    setLoading(true);
    try {
      const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
        headers: { Authorization: `Bearer ${t}`, Accept: "application/vnd.github.v3+json" },
      });
      if (!res.ok) throw new Error("טוקן לא תקין או שגיאת API");
      const data: GitHubRepo[] = await res.json();
      setRepos(data);
      setStep("select");
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const fetchBranches = async (repo: GitHubRepo) => {
    const t = savedToken || token.trim();
    if (!t || branches[repo.id]) {
      setExpandedRepo(expandedRepo === repo.id ? null : repo.id);
      return;
    }
    setLoadingBranches((prev) => new Set(prev).add(repo.id));
    try {
      const res = await fetch(`https://api.github.com/repos/${repo.full_name}/branches?per_page=30`, {
        headers: { Authorization: `Bearer ${t}`, Accept: "application/vnd.github.v3+json" },
      });
      if (res.ok) {
        const data = await res.json();
        setBranches((prev) => ({ ...prev, [repo.id]: data }));
      }
    } catch { /* silent */ }
    setLoadingBranches((prev) => {
      const next = new Set(prev);
      next.delete(repo.id);
      return next;
    });
    setExpandedRepo(repo.id);
  };

  const toggleRepo = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Unique languages for filter
  const languages = useMemo(() => {
    const langs = new Set(repos.map((r) => r.language).filter(Boolean) as string[]);
    return Array.from(langs).sort();
  }, [repos]);

  // Filtered repos
  const filteredRepos = useMemo(() => {
    return repos.filter((r) => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.description?.toLowerCase().includes(search.toLowerCase()) ||
        r.topics?.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchLang = langFilter === "all" || r.language === langFilter;
      const matchVis =
        visFilter === "all" ||
        (visFilter === "private" && r.private) ||
        (visFilter === "public" && !r.private);
      return matchSearch && matchLang && matchVis;
    });
  }, [repos, search, langFilter, visFilter]);

  const importSelected = async () => {
    setImporting(true);
    const toImport = repos.filter((r) => selected.has(r.id));
    let success = 0;
    for (const repo of toImport) {
      try {
        await createProject.mutateAsync({
          name: repo.name,
          description: repo.description || "",
          platform: "github",
          language: repo.language || "",
          tags: repo.topics?.slice(0, 5) || [],
          repo_url: repo.html_url,
        });
        success++;
      } catch { /* skip */ }
    }
    toast.success(`${success} פרויקטים יובאו בהצלחה!`);
    setImporting(false);
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setStep("token");
    setSelected(new Set());
    setRepos([]);
    setSearch("");
    setLangFilter("all");
    setVisFilter("all");
    setBranches({});
    setExpandedRepo(null);
  };

  const handleClose = (val: boolean) => {
    if (!val) resetState();
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent dir="rtl" className="border-2 border-accent max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Github className="h-5 w-5" /> ייבוא מ-GitHub
          </DialogTitle>
        </DialogHeader>

        {step === "token" && !loading && (
          <div className="space-y-4 mt-2">
            {savedToken ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">טוען רפוזיטוריים עם הטוקן השמור...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  הזן GitHub Personal Access Token כדי לטעון את הרפוזיטוריים שלך.{" "}
                  <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" className="text-accent hover:underline">
                    צור טוקן חדש
                  </a>
                </p>
                <div>
                  <Label>GitHub Token</Label>
                  <Input className="mt-1 font-mono text-sm" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" />
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => fetchRepos()} disabled={!token.trim()}>
                  טען רפוזיטוריים
                </Button>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">טוען רפוזיטוריים...</p>
          </div>
        )}

        {step === "select" && !loading && (
          <div className="space-y-3 mt-2">
            {/* Search & Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pr-9 text-sm"
                  placeholder="חפש לפי שם, תיאור או תגית..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={langFilter} onValueChange={setLangFilter}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <Filter className="h-3 w-3 ml-1" />
                    <SelectValue placeholder="שפה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל השפות</SelectItem>
                    {languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={visFilter} onValueChange={(v) => setVisFilter(v as any)}>
                  <SelectTrigger className="flex-1 h-8 text-xs">
                    <SelectValue placeholder="נראות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="public">ציבורי</SelectItem>
                    <SelectItem value="private">פרטי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results header */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                מציג {filteredRepos.length} מתוך {repos.length} רפוזיטוריים
                {selected.size > 0 && <span className="text-accent font-medium"> • {selected.size} נבחרו</span>}
              </p>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => {
                const filteredIds = new Set(filteredRepos.map((r) => r.id));
                const allFilteredSelected = filteredRepos.every((r) => selected.has(r.id));
                if (allFilteredSelected) {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    filteredIds.forEach((id) => next.delete(id));
                    return next;
                  });
                } else {
                  setSelected((prev) => new Set([...prev, ...filteredIds]));
                }
              }}>
                {filteredRepos.every((r) => selected.has(r.id)) ? "בטל הכל" : "בחר הכל"}
              </Button>
            </div>

            {/* Repo list */}
            <div className="h-[320px] border border-accent/30 rounded-lg overflow-y-auto">
              <div className="p-1.5 space-y-0.5">
                {filteredRepos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Search className="h-8 w-8 mb-2 opacity-40" />
                    <p className="text-sm">לא נמצאו רפוזיטוריים תואמים</p>
                  </div>
                ) : (
                  filteredRepos.map((repo) => (
                    <div key={repo.id} className="rounded-lg border border-transparent hover:border-accent/20 hover:bg-secondary/50 transition-colors">
                      <label className="flex items-start gap-3 p-2.5 cursor-pointer">
                        <Checkbox checked={selected.has(repo.id)} onCheckedChange={() => toggleRepo(repo.id)} className="mt-1" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-primary truncate">{repo.name}</span>
                            {repo.private ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                                <Lock className="h-2.5 w-2.5" /> פרטי
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 text-green-600 border-green-300">
                                <Globe className="h-2.5 w-2.5" /> ציבורי
                              </Badge>
                            )}
                            {repo.stargazers_count > 0 && (
                              <span className="text-[10px] text-muted-foreground">⭐ {repo.stargazers_count}</span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{repo.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {repo.language && (
                              <span className="text-xs text-accent font-medium">{repo.language}</span>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      fetchBranches(repo);
                                    }}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <GitBranch className="h-3 w-3" />
                                    <span>{repo.default_branch}</span>
                                    {loadingBranches.has(repo.id) && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">לחץ לצפייה בכל הבראנצ׳ים</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(repo.updated_at).toLocaleDateString("he-IL")}
                            </span>
                            {repo.forks_count > 0 && (
                              <span className="text-[10px] text-muted-foreground">🍴 {repo.forks_count}</span>
                            )}
                          </div>
                          {/* Branches expansion */}
                          {expandedRepo === repo.id && branches[repo.id] && (
                            <div className="mt-2 p-2 bg-secondary/80 rounded-md border border-accent/10" onClick={(e) => e.preventDefault()}>
                              <p className="text-[10px] font-medium text-primary mb-1.5 flex items-center gap-1">
                                <GitBranch className="h-3 w-3" />
                                {branches[repo.id].length} בראנצ׳ים:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {branches[repo.id].map((b) => (
                                  <Badge
                                    key={b.name}
                                    variant={b.name === repo.default_branch ? "default" : "outline"}
                                    className={`text-[10px] px-1.5 py-0 ${
                                      b.name === repo.default_branch
                                        ? "bg-accent text-accent-foreground"
                                        : ""
                                    }`}
                                  >
                                    {b.name}
                                    {b.protected && " 🔒"}
                                    {b.name === repo.default_branch && " ★"}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setStep("token"); setRepos([]); }}>
                חזור
              </Button>
              <Button
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={importSelected}
                disabled={selected.size === 0 || importing}
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin ml-2" /> מייבא...</>
                ) : (
                  <><Check className="h-4 w-4 ml-2" /> ייבא {selected.size} פרויקטים</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
