import { useState } from "react";
import { Search, Plus, LayoutGrid, List, Github, Monitor, FolderGit2, Trash2, Download, Archive, CheckSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProjects, useCreateProject, useDeleteProject } from "@/hooks/use-data";
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
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [open, setOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPlatform, setNewPlatform] = useState<"github" | "local">("github");
  const [newLang, setNewLang] = useState("");

  const filtered = (projects || []).filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.description || "").includes(searchQuery);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchPlatform = platformFilter === "all" || p.platform === platformFilter;
    return matchSearch && matchStatus && matchPlatform;
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
    try {
      await deleteProject.mutateAsync(deleteId);
      toast.success("פרויקט נמחק!");
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message);
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
            <Github className="h-4 w-4 ml-2" /> ייבוא מ-GitHub
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
      <GitHubImportDialog open={githubOpen} onOpenChange={setGithubOpen} />

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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
          {filtered.map((project) => (
            <div key={project.id} className="relative group">
              <Link to={`/projects/${project.id}`}>
                <Card className="border-2 border-border hover:border-accent transition-all hover:shadow-md cursor-pointer">
                  <CardContent className={`p-5 ${viewMode === "list" ? "flex items-center justify-between" : "space-y-3"}`}>
                    <div className={viewMode === "list" ? "flex items-center gap-4 flex-1" : ""}>
                      <div className="flex items-center gap-2 mb-1">
                        {project.platform === 'github' ? <Github className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                        <h3 className="font-semibold text-foreground">{project.name}</h3>
                      </div>
                      {viewMode === "grid" && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
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
              {/* Quick delete button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(project.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
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
    </div>
  );
}
