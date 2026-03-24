import { FolderGit2, Activity, AlertTriangle, HardDrive, GitCommit, Plus, Bug, Rocket, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockProjects, mockChangeLogs, mockBackups, statusLabels, changeTypeLabels } from "@/data/mock-data";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const activityData = [
  { day: "א׳", commits: 5 },
  { day: "ב׳", commits: 8 },
  { day: "ג׳", commits: 3 },
  { day: "ד׳", commits: 12 },
  { day: "ה׳", commits: 7 },
  { day: "ו׳", commits: 2 },
  { day: "ש׳", commits: 0 },
];

const changeTypeIcons = {
  feature: Plus,
  fix: Bug,
  update: RefreshCw,
  deploy: Rocket,
};

const stats = [
  { label: "סה״כ פרויקטים", value: mockProjects.length, icon: FolderGit2, color: "text-accent" },
  { label: "פעילים", value: mockProjects.filter(p => p.status === 'active').length, icon: Activity, color: "text-green-600" },
  { label: "דורשים תשומת לב", value: mockBackups.filter(b => b.status === 'failed').length, icon: AlertTriangle, color: "text-orange-500" },
  { label: "גיבויים אחרונים", value: mockBackups.filter(b => b.status === 'success').length, icon: HardDrive, color: "text-accent" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">דשבורד</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-2 border-border hover:border-accent transition-colors">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              פרויקטים אחרונים
              <Link to="/projects" className="text-sm font-normal text-accent hover:underline">הצג הכל</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockProjects.slice(0, 4).map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{
                    backgroundColor: project.status === 'active' ? '#22c55e' : project.status === 'paused' ? '#f59e0b' : '#94a3b8'
                  }} />
                  <div>
                    <p className="font-medium text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.language} • {project.platform === 'github' ? 'GitHub' : 'מקומי'}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-accent text-accent text-xs">
                  {statusLabels[project.status]}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Activity Chart */}
        <Card className="border-2 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">פעילות שבועית</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '2px solid hsl(43 76% 52%)' }}
                  labelStyle={{ fontFamily: 'Heebo' }}
                />
                <Bar dataKey="commits" fill="hsl(43 76% 52%)" radius={[6, 6, 0, 0]} name="שינויים" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Changes */}
      <Card className="border-2 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">שינויים אחרונים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockChangeLogs.slice(0, 5).map((log) => {
              const Icon = changeTypeIcons[log.type];
              return (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="mt-0.5 w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{log.description}</p>
                    <p className="text-xs text-muted-foreground">{log.projectName} • {log.date}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{changeTypeLabels[log.type]}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
