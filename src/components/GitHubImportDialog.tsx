import { useState, useEffect } from "react";
import { Github, Loader2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCreateProject, useProfile } from "@/hooks/use-data";
import { toast } from "sonner";

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  updated_at: string;
  topics: string[];
  private: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubImportDialog({ open, onOpenChange }: Props) {
  const { data: profile } = useProfile();
  const [token, setToken] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [step, setStep] = useState<"token" | "select">("token");
  const createProject = useCreateProject();

  const savedToken = profile?.github_token;

  // Auto-fetch repos if saved token exists
  useEffect(() => {
    if (open && savedToken && step === "token" && repos.length === 0) {
      fetchRepos(savedToken);
    }
  }, [open, savedToken]);

  const fetchRepos = async (useToken?: string) => {
    const t = useToken || token.trim();
    if (!t) return;
    setLoading(true);
    try {
      const res = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated", {
        headers: { Authorization: `Bearer ${t}`, Accept: "application/vnd.github.v3+json" },
      });
      if (!res.ok) throw new Error("טוקן לא תקין או שגיאת API");
      const data: GitHubRepo[] = await res.json();
      setRepos(data);
      setStep("select");
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const toggleRepo = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importSelected = async () => {
    setImporting(true);
    const toImport = repos.filter((r) => selected.has(r.id));
    let success = 0;
    for (const repo of toImport) {
      try {
        await createProject.mutateAsync({
          name: repo.name,
          description: repo.description || "",
          platform: "github",
          language: repo.language || "",
          tags: repo.topics?.slice(0, 5) || [],
          repo_url: repo.html_url,
        });
        success++;
      } catch { /* skip */ }
    }
    toast.success(`${success} פרויקטים יובאו בהצלחה!`);
    setImporting(false);
    onOpenChange(false);
    setStep("token");
    setSelected(new Set());
    setRepos([]);
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setStep("token");
      setSelected(new Set());
      setRepos([]);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent dir="rtl" className="border-2 border-accent max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" /> ייבוא מ-GitHub
          </DialogTitle>
        </DialogHeader>

        {step === "token" && !loading && (
          <div className="space-y-4 mt-2">
            {savedToken ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700">טוען רפוזיטוריים עם הטוקן השמור...</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  הזן GitHub Personal Access Token כדי לטעון את הרפוזיטוריים שלך.{" "}
                  <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener" className="text-accent hover:underline">
                    צור טוקן חדש
                  </a>
                </p>
                <div>
                  <Label>GitHub Token</Label>
                  <Input className="mt-1 font-mono text-sm" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_xxxxxxxxxxxx" />
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => fetchRepos()} disabled={!token.trim()}>
                  טען רפוזיטוריים
                </Button>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">טוען רפוזיטוריים...</p>
          </div>
        )}

        {step === "select" && !loading && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">נמצאו {repos.length} רפוזיטוריים. בחר אילו לייבא:</p>
              <Button variant="ghost" size="sm" onClick={() => {
                if (selected.size === repos.length) setSelected(new Set());
                else setSelected(new Set(repos.map(r => r.id)));
              }}>
                {selected.size === repos.length ? "בטל הכל" : "בחר הכל"}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-2 space-y-1">
                {repos.map((repo) => (
                  <label key={repo.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary cursor-pointer transition-colors">
                    <Checkbox checked={selected.has(repo.id)} onCheckedChange={() => toggleRepo(repo.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{repo.name}</span>
                        {repo.private && <Badge variant="outline" className="text-xs">פרטי</Badge>}
                      </div>
                      {repo.description && <p className="text-xs text-muted-foreground truncate">{repo.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        {repo.language && <span className="text-xs text-accent">{repo.language}</span>}
                        <span className="text-xs text-muted-foreground">{new Date(repo.updated_at).toLocaleDateString("he-IL")}</span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setStep("token"); setRepos([]); }}>חזור</Button>
              <Button className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" onClick={importSelected} disabled={selected.size === 0 || importing}>
                {importing ? <><Loader2 className="h-4 w-4 animate-spin ml-2" /> מייבא...</> : <><Check className="h-4 w-4 ml-2" /> ייבא {selected.size} פרויקטים</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
