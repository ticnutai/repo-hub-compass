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

    // Get all profiles with auto_sync_enabled and a github_token
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, github_token, sync_interval")
      .eq("auto_sync_enabled", true)
      .not("github_token", "is", null);

    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No users with auto-sync enabled", synced: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSynced = 0;
    let totalImported = 0;

    for (const profile of profiles) {
      // Get all GitHub projects for this user
      const { data: projects, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("platform", "github")
        .not("repo_url", "is", null);

      if (projErr || !projects) continue;

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
                Authorization: `Bearer ${profile.github_token}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          if (!githubRes.ok) continue;
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
              user_id: profile.user_id,
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
