import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all GitHub accounts with per-account auto import enabled
    const { data: accounts, error: accountsError } = await supabase
      .from("accounts")
      .select("id, user_id, service_name, api_key, password, github_auto_import_enabled, github_import_interval_minutes, github_target_project_id, github_last_import_at")
      .eq("github_auto_import_enabled", true);

    if (accountsError) throw accountsError;
    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ message: "No GitHub accounts with auto-import enabled", synced: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSynced = 0;
    let totalImported = 0;

    for (const account of accounts) {
      const serviceName = (account.service_name || "").toLowerCase();
      if (!serviceName.includes("github")) continue;

      const token = account.api_key || account.password;
      if (!token) {
        await supabase.from("system_alerts" as any).insert({
          user_id: account.user_id,
          account_id: account.id,
          severity: "error",
          title: "חסר טוקן לחשבון GitHub",
          message: "ייבוא אוטומטי הופעל אבל לא הוגדר טוקן לחשבון.",
          status: "open",
        } as any);
        continue;
      }

      const intervalMinutes = Number(account.github_import_interval_minutes || 60);
      const lastImportAt = account.github_last_import_at ? new Date(account.github_last_import_at) : null;
      const now = new Date();

      if (lastImportAt) {
        const elapsedMs = now.getTime() - lastImportAt.getTime();
        if (elapsedMs < intervalMinutes * 60 * 1000) {
          continue;
        }
      }

      let projects: any[] = [];

      if (account.github_target_project_id) {
        const { data: targetProject } = await supabase
          .from("projects")
          .select("*")
          .eq("id", account.github_target_project_id)
          .eq("user_id", account.user_id)
          .eq("platform", "github")
          .not("repo_url", "is", null)
          .maybeSingle();

        if (targetProject) projects = [targetProject];
      } else {
        const { data: linkedProjects } = await supabase
          .from("account_projects")
          .select("project_id, projects(*)")
          .eq("account_id", account.id)
          .eq("user_id", account.user_id);

        projects = (linkedProjects || [])
          .map((row: any) => row.projects)
          .filter((project: any) => project && project.platform === "github" && project.repo_url);
      }

      for (const project of projects) {
        try {
          const repoMatch = project.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
          if (!repoMatch) continue;

          const owner = repoMatch[1];
          const repo = repoMatch[2].replace(/\.git$/, "");
          const since = project.last_synced_at || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

          const githubRes = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?since=${since}&per_page=50`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          if (!githubRes.ok) {
            await supabase.from("system_alerts" as any).insert({
              user_id: account.user_id,
              project_id: project.id,
              account_id: account.id,
              severity: "warning",
              title: "כשל בסנכרון אוטומטי",
              message: `GitHub API returned ${githubRes.status} עבור ${project.name}`,
              status: "open",
            } as any);
            continue;
          }
          const commits = await githubRes.json();

          for (const commit of commits) {
            const message = commit.commit.message.split("\n")[0].substring(0, 200);
            const date = commit.commit.author?.date || commit.commit.committer?.date;

            let changeType = "update";
            const lowerMsg = message.toLowerCase();
            if (lowerMsg.startsWith("feat") || lowerMsg.includes("add")) changeType = "feature";
            else if (lowerMsg.startsWith("fix") || lowerMsg.includes("bug")) changeType = "fix";
            else if (lowerMsg.includes("deploy") || lowerMsg.includes("release")) changeType = "deploy";

            const { error: insertError } = await supabase.from("changelogs").insert({
              user_id: account.user_id,
              project_id: project.id,
              description: message,
              change_type: changeType,
              created_at: date,
            });

            if (!insertError) totalImported++;
          }

          await supabase
            .from("projects")
            .update({ last_synced_at: new Date().toISOString() })
            .eq("id", project.id);

          totalSynced++;
        } catch {
          // skip individual project errors
        }
      }

      await supabase
        .from("accounts")
        .update({ github_last_import_at: new Date().toISOString() })
        .eq("id", account.id);
    }

    return new Response(
      JSON.stringify({ success: true, projects_synced: totalSynced, commits_imported: totalImported }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
