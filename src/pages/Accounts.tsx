import { useState } from "react";
import { Plus, Eye, EyeOff, Search, Key, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts, useCreateAccount } from "@/hooks/use-data";
import { toast } from "sonner";

export default function Accounts() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const [searchQuery, setSearchQuery] = useState("");
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);

  const [newService, setNewService] = useState("");
  const [newType, setNewType] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const filtered = (accounts || []).filter(a =>
    a.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newService.trim()) return;
    try {
      await createAccount.mutateAsync({
        service_name: newService, service_type: newType, username: newUsername,
        email: newEmail, password: newPassword, api_key: newApiKey || undefined, notes: newNotes,
      });
      toast.success("חשבון נוסף בהצלחה!");
      setOpen(false);
      setNewService(""); setNewType(""); setNewUsername(""); setNewEmail(""); setNewPassword(""); setNewApiKey(""); setNewNotes("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">ניהול חשבונות</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="h-4 w-4 ml-2" /> חשבון חדש</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="border-2 border-accent">
            <DialogHeader><DialogTitle>הוסף חשבון חדש</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>שם השירות</Label><Input className="mt-1" value={newService} onChange={e => setNewService(e.target.value)} placeholder="GitHub, Vercel..." /></div>
                <div><Label>סוג</Label><Input className="mt-1" value={newType} onChange={e => setNewType(e.target.value)} placeholder="קוד, אחסון..." /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>שם משתמש</Label><Input className="mt-1" value={newUsername} onChange={e => setNewUsername(e.target.value)} /></div>
                <div><Label>אימייל</Label><Input className="mt-1" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
              </div>
              <div><Label>סיסמה / טוקן</Label><Input className="mt-1" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
              <div><Label>API Key (אופציונלי)</Label><Input className="mt-1" value={newApiKey} onChange={e => setNewApiKey(e.target.value)} /></div>
              <div><Label>הערות</Label><Textarea className="mt-1" value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="הערות נוספות..." /></div>
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCreate} disabled={createAccount.isPending}>
                {createAccount.isPending ? "מוסיף..." : "הוסף חשבון"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="חפש חשבון..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pr-10" />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((account) => (
            <Card key={account.id} className="border-2 border-border hover:border-accent transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Key className="h-4 w-4 text-accent" />
                  </div>
                  {account.service_name}
                  {account.service_type && <Badge variant="outline" className="mr-auto text-xs">{account.service_type}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {account.username && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{account.username}</span>
                  </div>
                )}
                {account.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">אימייל:</span>
                    <span>{account.email}</span>
                  </div>
                )}
                {account.password && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">סיסמה:</span>
                    <span className="font-mono text-xs">{showPasswords[account.id] ? account.password : "••••••••"}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPasswords(s => ({ ...s, [account.id]: !s[account.id] }))}>
                      {showPasswords[account.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
                {account.api_key && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">API Key:</span>
                    <span className="font-mono text-xs">{showPasswords[`api-${account.id}`] ? account.api_key : "••••••••"}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPasswords(s => ({ ...s, [`api-${account.id}`]: !s[`api-${account.id}`] }))}>
                      {showPasswords[`api-${account.id}`] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                )}
                {account.notes && <p className="text-xs text-muted-foreground italic">{account.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Key className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">אין חשבונות עדיין</p>
        </div>
      )}
    </div>
  );
}
