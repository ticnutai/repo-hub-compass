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

    const userClient = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error: authError } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { action, query } = await req.json();

    if (action === "console") {
      // Read-only console query
      const { data, error } = await userClient.rpc("execute_readonly_query", { query_text: query });
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ data, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "tables") {
      // List all tables
      const { data, error } = await userClient.rpc("execute_readonly_query", {
        query_text: `SELECT table_name, pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
                     FROM information_schema.tables 
                     WHERE table_schema = 'public' 
                     ORDER BY table_name`
      });
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ data, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "columns") {
      const { table } = await req.json().catch(() => ({}));
      const { data, error } = await userClient.rpc("execute_readonly_query", {
        query_text: `SELECT column_name, data_type, is_nullable, column_default
                     FROM information_schema.columns 
                     WHERE table_schema = 'public' AND table_name = '${query}'
                     ORDER BY ordinal_position`
      });
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ data, success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
