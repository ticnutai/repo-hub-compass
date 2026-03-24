import { useState } from "react";
import { Folder, FolderPlus, Pencil, Trash2, ChevronDown, ChevronLeft, MoveRight, X, Check, Download, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder, useProjects, useMoveProjectToFolder } from "@/hooks/use-data";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { exportFolder, exportMultipleProjects } from "@/lib/export-utils";

const FOLDER_COLORS = [
  { value: "#D4AF37", label: "זהב" },
  { value: "#1B2A4A", label: "נייבי" },
  { value: "#16a34a", label: "ירוק" },
  { value: "#dc2626", label: "אדום" },
  { value: "#7c3aed", label: "סגול" },
  { value: "#ea580c", label: "כתום" },
  { value: "#0891b2", label: "טורקיז" },
  { value: "#be185d", label: "ורוד" },
];

export default function Folders() {
  const { data: folders, isLoading: foldersLoading } = useFolders();
  const { data: projects } = useProjects();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const moveProject = useMoveProjectToFolder();

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [moveProjectId, setMoveProjectId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverUnassigned, setDragOverUnassigned] = useState(false);

  const handleDragStart = (e: React.DragEvent, projectId: string) => {
    e.dataTransfer.setData("projectId", projectId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnFolder = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    const projectId = e.dataTransfer.getData("projectId");
    if (!projectId) return;
    try {
      await moveProject.mutateAsync({ projectId, folderId });
      toast.success("פרויקט הועבר לתיקייה");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDropOnUnassigned = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverUnassigned(false);
    const projectId = e.dataTransfer.getData("projectId");
    if (!projectId) return;
    try {
      await moveProject.mutateAsync({ projectId, folderId: null });
      toast.success("פרויקט הוצא מתיקייה");
    } catch (err: any) { toast.error(err.message); }
  };

  const handleExportFolder = async (folder: any) => {
    setExportingId(folder.id);
    try {
      await exportFolder(folder.id, folder.name, projects || [], folders || []);
      toast.success(`תיקייה "${folder.name}" יוצאה בהצלחה!`);
    } catch (e: any) { toast.error(e.message); }
    setExportingId(null);
  };

  // Create form
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#D4AF37");
  const [newParent, setNewParent] = useState<string | null>(null);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#D4AF37");

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createFolder.mutateAsync({ name: newName, color: newColor, parent_id: newParent || undefined });
      toast.success("תיקייה נוצרה!");
      setCreateOpen(false);
      setNewName("");
      setNewColor("#D4AF37");
      setNewParent(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const startEdit = (folder: any) => {
    setEditId(folder.id);
    setEditName(folder.name);
    setEditColor(folder.color || "#D4AF37");
  };

  const saveEdit = async () => {
    if (!editId || !editName.trim()) return;
    try {
      await updateFolder.mutateAsync({ id: editId, name: editName, color: editColor });
      toast.success("תיקייה עודכנה!");
      setEditId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteFolder.mutateAsync(deleteId);
      toast.success("תיקייה נמחקה!");
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleMoveProject = async (folderId: string | null) => {
    if (!moveProjectId) return;
    try {
      await moveProject.mutateAsync({ projectId: moveProjectId, folderId });
      toast.success(folderId ? "פרויקט הועבר לתיקייה" : "פרויקט הוצא מתיקייה");
      setMoveProjectId(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Build folder tree
  const rootFolders = (folders || []).filter((f: any) => !f.parent_id);
  const getSubfolders = (parentId: string) => (folders || []).filter((f: any) => f.parent_id === parentId);
  const getProjectsInFolder = (folderId: string) => (projects || []).filter((p: any) => p.folder_id === folderId);
  const unassignedProjects = (projects || []).filter((p: any) => !p.folder_id);
  const deleteTargetName = deleteId ? (folders || []).find((f: any) => f.id === deleteId)?.name : "";

  const renderFolder = (folder: any, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const subfolders = getSubfolders(folder.id);
    const folderProjects = getProjectsInFolder(folder.id);
    const isEditing = editId === folder.id;

    return (
      <div key={folder.id} style={{ marginRight: depth * 24 }}>
        <div
          className={`flex items-center justify-between p-3 rounded-lg hover:bg-secondary group cursor-pointer transition-colors ${dragOverFolderId === folder.id ? 'ring-2 ring-accent bg-accent/10' : ''}`}
          onClick={() => toggleFolder(folder.id)}
          onDragOver={(e) => { handleDragOver(e); setDragOverFolderId(folder.id); }}
          onDragLeave={() => setDragOverFolderId(null)}
          onDrop={(e) => handleDropOnFolder(e, folder.id)}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronLeft className="h-4 w-4 text-muted-foreground" />}
            <Folder className="h-5 w-5" style={{ color: folder.color || "#D4AF37" }} />
            {isEditing ? (
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <Input className="h-7 w-40 text-sm" value={editName} onChange={e => setEditName(e.target.value)} />
                <div className="flex gap-1">
                  {FOLDER_COLORS.map(c => (
                    <button key={c.value} className={`w-5 h-5 rounded-full border-2 ${editColor === c.value ? 'border-foreground' : 'border-transparent'}`} style={{ backgroundColor: c.value }} onClick={() => setEditColor(c.value)} />
                  ))}
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEdit}><Check className="h-3 w-3" /></Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditId(null)}><X className="h-3 w-3" /></Button>
              </div>
            ) : (
              <>
                <span className="font-medium">{folder.name}</span>
                <Badge variant="outline" className="text-xs">{folderProjects.length} פרויקטים</Badge>
              </>
            )}
          </div>
          {!isEditing && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-accent" onClick={() => handleExportFolder(folder)} disabled={exportingId === folder.id}>
                <Download className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(folder)}><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(folder.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="mr-6 border-r-2 border-muted pr-2 space-y-1 mt-1">
            {folderProjects.map((p: any) => (
              <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between p-2 rounded hover:bg-secondary text-sm group/project">
                <span>{p.name}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">{p.language || "—"}</Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/project:opacity-100" onClick={(e) => { e.preventDefault(); setMoveProjectId(p.id); }}>
                    <MoveRight className="h-3 w-3" />
                  </Button>
                </div>
              </Link>
            ))}
            {subfolders.map((sf: any) => renderFolder(sf, depth + 1))}
            {folderProjects.length === 0 && subfolders.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">תיקייה ריקה</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">תיקיות</h2>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setCreateOpen(true)}>
          <FolderPlus className="h-4 w-4 ml-2" /> תיקייה חדשה
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center"><Folder className="h-5 w-5 text-accent" /></div>
            <div><p className="text-xl font-bold">{folders?.length || 0}</p><p className="text-sm text-muted-foreground">תיקיות</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center"><Folder className="h-5 w-5 text-green-600" /></div>
            <div><p className="text-xl font-bold">{(projects?.length || 0) - unassignedProjects.length}</p><p className="text-sm text-muted-foreground">מסווגים</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><Folder className="h-5 w-5 text-amber-600" /></div>
            <div><p className="text-xl font-bold">{unassignedProjects.length}</p><p className="text-sm text-muted-foreground">לא מסווגים</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Folder tree */}
      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">עץ תיקיות</CardTitle></CardHeader>
        <CardContent>
          {foldersLoading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !folders || folders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">אין תיקיות עדיין. צור תיקייה ראשונה!</p>
          ) : (
            <div className="space-y-1">
              {rootFolders.map((f: any) => renderFolder(f))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned projects */}
      {unassignedProjects.length > 0 && (
        <Card className="border-2 border-border">
          <CardHeader><CardTitle className="text-lg">פרויקטים ללא תיקייה</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {unassignedProjects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded hover:bg-secondary group">
                  <Link to={`/projects/${p.id}`} className="flex-1"><span className="text-sm">{p.name}</span></Link>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-xs" onClick={() => setMoveProjectId(p.id)}>
                    <MoveRight className="h-3 w-3 ml-1" /> העבר לתיקייה
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create folder dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="border-2 border-accent">
          <DialogHeader><DialogTitle>תיקייה חדשה</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>שם התיקייה</Label><Input className="mt-1" value={newName} onChange={e => setNewName(e.target.value)} placeholder="שם התיקייה..." /></div>
            <div>
              <Label>צבע</Label>
              <div className="flex gap-2 mt-2">
                {FOLDER_COLORS.map(c => (
                  <button key={c.value} className={`w-8 h-8 rounded-full border-2 transition-all ${newColor === c.value ? 'border-foreground scale-110' : 'border-muted'}`} style={{ backgroundColor: c.value }} onClick={() => setNewColor(c.value)} title={c.label} />
                ))}
              </div>
            </div>
            <div>
              <Label>תיקיית אב (אופציונלי)</Label>
              <Select value={newParent || "_none"} onValueChange={(v) => setNewParent(v === "_none" ? null : v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">ללא - תיקייה ראשית</SelectItem>
                  {(folders || []).map((f: any) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={createFolder.isPending}>
              {createFolder.isPending ? "יוצר..." : "צור תיקייה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Move project dialog */}
      <Dialog open={!!moveProjectId} onOpenChange={(v) => { if (!v) setMoveProjectId(null); }}>
        <DialogContent dir="rtl" className="border-2 border-accent">
          <DialogHeader><DialogTitle>העבר פרויקט לתיקייה</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-4">
            <Button variant="outline" className="w-full justify-start" onClick={() => handleMoveProject(null)}>
              <X className="h-4 w-4 ml-2" /> הסר מתיקייה
            </Button>
            {(folders || []).map((f: any) => (
              <Button key={f.id} variant="outline" className="w-full justify-start" onClick={() => handleMoveProject(f.id)}>
                <Folder className="h-4 w-4 ml-2" style={{ color: f.color }} /> {f.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תיקייה</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק את התיקייה "{deleteTargetName}"? הפרויקטים בתוכה לא יימחקו אלא יעברו למצב ללא תיקייה.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">מחק תיקייה</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
