import { useState } from "react";
import { Plus, FileText, Pencil, Trash2, Save, X, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useProjectNotes, useCreateNote, useUpdateNote, useDeleteNote } from "@/hooks/use-data";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { he } from "date-fns/locale";

interface ProjectNotesProps {
  projectId: string;
}

export function ProjectNotes({ projectId }: ProjectNotesProps) {
  const { data: notes, isLoading } = useProjectNotes(projectId);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const filteredNotes = (notes || []).filter((n: any) =>
    !searchQuery.trim() ||
    n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createNote.mutateAsync({ project_id: projectId, title, content });
      toast.success("הערה נוצרה!");
      setCreateOpen(false);
      setTitle("");
      setContent("");
    } catch (e: any) { toast.error(e.message); }
  };

  const startEdit = (note: any) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  };

  const saveEdit = async () => {
    if (!editingId || !title.trim()) return;
    try {
      await updateNote.mutateAsync({ id: editingId, title, content });
      toast.success("הערה עודכנה!");
      setEditingId(null);
      setTitle("");
      setContent("");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteNote.mutateAsync(deleteId);
      toast.success("הערה נמחקה!");
      setDeleteId(null);
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            הערות ותיעוד
          </CardTitle>
          <div className="flex items-center gap-2">
            {(notes || []).length > 0 && (
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="חפש בהערות..."
                  className="h-8 w-40 text-xs pr-7"
                />
              </div>
            )}
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setCreateOpen(true); setTitle(""); setContent(""); }}>
              <Plus className="h-4 w-4 ml-1" /> הערה חדשה
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">{searchQuery ? "לא נמצאו הערות" : "אין הערות עדיין"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotes.map((note: any) => (
              <div key={note.id} className="p-3 rounded-lg bg-secondary/50 group">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="כותרת" className="text-sm" />
                    <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="תוכן (Markdown נתמך)" rows={6} className="text-sm font-mono" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} disabled={updateNote.isPending}>
                        <Save className="h-3 w-3 ml-1" /> שמור
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3 ml-1" /> ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-foreground">{note.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true, locale: he })}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(note)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(note.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {note.content && (
                      <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{note.content}</pre>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir="rtl" className="border-2 border-accent">
          <DialogHeader><DialogTitle>הערה חדשה</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="כותרת ההערה" />
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="תוכן ההערה (Markdown נתמך)..." rows={8} className="font-mono text-sm" />
            <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={createNote.isPending}>
              {createNote.isPending ? "שומר..." : "שמור הערה"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת הערה</AlertDialogTitle>
            <AlertDialogDescription>האם אתה בטוח שברצונך למחוק הערה זו?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
