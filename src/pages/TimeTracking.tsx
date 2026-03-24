import { useState, useMemo, useEffect } from "react";
import { Play, Square, Trash2, Clock, Timer, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useProjects } from "@/hooks/use-data";
import { useTimeEntries, useRunningTimer, useStartTimer, useStopTimer, useDeleteTimeEntry } from "@/hooks/use-time-tracking";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function LiveTimer({ startTime }: { startTime: string }) {
  const [, setTick] = useState(0);
  useState(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  });
  const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
  return <span className="font-mono text-2xl font-bold text-green-500">{formatDuration(Math.max(0, elapsed))}</span>;
}

const COLORS = ["hsl(43 76% 52%)", "hsl(200 70% 50%)", "hsl(140 60% 45%)", "hsl(280 60% 55%)", "hsl(20 80% 55%)", "hsl(340 70% 50%)", "hsl(170 60% 45%)", "hsl(60 70% 50%)"];

export default function TimeTracking() {
  const { data: projects } = useProjects();
  const { data: entries, isLoading } = useTimeEntries();
  const { data: runningTimer } = useRunningTimer();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();
  const deleteEntry = useDeleteTimeEntry();

  const [selectedProject, setSelectedProject] = useState<string>("");
  const [description, setDescription] = useState("");
  const [viewMode, setViewMode] = useState<"entries" | "reports">("entries");

  const handleStart = () => {
    startTimer.mutate(
      { projectId: selectedProject || undefined, description },
      { onSuccess: () => { toast.success("טיימר הופעל"); setDescription(""); } }
    );
  };

  const handleStop = () => {
    if (runningTimer) {
      stopTimer.mutate(runningTimer.id, { onSuccess: () => toast.success("טיימר נעצר") });
    }
  };

  // Weekly report data
  const weeklyData = useMemo(() => {
    if (!entries) return [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const days = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    const dayTotals: Record<number, number> = {};
    
    entries.filter(e => !e.is_running && new Date(e.start_time) >= weekAgo).forEach(e => {
      const day = new Date(e.start_time).getDay();
      dayTotals[day] = (dayTotals[day] || 0) + (e.duration_seconds || 0);
    });

    return days.map((name, i) => ({ day: name, hours: Math.round(((dayTotals[i] || 0) / 3600) * 10) / 10 }));
  }, [entries]);

  // Project distribution
  const projectDistribution = useMemo(() => {
    if (!entries) return [];
    const totals: Record<string, { name: string; seconds: number }> = {};
    entries.filter(e => !e.is_running).forEach(e => {
      const name = (e as any).projects?.name || "ללא פרויקט";
      if (!totals[name]) totals[name] = { name, seconds: 0 };
      totals[name].seconds += e.duration_seconds || 0;
    });
    return Object.values(totals)
      .filter(t => t.seconds > 0)
      .map(t => ({ ...t, hours: Math.round((t.seconds / 3600) * 10) / 10 }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [entries]);

  const totalWeekHours = weeklyData.reduce((s, d) => s + d.hours, 0);
  const totalAllHours = entries?.filter(e => !e.is_running).reduce((s, e) => s + (e.duration_seconds || 0), 0) || 0;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Timer className="h-6 w-6 text-accent" />
          מעקב זמן
        </h2>
        <div className="flex gap-2">
          <Button variant={viewMode === "entries" ? "default" : "outline"} size="sm" onClick={() => setViewMode("entries")}>
            <Clock className="h-4 w-4 ml-1" /> רשומות
          </Button>
          <Button variant={viewMode === "reports" ? "default" : "outline"} size="sm" onClick={() => setViewMode("reports")}>
            <BarChart3 className="h-4 w-4 ml-1" /> דוחות
          </Button>
        </div>
      </div>

      {/* Active Timer */}
      <Card className="border-2 border-accent/30 bg-accent/5">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="בחר פרויקט" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">ללא פרויקט</SelectItem>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="תיאור המשימה..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="flex-1"
              />
            </div>

            <div className="flex items-center gap-3">
              {runningTimer ? (
                <>
                  <LiveTimer startTime={runningTimer.start_time} />
                  <Button onClick={handleStop} variant="destructive" size="icon" className="h-12 w-12 rounded-full">
                    <Square className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="font-mono text-2xl text-muted-foreground">00:00:00</span>
                  <Button onClick={handleStart} size="icon" className="h-12 w-12 rounded-full bg-green-600 hover:bg-green-700">
                    <Play className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {runningTimer && (
            <div className="mt-2 text-sm text-muted-foreground">
              {(runningTimer as any).projects?.name && <Badge variant="outline" className="ml-2">{(runningTimer as any).projects.name}</Badge>}
              {runningTimer.description}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-2 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">סה״כ השבוע</p>
            <p className="text-2xl font-bold text-accent">{totalWeekHours.toFixed(1)} שעות</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">סה״כ כללי</p>
            <p className="text-2xl font-bold text-foreground">{(totalAllHours / 3600).toFixed(1)} שעות</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">רשומות</p>
            <p className="text-2xl font-bold text-foreground">{entries?.filter(e => !e.is_running).length || 0}</p>
          </CardContent>
        </Card>
      </div>

      {viewMode === "reports" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Bar Chart */}
          <Card className="border-2 border-border">
            <CardHeader className="pb-3"><CardTitle className="text-lg">פעילות שבועית (שעות)</CardTitle></CardHeader>
            <CardContent>
              {weeklyData.some(d => d.hours > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(v: number) => [`${v} שעות`, "זמן"]} />
                    <Bar dataKey="hours" fill="hsl(43 76% 52%)" radius={[6, 6, 0, 0]} name="שעות" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">אין נתונים השבוע</p>
              )}
            </CardContent>
          </Card>

          {/* Project Pie Chart */}
          <Card className="border-2 border-border">
            <CardHeader className="pb-3"><CardTitle className="text-lg">חלוקה לפי פרויקטים</CardTitle></CardHeader>
            <CardContent>
              {projectDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={projectDistribution} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, hours }) => `${name}: ${hours}h`}>
                      {projectDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} שעות`, ""]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">אין נתונים עדיין</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Entries List */
        <Card className="border-2 border-border">
          <CardHeader className="pb-3"><CardTitle className="text-lg">רשומות זמן</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              ) : !entries?.length ? (
                <p className="text-center text-muted-foreground py-8">אין רשומות עדיין. התחל טיימר!</p>
              ) : (
                entries.filter(e => !e.is_running).slice(0, 50).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors border border-border/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Clock className="h-4 w-4 text-accent shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {entry.description || "ללא תיאור"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(entry as any).projects?.name && <Badge variant="outline" className="ml-1 text-xs">{(entry as any).projects.name}</Badge>}
                          {new Date(entry.start_time).toLocaleDateString("he-IL")} {new Date(entry.start_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground">{formatDuration(entry.duration_seconds || 0)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteEntry.mutate(entry.id, { onSuccess: () => toast.success("נמחק") })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
