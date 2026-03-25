import { useState } from "react";
import { Search, Plus, LayoutGrid, List, Github, Monitor, FolderGit2, Trash2, Download, Archive, CheckSquare, Pencil, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProjects, useCreateProject, useDeleteProject, useUpdateProject, useProfile, useAccounts, useProjectAccountLinks } from "@/hooks/use-data";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { GitHubImportDialog } from "@/components/GitHubImportDialog";
import { exportProjectAsZip, exportMultipleProjects } from "@/lib/export-utils";

const statusLabels: Record<string, string> = { active: "פעיל", paused: "מושהה", completed: "הושלם" };
const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700 border-green-300",
  paused: "bg-amber-100 text-amber-700 border-amber-300",
  completed: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function Projects() {
  const { data: projects, isLoading } = useProjects();
  const { data: accounts } = useAccounts();
  const { data: projectAccountLinks } = useProjectAccountLinks();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();
  const { data: profile } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [accountTab, setAccountTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [open, setOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [githubRenameDialog, setGithubRenameDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState<{ project: any; name: string; desc: string } | null>(null);
  const [githubDeleteDialog, setGithubDeleteDialog] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingGithub, setDeletingGithub] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPlatform, setNewPlatform] = useState<"github" | "local">("github");
  const [newLang, setNewLang] = useState("");

  const githubAccounts = (accounts || []).filter((account: any) =>
    account.service_name?.toLowerCase().includes("github")
  );

  const projectGithubAccountsMap = (projectAccountLinks || []).reduce((acc: Record<string, Array<{ id: string; name: string; username: string; email: string; token: string }>>, link: any) => {
    const account = link.accounts;
    if (!account || !account.service_name?.toLowerCase().includes("github")) return acc;
    if (!acc[link.project_id]) acc[link.project_id] = [];
    const alreadyExists = acc[link.project_id].some((existing) => existing.id === account.id);
    if (alreadyExists) return acc;
    acc[link.project_id].push({
      id: account.id,
      name: account.service_name,
      username: account.username || "",
      email: account.email || "",
      token: account.api_key || account.password || "",
    });
    return acc;
  }, {});

  const resolveProjectGithubToken = (projectId: string) => {
    const linkedGithubAccounts = projectGithubAccountsMap[projectId] || [];
    if (accountTab !== "all") {
      const activeAccount = linkedGithubAccounts.find((account) => account.id === accountTab);
      if (activeAccount?.token) return activeAccount.token;
    }
    const firstLinkedToken = linkedGithubAccounts.find((account) => !!account.token)?.token;
    return firstLinkedToken || profile?.github_token || "";
  };

  const filtered = (projects || []).filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || "").includes(searchQuery);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchPlatform = platformFilter === "all" || p.platform === platformFilter;
    const linkedGithubAccounts = projectGithubAccountsMap[p.id] || [];
    const matchAccount = accountTab === "all" || (p.platform === "github" && linkedGithubAccounts.some((a) => a.id === accountTab));
    return matchSearch && matchStatus && matchPlatform && matchAccount;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createProject.mutateAsync({ name: newName, description: newDesc, platform: newPlatform, language: newLang });
      toast.success("פרויקט נוצר בהצלחה!");
      setOpen(false);
      setNewName(""); setNewDesc(""); setNewLang("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const project = (projects || []).find(p => p.id === deleteId);
    const isGithubProject = project?.platform === "github" && project?.repo_url;

    if (isGithubProject) {
      setPendingDeleteId(deleteId);
      setDeleteId(null);
      setGithubDeleteDialog(true);
      return;
    }

    try {
      await deleteProject.mutateAsync(deleteId);
      toast.success("פרויקט נמחק!");
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleGithubDeleteConfirm = async (deleteOnGithub: boolean) => {
    if (!pendingDeleteId) return;
    const project = (projects || []).find(p => p.id === pendingDeleteId);
    setGithubDeleteDialog(false);

    const githubToken = project ? resolveProjectGithubToken(project.id) : "";

    if (deleteOnGithub && project?.repo_url && githubToken) {
      setDeletingGithub(true);
      try {
        const match = project.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
          const [, owner, repo] = match;
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            method: "DELETE",
            headers: { Authorization: `token ${githubToken}` },
          });
          if (!res.ok && res.status !== 404) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "שגיאה במחיקת הריפו מ-GitHub");
          }
          toast.success("הריפו נמחק גם מ-GitHub!");
        }
      } catch (e: any) {
        toast.error(e.message);
        setDeletingGithub(false);
        setPendingDeleteId(null);
        return;
      }
      setDeletingGithub(false);
    }

    try {
      await deleteProject.mutateAsync(pendingDeleteId);
      toast.success("פרויקט נמחק!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setPendingDeleteId(null);
  };

  const startEdit = (project: any) => {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDesc(project.description || "");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const project = (projects || []).find(p => p.id === editingId);
    const nameChanged = project && editName.trim() !== project.name;
    const isGithubProject = project?.platform === "github" && project?.repo_url;

    // If name changed on a GitHub project, ask user
    if (nameChanged && isGithubProject) {
      setPendingSave({ project, name: editName, desc: editDesc });
      setGithubRenameDialog(true);
      return;
    }

    await doSave(editingId, editName, editDesc);
  };

  const doSave = async (id: string, name: string, desc: string, renameOnGithub = false, project?: any) => {
    try {
      let newRepoUrl = project?.repo_url;
      const githubToken = resolveProjectGithubToken(id);
      if (renameOnGithub && project?.repo_url && githubToken) {
        // Extract owner/repo from URL
        const match = project.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
        if (match) {
          const [, owner, oldRepo] = match;
          const newName = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const res = await fetch(`https://api.github.com/repos/${owner}/${oldRepo}`, {
            method: "PATCH",
            headers: {
              Authorization: `token ${githubToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: newName }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "שגיאה בשינוי שם ב-GitHub");
          }
          const repoData = await res.json();
          newRepoUrl = repoData.html_url;
          toast.success("שם הריפו שונה גם ב-GitHub!");
        }
      }

      await updateProject.mutateAsync({
        id,
        name,
        description: desc,
        ...(newRepoUrl !== project?.repo_url ? { repo_url: newRepoUrl } : {}),
      });
      toast.success("פרויקט עודכן!");
      setEditingId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleGithubRenameConfirm = async (renameOnGithub: boolean) => {
    setGithubRenameDialog(false);
    if (pendingSave) {
      await doSave(pendingSave.project.id, pendingSave.name, pendingSave.desc, renameOnGithub, pendingSave.project);
      setPendingSave(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleExportSelected = async () => {
    if (selected.size === 0) return;
    setExporting(true);
    try {
      if (selected.size === 1) {
        const p = (projects || []).find(p => p.id === Array.from(selected)[0]);
        await exportProjectAsZip(Array.from(selected)[0], p?.name || "project");
      } else {
        await exportMultipleProjects(Array.from(selected), "projects_export");
      }
      toast.success(`${selected.size} פרויקטים יוצאו בהצלחה!`);
      setSelected(new Set());
    } catch (e: any) { toast.error(e.message); }
    setExporting(false);
  };

  const deleteTargetName = deleteId ? (projects || []).find(p => p.id === deleteId)?.name : "";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-foreground">פרויקטים</h2>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" onClick={handleExportSelected} disabled={exporting}>
              <Archive className="h-4 w-4 ml-2" /> {exporting ? "מייצא..." : `ייצוא ${selected.size} נבחרים (ZIP)`}
            </Button>
          )}
          <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" onClick={() => setGithubOpen(true)}>
            <Github className="h-4 w-4 ml-2" /> GitHub
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 ml-2" />פרויקט חדש</Button>
            </DialogTrigger>
          <DialogContent dir="rtl" className="border-2 border-accent">
            <DialogHeader><DialogTitle>הוסף פרויקט חדש</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>שם הפרויקט</Label><Input className="mt-1" value={newName} onChange={e => setNewName(e.target.value)} placeholder="שם הפרויקט..." /></div>
              <div><Label>תיאור</Label><Textarea className="mt-1" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="תיאור קצר..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>פלטפורמה</Label>
                  <Select value={newPlatform} onValueChange={(v: "github" | "local") => setNewPlatform(v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="github">GitHub</SelectItem><SelectItem value="local">מקומי</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>שפה</Label><Input className="mt-1" value={newLang} onChange={e => setNewLang(e.target.value)} placeholder="TypeScript..." /></div>
              </div>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={createProject.isPending}>
                {createProject.isPending ? "יוצר..." : "הוסף פרויקט"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <GitHubImportDialog
        open={githubOpen}
        onOpenChange={setGithubOpen}
        preselectedAccountId={accountTab !== "all" ? accountTab : undefined}
      />

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חפש פרויקט..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="active">פעיל</SelectItem>
            <SelectItem value="paused">מושהה</SelectItem>
            <SelectItem value="completed">הושלם</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הפלטפורמות</SelectItem>
            <SelectItem value="github">GitHub</SelectItem>
            <SelectItem value="local">מקומי</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-md">
          <Button variant={viewMode === "grid" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={viewMode === "list" ? "default" : "ghost"} size="icon" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
        </div>
      </div>

      {githubAccounts.length > 0 && (
        <Tabs value={accountTab} onValueChange={setAccountTab} dir="rtl">
          <TabsList className="h-auto flex-wrap justify-start gap-1 p-1">
            <TabsTrigger value="all">כל הפרויקטים</TabsTrigger>
            {githubAccounts.map((account: any) => (
              <TabsTrigger key={account.id} value={account.id}>
                {account.username || account.email || `חשבון ${account.id.slice(0, 6)}`}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
          {filtered.map((project) => (
            <div key={project.id} className="relative group">
              {/* Select checkbox */}
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <Checkbox checked={selected.has(project.id)} onCheckedChange={() => toggleSelect(project.id)} />
              </div>

              {editingId === project.id ? (
                /* Inline edit mode */
                <Card className="border-2 border-accent bg-accent/5">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {project.platform === 'github' ? <Github className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium text-muted-foreground">עריכה מהירה</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-accent hover:text-accent hover:bg-accent/10" onClick={saveEdit} disabled={updateProject.isPending}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">שם הפרויקט</Label>
                      <Input
                        className="mt-1 h-8 text-sm"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">תיאור</Label>
                      <Textarea
                        className="mt-1 text-sm min-h-[60px] resize-none"
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        placeholder="הוסף תיאור לפרויקט..."
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">* השינוי יישמר כאן בלבד (לא ב-GitHub)</p>
                  </CardContent>
                </Card>
              ) : (
                /* Normal view */
                <Link to={`/projects/${project.id}`}>
                  <Card className={`border-2 ${selected.has(project.id) ? 'border-accent bg-accent/5' : 'border-border'} hover:border-accent transition-all hover:shadow-md cursor-pointer`}>
                    <CardContent className={`p-5 ${viewMode === "list" ? "flex items-center justify-between" : "space-y-3"}`}>
                      <div className={viewMode === "list" ? "flex items-center gap-4 flex-1" : ""}>
                        <div className="flex items-center gap-2 mb-1">
                          {project.platform === 'github' ? <Github className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                          <h3 className="font-semibold text-foreground">{project.name}</h3>
                        </div>
                        {viewMode === "grid" && <p className="text-sm text-muted-foreground line-clamp-2">{project.description || <span className="italic opacity-50">ללא תיאור</span>}</p>}
                        {projectGithubAccountsMap[project.id]?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {projectGithubAccountsMap[project.id].map((account) => (
                              <Badge key={`${project.id}-${account.id}`} variant="outline" className="text-xs border-sky-300 text-sky-700 bg-sky-50">
                                GitHub: {account.username || account.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {project.tags && project.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {project.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs border-accent/50 text-accent">{tag}</Badge>)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <Badge className={`${statusColors[project.status]} text-xs`}>{statusLabels[project.status]}</Badge>
                        <span className="text-xs text-muted-foreground">{project.language}</span>
                        <span className="text-xs text-muted-foreground mr-auto">{new Date(project.updated_at).toLocaleDateString("he-IL")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )}

              {/* Quick action buttons (only in non-edit mode) */}
              {editingId !== project.id && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 left-10 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-accent hover:bg-accent/10"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(project); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(project.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <FolderGit2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">לא נמצאו פרויקטים</p>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת פרויקט</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הפרויקט "{deleteTargetName}"? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק פרויקט
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* GitHub Rename Confirmation */}
      <Dialog open={githubRenameDialog} onOpenChange={(v) => { if (!v) { setGithubRenameDialog(false); setPendingSave(null); } }}>
        <DialogContent dir="rtl" className="border-2 border-accent">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" /> שינוי שם גם ב-GitHub?
            </DialogTitle>
            <DialogDescription>
              שינית את שם הפרויקט. האם לשנות גם את שם הריפו ב-GitHub?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleGithubRenameConfirm(true)}>
              <Github className="h-4 w-4 ml-2" /> כן, שנה גם ב-GitHub
            </Button>
            <Button variant="outline" onClick={() => handleGithubRenameConfirm(false)}>
              רק כאן
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GitHub Delete Confirmation */}
      <Dialog open={githubDeleteDialog} onOpenChange={(v) => { if (!v) { setGithubDeleteDialog(false); setPendingDeleteId(null); } }}>
        <DialogContent dir="rtl" className="border-2 border-destructive">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Github className="h-5 w-5" /> למחוק גם מ-GitHub?
            </DialogTitle>
            <DialogDescription>
              הפרויקט מחובר לריפו ב-GitHub. האם למחוק גם את הריפו מ-GitHub? <strong className="text-destructive">פעולה זו אינה ניתנת לביטול!</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
            <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => handleGithubDeleteConfirm(true)} disabled={deletingGithub}>
              <Github className="h-4 w-4 ml-2" /> {deletingGithub ? "מוחק..." : "כן, מחק גם מ-GitHub"}
            </Button>
            <Button variant="outline" onClick={() => handleGithubDeleteConfirm(false)} disabled={deletingGithub}>
              רק כאן
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
