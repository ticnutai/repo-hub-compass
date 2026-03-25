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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { project_id, github_token } = await req.json();

    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", userId)
      .single();

    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (project.platform !== "github" || !project.repo_url) {
      return new Response(JSON.stringify({ error: "Not a GitHub project or missing repo URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try resolving token from a linked GitHub account first
    const { data: linkedAccounts } = await supabase
      .from("account_projects")
      .select("account_id, accounts(id, service_name, api_key, password)")
      .eq("project_id", project_id)
      .eq("user_id", userId);

    const linkedGithubAccount = (linkedAccounts || [])
      .map((row: any) => row.accounts)
      .find((account: any) => account && String(account.service_name || "").toLowerCase().includes("github"));

    const linkedGithubToken = linkedGithubAccount?.api_key || linkedGithubAccount?.password;

    // Determine token: explicit token, linked account token, then profile token
    let token = github_token;
    if (!token) {
      token = linkedGithubToken;
    }

    if (!token) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("github_token")
        .eq("user_id", userId)
        .single();
      token = profile?.github_token;
    }

    if (!token) {
      await supabase.from("system_alerts" as any).insert({
        user_id: userId,
        project_id,
        severity: "error",
        title: "חסר טוקן GitHub",
        message: "לא נמצא טוקן GitHub לפרויקט או לחשבון המקושר.",
        status: "open",
      } as any);
      return new Response(JSON.stringify({ error: "No GitHub token found. Please provide one." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If token was provided, persist it to linked account when possible, else fallback to profile
    if (github_token) {
      if (linkedGithubAccount?.id) {
        await supabase
          .from("accounts")
          .update({ api_key: github_token })
          .eq("id", linkedGithubAccount.id);
      } else {
        await supabase
          .from("profiles")
          .update({ github_token })
          .eq("user_id", userId);
      }
    }

    // Extract owner/repo from URL
    const repoMatch = project.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoMatch) {
      return new Response(JSON.stringify({ error: "Invalid GitHub repo URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const owner = repoMatch[1];
    const repo = repoMatch[2].replace(/\.git$/, "");

    // Fetch recent commits
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
      const errText = await githubRes.text();
      await supabase.from("system_alerts" as any).insert({
        user_id: userId,
        project_id,
        severity: "error",
        title: "שגיאת GitHub API",
        message: `GitHub API error [${githubRes.status}]`,
        status: "open",
      } as any);
      return new Response(JSON.stringify({ error: `GitHub API error [${githubRes.status}]: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const commits = await githubRes.json();

    // Insert commits as changelogs (skip duplicates by checking description)
    let imported = 0;
    for (const commit of commits) {
      const message = commit.commit.message.split("\n")[0].substring(0, 200);
      const date = commit.commit.author?.date || commit.commit.committer?.date;

      // Determine change type from commit message
      let changeType = "update";
      const lowerMsg = message.toLowerCase();
      if (lowerMsg.startsWith("feat") || lowerMsg.includes("add") || lowerMsg.includes("הוספ")) changeType = "feature";
      else if (lowerMsg.startsWith("fix") || lowerMsg.includes("bug") || lowerMsg.includes("תיקון")) changeType = "fix";
      else if (lowerMsg.includes("deploy") || lowerMsg.includes("release") || lowerMsg.includes("דיפלוי")) changeType = "deploy";

      const { error: insertError } = await supabase.from("changelogs").insert({
        user_id: userId,
        project_id: project_id,
        description: message,
        change_type: changeType,
        created_at: date,
      });

      if (!insertError) imported++;
    }

    // Update project's last_synced_at
    await supabase
      .from("projects")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", project_id);

    return new Response(
      JSON.stringify({ success: true, imported, total_commits: commits.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
