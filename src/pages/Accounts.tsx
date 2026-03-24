import { useState } from "react";
import { Plus, Eye, EyeOff, Search, Key, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mockAccounts, mockProjects } from "@/data/mock-data";

export default function Accounts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const filtered = mockAccounts.filter((a) =>
    a.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">ניהול חשבונות</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="h-4 w-4 ml-2" /> חשבון חדש
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="border-2 border-accent">
            <DialogHeader><DialogTitle>הוסף חשבון חדש</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>שם השירות</Label><Input className="mt-1" placeholder="GitHub, Vercel..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>שם משתמש</Label><Input className="mt-1" /></div>
                <div><Label>אימייל</Label><Input className="mt-1" type="email" /></div>
              </div>
              <div><Label>סיסמה / טוקן</Label><Input className="mt-1" type="password" /></div>
              <div><Label>API Key (אופציונלי)</Label><Input className="mt-1" /></div>
              <div><Label>הערות</Label><Textarea className="mt-1" placeholder="הערות נוספות..." /></div>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">הוסף חשבון</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="חפש חשבון..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((account) => {
          const projects = mockProjects.filter(p => account.linkedProjects.includes(p.id));
          return (
            <Card key={account.id} className="border-2 border-border hover:border-accent transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Key className="h-4 w-4 text-accent" />
                  </div>
                  {account.serviceName}
                  <Badge variant="outline" className="mr-auto text-xs">{account.serviceType}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{account.username}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">אימייל:</span>
                  <span>{account.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">סיסמה:</span>
                  <span className="font-mono text-xs">{showPasswords[account.id] ? account.password : "••••••••"}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPasswords(s => ({ ...s, [account.id]: !s[account.id] }))}>
                    {showPasswords[account.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </Button>
                </div>
                {account.apiKey && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">API Key:</span>
                    <span className="font-mono text-xs">{showPasswords[`api-${account.id}`] ? account.apiKey : "••••••••"}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPasswords(s => ({ ...s, [`api-${account.id}`]: !s[`api-${account.id}`] }))}>
                      {showPasswords[`api-${account.id}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
                {projects.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">פרויקטים מקושרים:</p>
                    <div className="flex flex-wrap gap-1">
                      {projects.map(p => <Badge key={p.id} variant="secondary" className="text-xs">{p.name}</Badge>)}
                    </div>
                  </div>
                )}
                {account.notes && <p className="text-xs text-muted-foreground italic">{account.notes}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
