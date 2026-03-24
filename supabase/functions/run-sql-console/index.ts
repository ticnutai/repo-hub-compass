import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user
    const userClient = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { query } = await req.json();
    if (!query || typeof query !== "string") throw new Error("Missing query");

    // Safety: only allow SELECT queries for the console (read-only)
    const trimmed = query.trim().toLowerCase();
    const isReadOnly = trimmed.startsWith("select") || 
                       trimmed.startsWith("explain") || 
                       trimmed.startsWith("show") ||
                       trimmed.startsWith("\\d");

    if (!isReadOnly) {
      throw new Error("הקונסול תומך רק בשאילתות קריאה (SELECT). להרצת שינויים השתמש בטאב מיגרציות.");
    }

    // Execute query using service role
    const adminClient = createClient(supabaseUrl, supabaseKey);
    
    // Use rpc to run arbitrary select
    const { data, error } = await adminClient.rpc("execute_readonly_query" as any, { query_text: query });
    
    if (error) {
      // Fallback: try running via PostgREST 
      throw new Error(error.message);
    }

    return new Response(JSON.stringify({ data, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
