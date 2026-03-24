import { useState } from "react";
import { Search, Plus, LayoutGrid, List, Github, Monitor, FolderGit2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mockProjects, statusLabels, platformLabels, type Project, type ProjectStatus, type Platform } from "@/data/mock-data";
import { Link } from "react-router-dom";

const statusColors: Record<ProjectStatus, string> = {
  active: "bg-green-100 text-green-700 border-green-300",
  paused: "bg-amber-100 text-amber-700 border-amber-300",
  completed: "bg-slate-100 text-slate-600 border-slate-300",
};

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filtered = mockProjects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.includes(searchQuery);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchPlatform = platformFilter === "all" || p.platform === platformFilter;
    return matchSearch && matchStatus && matchPlatform;
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">פרויקטים</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 ml-2" />
              פרויקט חדש
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="border-2 border-accent">
            <DialogHeader>
              <DialogTitle>הוסף פרויקט חדש</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>שם הפרויקט</Label><Input className="mt-1" placeholder="שם הפרויקט..." /></div>
              <div><Label>תיאור</Label><Textarea className="mt-1" placeholder="תיאור קצר..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>פלטפורמה</Label>
                  <Select><SelectTrigger className="mt-1"><SelectValue placeholder="בחר" /></SelectTrigger>
                    <SelectContent><SelectItem value="github">GitHub</SelectItem><SelectItem value="local">מקומי</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>שפה</Label><Input className="mt-1" placeholder="TypeScript..." /></div>
              </div>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">הוסף פרויקט</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש פרויקט..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
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

      {/* Projects */}
      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3"}>
        {filtered.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`}>
            <Card className="border-2 border-border hover:border-accent transition-all hover:shadow-md cursor-pointer">
              <CardContent className={`p-5 ${viewMode === "list" ? "flex items-center justify-between" : "space-y-3"}`}>
                <div className={viewMode === "list" ? "flex items-center gap-4 flex-1" : ""}>
                  <div className="flex items-center gap-2 mb-1">
                    {project.platform === 'github' ? <Github className="h-4 w-4 text-muted-foreground" /> : <Monitor className="h-4 w-4 text-muted-foreground" />}
                    <h3 className="font-semibold text-foreground">{project.name}</h3>
                  </div>
                  {viewMode === "grid" && <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {project.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs border-accent/50 text-accent">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className={`${statusColors[project.status]} text-xs`}>{statusLabels[project.status]}</Badge>
                  <span className="text-xs text-muted-foreground">{project.language}</span>
                  <span className="text-xs text-muted-foreground mr-auto">{project.lastUpdated}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <FolderGit2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">לא נמצאו פרויקטים</p>
        </div>
      )}
    </div>
  );
}
