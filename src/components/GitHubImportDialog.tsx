import { useState, useEffect, useMemo } from "react";
import { Github, Loader2, Check, Search, GitBranch, Lock, Globe, Filter, Plus, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProject, useProfile, useAccounts, useUpdateAccount, useLinkAccountToProject, useCreateAccount, useProjects } from "@/hooks/use-data";
import { supabase } from "@/integrations/supabase/client";
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
  preselectedAccountId?: string;
}

export function GitHubImportDialog({ open, onOpenChange, preselectedAccountId }: Props) {
  const { data: profile } = useProfile();
  const { data: accounts } = useAccounts();
  const { data: projects } = useProjects();
  const updateAccount = useUpdateAccount();
  const createAccount = useCreateAccount();
  const linkAccountToProject = useLinkAccountToProject();
  const [token, setToken] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(preselectedAccountId || "none");
  const [accountSyncDraft, setAccountSyncDraft] = useState<Record<string, { enabled: boolean; interval: number; targetProjectId: string }>>({});
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newGithubUsername, setNewGithubUsername] = useState("");
  const [newGithubEmail, setNewGithubEmail] = useState("");
  const [newGithubToken, setNewGithubToken] = useState("");
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

  const githubAccounts = (accounts || []).filter((account: any) =>
    account.service_name?.toLowerCase().includes("github")
  );
  const githubProjects = (projects || []).filter((project: any) => project.platform === "github");
  const selectedAccount = selectedAccountId === "none"
    ? null
    : githubAccounts.find((account: any) => account.id === selectedAccountId) || null;
  const selectedAccountToken = selectedAccount?.api_key || selectedAccount?.password || "";
  const savedToken = selectedAccountToken || profile?.github_token || "";

  useEffect(() => {
    setSelectedAccountId(preselectedAccountId || "none");
  }, [preselectedAccountId]);

  useEffect(() => {
    const nextDraft: Record<string, { enabled: boolean; interval: number; targetProjectId: string }> = {};
    for (const account of githubAccounts as any[]) {
      nextDraft[account.id] = {
        enabled: !!account.github_auto_import_enabled,
        interval: Number(account.github_import_interval_minutes || 60),
        targetProjectId: account.github_target_project_id || "all",
      };
    }
    setAccountSyncDraft(nextDraft);
  }, [accounts]);

  const handleAddGithubAccount = async () => {
    if (!newGithubUsername.trim() || !newGithubToken.trim()) {
      toast.error("יש להזין שם משתמש וטוקן");
      return;
    }

    try {
      const created = await createAccount.mutateAsync({
        service_name: "GitHub",
        service_type: "קוד",
        username: newGithubUsername.trim(),
        email: newGithubEmail.trim() || undefined,
        api_key: newGithubToken.trim(),
        password: "",
        notes: "חשבון GitHub",
        github_auto_import_enabled: false,
        github_import_interval_minutes: 60,
        github_target_project_id: null,
      });

      if (created?.id) setSelectedAccountId(created.id);
      setNewGithubUsername("");
      setNewGithubEmail("");
      setNewGithubToken("");
      setShowAddAccount(false);
      toast.success("חשבון GitHub נוסף בהצלחה");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateDraft = (accountId: string, patch: Partial<{ enabled: boolean; interval: number; targetProjectId: string }>) => {
    setAccountSyncDraft((prev) => ({
      ...prev,
      [accountId]: {
        enabled: prev[accountId]?.enabled ?? false,
        interval: prev[accountId]?.interval ?? 60,
        targetProjectId: prev[accountId]?.targetProjectId ?? "all",
        ...patch,
      },
    }));
  };

  const saveAccountSyncSettings = async (accountId: string) => {
    const draft = accountSyncDraft[accountId];
    if (!draft) return;

    try {
      await updateAccount.mutateAsync({
        id: accountId,
        github_auto_import_enabled: draft.enabled,
        github_import_interval_minutes: Math.max(5, Math.min(10080, Number(draft.interval || 60))),
        github_target_project_id: draft.targetProjectId === "all" ? null : draft.targetProjectId,
      });
      toast.success("הגדרות אוטו-ייבוא נשמרו לחשבון");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fetchRepos = async (useToken?: string) => {
    const t = useToken || token.trim();
    if (!t) return;
    setLoading(true);
    try {
      if (!useToken && selectedAccount && t && t !== selectedAccountToken) {
        await updateAccount.mutateAsync({ id: selectedAccount.id, api_key: t });
      }

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

  const autoAnalyze = async (projectId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const pid = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      await fetch(`https://${pid}.supabase.co/functions/v1/analyze-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ project_id: projectId }),
      });
    } catch { /* silent - analysis is best-effort */ }
  };

  const importSelected = async () => {
    setImporting(true);
    const toImport = repos.filter((r) => selected.has(r.id));
    let success = 0;
    const createdIds: string[] = [];
    for (const repo of toImport) {
      try {
        const result = await createProject.mutateAsync({
          name: repo.name,
          description: repo.description || "",
          platform: "github",
          language: repo.language || "",
          tags: repo.topics?.slice(0, 5) || [],
          repo_url: repo.html_url,
        });
        success++;
        if (result?.id) {
          createdIds.push(result.id);
          if (selectedAccount) {
            await linkAccountToProject.mutateAsync({ account_id: selectedAccount.id, project_id: result.id });
          }
        }
      } catch { /* skip */ }
    }
    toast.success(`${success} פרויקטים יובאו בהצלחה! מנתח אוטומטית...`);
    
    // Auto-analyze all imported projects in background
    for (const id of createdIds) {
      autoAnalyze(id);
    }
    
    setImporting(false);
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setStep("token");
    setSelected(new Set());
    setRepos([]);
    setToken("");
    setShowAddAccount(false);
    setNewGithubUsername("");
    setNewGithubEmail("");
    setNewGithubToken("");
    setSelectedAccountId(preselectedAccountId || "none");
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
            <Github className="h-5 w-5" /> GitHub
          </DialogTitle>
        </DialogHeader>

        {step === "token" && !loading && (
          <div className="space-y-4 mt-2">
            <div className="rounded-lg border border-accent/30 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">חשבונות GitHub</p>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setShowAddAccount((v) => !v)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {showAddAccount && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="שם משתמש"
                    value={newGithubUsername}
                    onChange={(e) => setNewGithubUsername(e.target.value)}
                  />
                  <Input
                    placeholder="אימייל (אופציונלי)"
                    value={newGithubEmail}
                    onChange={(e) => setNewGithubEmail(e.target.value)}
                  />
                  <Input
                    placeholder="ghp_xxx"
                    type="password"
                    value={newGithubToken}
                    onChange={(e) => setNewGithubToken(e.target.value)}
                  />
                  <div className="md:col-span-3 flex justify-end">
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleAddGithubAccount} disabled={createAccount.isPending}>
                      <Plus className="h-4 w-4 ml-2" /> הוסף חשבון GitHub
                    </Button>
                  </div>
                </div>
              )}

              {githubAccounts.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {githubAccounts.map((account: any) => {
                    const hasToken = !!(account.api_key || account.password);
                    const isActive = selectedAccountId === account.id;
                    const draft = accountSyncDraft[account.id] || { enabled: false, interval: 60, targetProjectId: "all" };
                    return (
                      <div
                        key={account.id}
                        className={`w-full text-right rounded-md border p-2 transition-colors ${isActive ? "border-accent bg-accent/10" : "border-border hover:border-accent/40"}`}
                      >
                        <button type="button" className="w-full" onClick={() => setSelectedAccountId(account.id)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{account.username || account.email || "חשבון GitHub"}</span>
                            </div>
                            <Badge variant="outline" className={hasToken ? "text-green-700 border-green-300" : "text-amber-700 border-amber-300"}>
                              {hasToken ? "טוקן שמור" : "ללא טוקן"}
                            </Badge>
                          </div>
                        </button>

                        <div className="mt-2 grid grid-cols-1 md:grid-cols-4 gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 md:col-span-1">
                            <Checkbox
                              checked={draft.enabled}
                              onCheckedChange={(value) => updateDraft(account.id, { enabled: value === true })}
                            />
                            <span className="text-xs">ייבוא אוטומטי</span>
                          </div>

                          <Select
                            value={String(draft.interval)}
                            onValueChange={(value) => updateDraft(account.id, { interval: Number(value) })}
                          >
                            <SelectTrigger className="h-8 md:col-span-1">
                              <SelectValue placeholder="תדירות" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">כל 15 דקות</SelectItem>
                              <SelectItem value="30">כל 30 דקות</SelectItem>
                              <SelectItem value="60">כל שעה</SelectItem>
                              <SelectItem value="180">כל 3 שעות</SelectItem>
                              <SelectItem value="360">כל 6 שעות</SelectItem>
                              <SelectItem value="720">כל 12 שעות</SelectItem>
                              <SelectItem value="1440">פעם ביום</SelectItem>
                            </SelectContent>
                          </Select>

                          <Select
                            value={draft.targetProjectId || "all"}
                            onValueChange={(value) => updateDraft(account.id, { targetProjectId: value })}
                          >
                            <SelectTrigger className="h-8 md:col-span-1">
                              <SelectValue placeholder="פרויקט יעד" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">כל הפרויקטים המקושרים</SelectItem>
                              {githubProjects.map((project: any) => (
                                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            variant="outline"
                            className="h-8 md:col-span-1"
                            onClick={() => saveAccountSyncSettings(account.id)}
                            disabled={updateAccount.isPending}
                          >
                            שמור הגדרות
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">אין עדיין חשבונות GitHub. לחץ על פלוס כדי להוסיף.</p>
              )}
            </div>

            {githubAccounts.length > 0 && (
              <div>
                <Label>חשבון GitHub לייבוא</Label>
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר חשבון" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא חשבון שמור</SelectItem>
                    {githubAccounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.username || account.email || account.service_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {savedToken ? (
              <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700">יש טוקן שמור לחשבון הנבחר.</span>
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => fetchRepos(savedToken)}>
                  טען רפוזיטוריים עם הטוקן השמור
                </Button>
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
                  {selectedAccount ? "שמור טוקן לחשבון וטען" : "טען רפוזיטוריים"}
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
