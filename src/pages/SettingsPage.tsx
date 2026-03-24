import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-2xl" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">הגדרות</h2>

      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">פרופיל</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>שם מלא</Label><Input className="mt-1" defaultValue="משתמש DevHub" /></div>
          <div><Label>אימייל</Label><Input className="mt-1" type="email" defaultValue="user@devhub.com" /></div>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">שמור שינויים</Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">גיבויים אוטומטיים</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>הפעל גיבויים אוטומטיים</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label>קבל התראות על גיבויים שנכשלו</Label>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader><CardTitle className="text-lg">חיבור GitHub</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>GitHub Token</Label><Input className="mt-1" type="password" placeholder="ghp_xxxxxxxxxxxx" /></div>
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90">חבר חשבון</Button>
        </CardContent>
      </Card>
    </div>
  );
}
