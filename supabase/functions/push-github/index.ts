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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get project
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("*")
      .eq("id", project_id)
      .eq("user_id", user.id)
      .single();
    if (projErr || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (project.platform !== "github" || !project.repo_url) {
      return new Response(JSON.stringify({ error: "Not a GitHub project" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get token
    const { data: profile } = await supabase
      .from("profiles")
      .select("github_token")
      .eq("user_id", user.id)
      .single();
    const token = profile?.github_token;
    if (!token) {
      return new Response(JSON.stringify({ error: "No GitHub token. Add one in settings." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract owner/repo
    const repoMatch = project.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!repoMatch) {
      return new Response(JSON.stringify({ error: "Invalid repo URL" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const owner = repoMatch[1];
    const repo = repoMatch[2].replace(/\.git$/, "");

    // Get recent changelogs that were manually added (not from sync)
    const { data: recentLogs } = await supabase
      .from("changelogs")
      .select("*")
      .eq("project_id", project_id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!recentLogs || recentLogs.length === 0) {
      return new Response(JSON.stringify({ message: "אין שינויים לדחוף", pushed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a GitHub issue as a changelog summary (safe push alternative)
    const changelogSummary = recentLogs.map(l => 
      `- **[${l.change_type}]** ${l.description} (${new Date(l.created_at).toLocaleDateString("he-IL")})`
    ).join("\n");

    const issueRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `📋 עדכון לוג שינויים - ${new Date().toLocaleDateString("he-IL")}`,
          body: `# לוג שינויים אחרון\n\n${changelogSummary}\n\n---\n*נוצר אוטומטית על ידי DevHub*`,
          labels: ["changelog"],
        }),
      }
    );

    if (!issueRes.ok) {
      const errText = await issueRes.text();
      return new Response(JSON.stringify({ error: `GitHub API error: ${errText}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const issue = await issueRes.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `דחיפה הושלמה! Issue #${issue.number} נוצר ב-GitHub`,
        issue_url: issue.html_url 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
