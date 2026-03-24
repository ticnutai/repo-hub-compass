import { useState, useRef } from "react";
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask, Task, TaskStatus, TaskPriority } from "@/hooks/use-tasks";
import { useProjects } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, GripVertical, Trash2, Edit, CalendarIcon, Flag } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "לביצוע", color: "bg-muted" },
  { id: "in_progress", label: "בעבודה", color: "bg-blue-500/10" },
  { id: "review", label: "בבדיקה", color: "bg-yellow-500/10" },
  { id: "done", label: "הושלם", color: "bg-green-500/10" },
];

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; badge: string }> = {
  low: { label: "נמוך", color: "text-muted-foreground", badge: "bg-muted text-muted-foreground" },
  medium: { label: "בינוני", color: "text-blue-500", badge: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  high: { label: "גבוה", color: "text-orange-500", badge: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  urgent: { label: "דחוף", color: "text-destructive", badge: "bg-destructive/10 text-destructive border-destructive/20" },
};

function TaskCard({ task, projects, onEdit, onDelete, onDragStart }: {
  task: Task;
  projects: any[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
}) {
  const project = projects?.find((p: any) => p.id === task.project_id);
  const priority = PRIORITY_CONFIG[task.priority];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done";

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      className="cursor-grab active:cursor-grabbing border-border/50 hover:border-border transition-all hover:shadow-md group"
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4" />
          </div>
          <h4 className="font-medium text-sm flex-1 text-right">{task.title}</h4>
        </div>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 text-right">{task.description}</p>
        )}

        <div className="flex items-center justify-between flex-wrap gap-1.5">
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onEdit(task)}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onDelete(task.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", priority.badge)}>
              <Flag className={cn("h-2.5 w-2.5 mr-1", priority.color)} />
              {priority.label}
            </Badge>

            {project && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {project.name}
              </Badge>
            )}

            {task.due_date && (
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", isOverdue && "bg-destructive/10 text-destructive border-destructive/20")}>
                <CalendarIcon className="h-2.5 w-2.5 mr-1" />
                {format(new Date(task.due_date), "dd/MM")}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumn({ column, tasks, projects, onDrop, onEdit, onDelete, onDragStart, onAddTask }: {
  column: typeof COLUMNS[0];
  tasks: Task[];
  projects: any[];
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl p-3 min-h-[400px] transition-colors min-w-[260px] flex-1",
        column.color,
        dragOver && "ring-2 ring-primary/50"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { setDragOver(false); onDrop(e, column.id); }}
    >
      <div className="flex items-center justify-between mb-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddTask(column.id)}>
          <Plus className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
          <h3 className="font-semibold text-sm">{column.label}</h3>
        </div>
      </div>

      <div className="space-y-2 flex-1">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} projects={projects} onEdit={onEdit} onDelete={onDelete} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const { data: tasks = [], isLoading } = useTasks();
  const { data: projects = [] } = useProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" as TaskPriority, status: "todo" as TaskStatus, project_id: "", due_date: null as Date | undefined });
  const [filterProject, setFilterProject] = useState<string>("all");

  const draggedTask = useRef<Task | null>(null);

  const resetForm = (status: TaskStatus = "todo") => {
    setForm({ title: "", description: "", priority: "medium", status, project_id: "", due_date: undefined });
    setEditingTask(null);
  };

  const openAdd = (status: TaskStatus) => {
    resetForm(status);
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      status: task.status,
      project_id: task.project_id || "",
      due_date: task.due_date ? new Date(task.due_date) : undefined,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    try {
      const payload = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        status: form.status,
        project_id: form.project_id || null,
        due_date: form.due_date ? format(form.due_date, "yyyy-MM-dd") : null,
      };

      if (editingTask) {
        await updateTask.mutateAsync({ id: editingTask.id, ...payload });
        toast.success("המשימה עודכנה");
      } else {
        await createTask.mutateAsync(payload);
        toast.success("המשימה נוצרה");
      }
      setDialogOpen(false);
      resetForm();
    } catch {
      toast.error("שגיאה בשמירת המשימה");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      toast.success("המשימה נמחקה");
    } catch {
      toast.error("שגיאה במחיקה");
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    draggedTask.current = task;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const task = draggedTask.current;
    if (!task || task.status === newStatus) return;
    try {
      await updateTask.mutateAsync({ id: task.id, status: newStatus });
      toast.success("המשימה הועברה");
    } catch {
      toast.error("שגיאה בהעברת המשימה");
    }
    draggedTask.current = null;
  };

  const filteredTasks = filterProject === "all" ? tasks : tasks.filter((t) => t.project_id === filterProject);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button onClick={() => openAdd("todo")}>
              <Plus className="h-4 w-4 mr-2" /> משימה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-right">{editingTask ? "עריכת משימה" : "משימה חדשה"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="כותרת המשימה" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="text-right" dir="rtl" />
              <Textarea placeholder="תיאור (אופציונלי)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-right" dir="rtl" rows={3} />

              <div className="grid grid-cols-2 gap-3">
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוך</SelectItem>
                    <SelectItem value="medium">בינוני</SelectItem>
                    <SelectItem value="high">גבוה</SelectItem>
                    <SelectItem value="urgent">דחוף</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TaskStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Select value={form.project_id || "none"} onValueChange={(v) => setForm({ ...form, project_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="קשר לפרויקט" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא פרויקט</SelectItem>
                  {projects?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !form.due_date && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {form.due_date ? format(form.due_date, "dd/MM/yyyy") : "תאריך יעד"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.due_date} onSelect={(d) => setForm({ ...form, due_date: d })} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              <Button className="w-full" onClick={handleSubmit} disabled={!form.title.trim()}>
                {editingTask ? "עדכן" : "צור משימה"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex items-center gap-3">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סנן לפי פרויקט" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הפרויקטים</SelectItem>
              {projects?.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <h1 className="text-2xl font-bold">לוח משימות</h1>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" dir="rtl">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            column={col}
            tasks={filteredTasks.filter((t) => t.status === col.id)}
            projects={projects || []}
            onDrop={handleDrop}
            onEdit={openEdit}
            onDelete={handleDelete}
            onDragStart={handleDragStart}
            onAddTask={openAdd}
          />
        ))}
      </div>
    </div>
  );
}
