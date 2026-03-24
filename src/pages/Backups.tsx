import { HardDrive, CheckCircle, XCircle, Clock, Download, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { mockBackups, mockProjects } from "@/data/mock-data";

const statusConfig = {
  success: { label: "הצליח", icon: CheckCircle, color: "text-green-600", badge: "bg-green-100 text-green-700 border-green-300" },
  failed: { label: "נכשל", icon: XCircle, color: "text-red-500", badge: "bg-red-100 text-red-700 border-red-300" },
  pending: { label: "ממתין", icon: Clock, color: "text-amber-500", badge: "bg-amber-100 text-amber-700 border-amber-300" },
};

export default function Backups() {
  const successCount = mockBackups.filter(b => b.status === 'success').length;
  const failedCount = mockBackups.filter(b => b.status === 'failed').length;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">גיבויים</h2>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
          <HardDrive className="h-4 w-4 ml-2" /> גיבוי כל הפרויקטים
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div><p className="text-xl font-bold">{successCount}</p><p className="text-sm text-muted-foreground">הצליחו</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div><p className="text-xl font-bold">{failedCount}</p><p className="text-sm text-muted-foreground">נכשלו</p></div>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <HardDrive className="h-5 w-5 text-accent" />
            </div>
            <div><p className="text-xl font-bold">{mockBackups.length}</p><p className="text-sm text-muted-foreground">סה״כ גיבויים</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">היסטוריית גיבויים</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">פרויקט</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right">גודל</TableHead>
                <TableHead className="text-right">סוג</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockBackups.map((backup) => {
                const config = statusConfig[backup.status];
                const StatusIcon = config.icon;
                return (
                  <TableRow key={backup.id}>
                    <TableCell className="font-medium">{backup.projectName}</TableCell>
                    <TableCell>{backup.date}</TableCell>
                    <TableCell>{backup.size}</TableCell>
                    <TableCell>{backup.type === 'auto' ? 'אוטומטי' : 'ידני'}</TableCell>
                    <TableCell>
                      <Badge className={config.badge}>
                        <StatusIcon className="h-3 w-3 ml-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8"><Download className="h-4 w-4" /></Button>
                        {backup.status === 'failed' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-accent"><RefreshCw className="h-4 w-4" /></Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
