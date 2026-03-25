import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-github-event, x-hub-signature-256, x-webhook-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const expectedToken = Deno.env.get("GITHUB_WEBHOOK_TOKEN");
    const providedToken = req.headers.get("x-webhook-token");

    if (expectedToken && providedToken !== expectedToken) {
      return new Response(JSON.stringify({ error: "Unauthorized webhook token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const githubEvent = req.headers.get("x-github-event") || "";
    const payload = await req.json();

    if (githubEvent !== "push") {
      return new Response(JSON.stringify({ ok: true, ignored: true, reason: "Only push events are handled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const repoUrl = payload?.repository?.html_url as string | undefined;
    const commits = Array.isArray(payload?.commits) ? payload.commits : [];

    if (!repoUrl) {
      return new Response(JSON.stringify({ error: "repository.html_url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const normalizedRepoUrl = repoUrl.replace(/\.git$/, "");

    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("id, user_id, name, repo_url")
      .eq("platform", "github")
      .or(`repo_url.eq.${normalizedRepoUrl},repo_url.eq.${repoUrl}`);

    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) {
      return new Response(JSON.stringify({ ok: true, matched_projects: 0, imported: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imported = 0;

    for (const project of projects) {
      for (const commit of commits.slice(0, 25)) {
        const message = String(commit?.message || "Commit from webhook").split("\n")[0].slice(0, 200);
        const author = String(commit?.author?.name || "GitHub");
        const timestamp = commit?.timestamp || new Date().toISOString();

        let changeType = "update";
        const lower = message.toLowerCase();
        if (lower.startsWith("feat") || lower.includes("add")) changeType = "feature";
        else if (lower.startsWith("fix") || lower.includes("bug")) changeType = "fix";
        else if (lower.includes("deploy") || lower.includes("release")) changeType = "deploy";

        const { error: insertErr } = await supabase.from("changelogs").insert({
          user_id: project.user_id,
          project_id: project.id,
          description: `${message} (${author})`,
          change_type: changeType,
          created_at: timestamp,
        });

        if (!insertErr) imported++;
      }

      await supabase
        .from("projects")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", project.id);

      await supabase.from("system_alerts" as any).insert({
        user_id: project.user_id,
        project_id: project.id,
        severity: "info",
        title: "Webhook התקבל",
        message: `התקבלו ${Math.min(commits.length, 25)} קומיטים מ-GitHub עבור ${project.name}`,
        status: "open",
      } as any);
    }

    return new Response(JSON.stringify({ ok: true, matched_projects: projects.length, imported }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
