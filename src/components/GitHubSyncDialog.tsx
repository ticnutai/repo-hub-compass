import { useState } from "react";
import { Github, Loader2, Key } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  hasToken?: boolean;
}

export function GitHubSyncDialog({ open, onOpenChange, projectId, projectName, hasToken }: Props) {
  const [token, setToken] = useState("");
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");

      const body: Record<string, string> = { project_id: projectId };
      if (token.trim()) body.github_token = token;

      const projectId_ = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId_}.supabase.co/functions/v1/sync-github`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "שגיאה בסנכרון");

      toast.success(`סנכרון הושלם! ${result.imported} commits חדשים יובאו`);
      queryClient.invalidateQueries({ queryKey: ["changelogs"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSyncing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="border-2 border-accent max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" /> סנכרון מ-GitHub
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground">
            סנכרון commits אחרונים מהרפוזיטורי <strong>{projectName}</strong> ושמירתם כלוג שינויים.
          </p>

          {!hasToken && !hasSavedToken && (
            <div>
              <Label className="flex items-center gap-1">
                <Key className="h-3.5 w-3.5" /> GitHub Token
              </Label>
              <Input
                className="mt-1 font-mono text-sm"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground mt-1">הטוקן יישמר לסנכרונים עתידיים</p>
            </div>
          )}

          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={handleSync}
            disabled={syncing || (!hasToken && !token.trim())}
          >
            {syncing ? (
              <><Loader2 className="h-4 w-4 animate-spin ml-2" /> מסנכרן...</>
            ) : (
              <><Github className="h-4 w-4 ml-2" /> סנכרן עכשיו</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
