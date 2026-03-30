import { useState } from "react";
import { Bot, Sparkles, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProject } from "@/hooks/use-data";
import { useQueryClient } from "@tanstack/react-query";

interface ProjectAISummaryProps {
  projectId: string;
  projectName: string;
}

export function ProjectAISummary({ projectId, projectName }: ProjectAISummaryProps) {
  const { data: project } = useProject(projectId);
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const summary = (project as any)?.ai_summary || null;
  const summaryDate = (project as any)?.ai_summary_updated_at;

  const generateSummary = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");

      const projectId_ = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId_}.supabase.co/functions/v1/summarize-project`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ project_id: projectId }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה ביצירת סיכום");

      // Save summary to database
      await supabase
        .from("projects")
        .update({
          ai_summary: data.summary,
          ai_summary_updated_at: new Date().toISOString(),
        } as any)
        .eq("id", projectId);

      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      toast.success("סיכום נוצר ונשמר בהצלחה!");
    } catch (e: any) {
      toast.error(e.message);
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    toast.success("הסיכום הועתק!");
    setTimeout(() => setCopied(false), 2000);
  };

  const renderInline = (text: string, keyPrefix: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, i) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        return (
          <strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-foreground">
            {boldMatch[1]}
          </strong>
        );
      }
      return <span key={`${keyPrefix}-t-${i}`}>{part}</span>;
    });
  };

  const renderSummary = (raw: string) => {
    const lines = raw.replace(/\r\n/g, "\n").split("\n");
    const blocks: JSX.Element[] = [];
    let bulletBuffer: string[] = [];
    let orderedBuffer: string[] = [];

    const flushBullets = () => {
      if (bulletBuffer.length === 0) return;
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pr-5 space-y-1 text-sm leading-7 marker:text-accent">
          {bulletBuffer.map((item, idx) => (
            <li key={`ul-item-${idx}`}>{renderInline(item, `ul-${blocks.length}-${idx}`)}</li>
          ))}
        </ul>
      );
      bulletBuffer = [];
    };

    const flushOrdered = () => {
      if (orderedBuffer.length === 0) return;
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="list-decimal pr-5 space-y-1 text-sm leading-7 marker:text-accent">
          {orderedBuffer.map((item, idx) => (
            <li key={`ol-item-${idx}`}>{renderInline(item, `ol-${blocks.length}-${idx}`)}</li>
          ))}
        </ol>
      );
      orderedBuffer = [];
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      if (!trimmed) {
        flushBullets();
        flushOrdered();
        return;
      }

      const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushBullets();
        flushOrdered();
        const level = heading[1].length;
        const content = heading[2].replace(/\*\*/g, "").trim();
        if (level <= 2) {
          blocks.push(
            <h3 key={`h-${index}`} className="text-lg font-bold text-foreground mt-3 first:mt-0">
              {content}
            </h3>
          );
        } else {
          blocks.push(
            <h4 key={`h-${index}`} className="text-base font-semibold text-foreground mt-2 first:mt-0">
              {content}
            </h4>
          );
        }
        return;
      }

      const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
      if (ordered) {
        flushBullets();
        orderedBuffer.push(ordered[1]);
        return;
      }

      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        flushOrdered();
        bulletBuffer.push(bullet[1]);
        return;
      }

      flushBullets();
      flushOrdered();
      blocks.push(
        <p key={`p-${index}`} className="text-sm leading-7 text-foreground/90">
          {renderInline(trimmed, `p-${index}`)}
        </p>
      );
    });

    flushBullets();
    flushOrdered();
    return blocks;
  };

  return (
    <Card className="border-2 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            סיכום AI של הפרויקט
            {summaryDate && (
              <span className="text-xs font-normal text-muted-foreground">
                (עודכן: {new Date(summaryDate).toLocaleDateString("he-IL")})
              </span>
            )}
          </CardTitle>
          <Button
            onClick={generateSummary}
            disabled={loading}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            <Sparkles className="h-4 w-4 ml-2" />
            {loading ? "מנתח..." : summary ? "נתח מחדש" : "צור סיכום"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
              <p className="text-sm text-muted-foreground">
                מנתח את הפרויקט "{projectName}" ויוצר סיכום מקיף...
              </p>
            </div>
          </div>
        )}

        {!loading && !summary && (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              לחץ על "צור סיכום" כדי שה-AI ינתח את הפרויקט ויכתוב סיכום מקיף בעברית
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              כולל ניתוח קבצי README, טכנולוגיות, שינויים וחיבורים • הסיכום נשמר אוטומטית
            </p>
          </div>
        )}

        {!loading && summary && (
          <div className="relative">
            <div className="absolute top-2 left-2 z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <div className="bg-secondary/50 rounded-lg p-4 pt-10 space-y-3 border border-border/50">
              {renderSummary(summary)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
