import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { project_id } = await req.json();
    if (!project_id) throw new Error("Missing project_id");

    // Fetch project data
    const { data: project } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .single();
    if (!project) throw new Error("Project not found");

    // Fetch related data in parallel
    const [changelogsRes, servicesRes, envVarsRes, linksRes, connectionsRes] = await Promise.all([
      supabase.from("changelogs").select("*").eq("project_id", project_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("project_services").select("*").eq("project_id", project_id),
      supabase.from("project_env_vars").select("var_name, source_file, is_secret").eq("project_id", project_id),
      supabase.from("project_links").select("*").eq("project_id", project_id),
      supabase.from("service_connection_projects").select("*, service_connections(*)").eq("project_id", project_id),
    ]);

    // Fetch README from GitHub if available
    let readmeContent = "";
    if (project.platform === "github" && project.repo_url) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("github_token")
        .eq("user_id", user.id)
        .single();

      if (profile?.github_token) {
        const repoPath = project.repo_url.replace("https://github.com/", "");
        const headers: Record<string, string> = {
          Authorization: `token ${profile.github_token}`,
          Accept: "application/vnd.github.v3.raw",
        };

        // Try fetching README
        for (const filename of ["README.md", "readme.md", "README.rst", "README"]) {
          try {
            const res = await fetch(`https://api.github.com/repos/${repoPath}/contents/${filename}`, { headers });
            if (res.ok) {
              readmeContent = await res.text();
              if (readmeContent.length > 4000) readmeContent = readmeContent.substring(0, 4000) + "\n...(truncated)";
              break;
            }
          } catch { /* skip */ }
        }

        // Also try package.json for extra context
        try {
          const res = await fetch(`https://api.github.com/repos/${repoPath}/contents/package.json`, { headers });
          if (res.ok) {
            const pkgRaw = await res.text();
            const pkg = JSON.parse(pkgRaw);
            readmeContent += `\n\n--- package.json ---\nName: ${pkg.name || ""}\nDescription: ${pkg.description || ""}\nDependencies: ${Object.keys(pkg.dependencies || {}).join(", ")}\nDevDependencies: ${Object.keys(pkg.devDependencies || {}).join(", ")}`;
          }
        } catch { /* skip */ }
      }
    }

    // Build context for AI
    const changelogs = changelogsRes.data || [];
    const services = servicesRes.data || [];
    const envVars = envVarsRes.data || [];
    const links = linksRes.data || [];
    const connections = connectionsRes.data || [];

    const contextParts = [
      `שם הפרויקט: ${project.name}`,
      `תיאור: ${project.description || "אין תיאור"}`,
      `שפת תכנות: ${project.language || "לא צוין"}`,
      `קטגוריה: ${project.category || "לא צוין"}`,
      `פלטפורמה: ${project.platform}`,
      `סטטוס: ${project.status}`,
      `תגיות: ${(project.tags || []).join(", ") || "אין"}`,
      `תאריך יצירה: ${project.created_at}`,
      `עדכון אחרון: ${project.updated_at}`,
    ];

    if (project.repo_url) contextParts.push(`Repository URL: ${project.repo_url}`);

    if (changelogs.length > 0) {
      contextParts.push(`\nהיסטוריית שינויים (${changelogs.length} אחרונים):`);
      changelogs.forEach((c: any) => contextParts.push(`  - [${c.change_type}] ${c.description} (${c.created_at})`));
    }

    if (services.length > 0) {
      contextParts.push(`\nשירותים וטכנולוגיות (${services.length}):`);
      services.forEach((s: any) => contextParts.push(`  - ${s.service_name} (${s.service_type}) v${s.version || "?"}`));
    }

    if (envVars.length > 0) {
      contextParts.push(`\nמשתני סביבה (${envVars.length}):`);
      envVars.forEach((v: any) => contextParts.push(`  - ${v.var_name} (מקור: ${v.source_file || "ידני"})`));
    }

    if (links.length > 0) {
      contextParts.push(`\nקישורים:`);
      links.forEach((l: any) => contextParts.push(`  - ${l.label}: ${l.url || l.value || ""}`));
    }

    if (connections.length > 0) {
      contextParts.push(`\nחיבורים חיצוניים:`);
      connections.forEach((c: any) => {
        const sc = (c as any).service_connections;
        if (sc) contextParts.push(`  - ${sc.service_name} (${sc.service_category}/${sc.provider})`);
      });
    }

    if (readmeContent) {
      contextParts.push(`\n--- README ---\n${readmeContent}`);
    }

    const fullContext = contextParts.join("\n");

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `אתה מנתח פרויקטים מקצועי. התפקיד שלך הוא לנתח את כל המידע שמתקבל על פרויקט ולכתוב סיכום מקיף ומסודר בעברית.

הסיכום צריך לכלול:
1. **סקירה כללית** - מה הפרויקט, מה המטרה שלו
2. **טכנולוגיות וכלים** - באילו שפות, פריימוורקים וכלים הפרויקט משתמש
3. **מבנה ורכיבים** - מה הרכיבים העיקריים של הפרויקט
4. **חיבורים ושילובים** - לאילו שירותים חיצוניים הפרויקט מחובר
5. **סטטוס ופעילות** - מצב הפרויקט הנוכחי ופעילות אחרונה
6. **המלצות** - הצעות לשיפור או שימת לב

כתוב בעברית תקנית, בצורה מקצועית ומסודרת עם כותרות ותבליטים.`
          },
          {
            role: "user",
            content: `נתח את הפרויקט הבא וכתוב סיכום מקיף:\n\n${fullContext}`,
          },
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "מגבלת בקשות - נסה שוב בעוד כמה דקות" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "נדרשת הוספת קרדיטים - עבור להגדרות > שימוש" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      throw new Error("שגיאה בניתוח AI");
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "לא התקבל סיכום";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
