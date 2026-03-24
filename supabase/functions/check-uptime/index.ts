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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active monitors
    const { data: monitors, error } = await supabase
      .from("uptime_monitors")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;
    if (!monitors || monitors.length === 0) {
      return new Response(JSON.stringify({ message: "No active monitors" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const monitor of monitors) {
      const startTime = Date.now();
      let status = "down";
      let statusCode = 0;
      let errorMessage = "";

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(monitor.url, {
          method: "HEAD",
          signal: controller.signal,
          redirect: "follow",
        });
        clearTimeout(timeout);

        statusCode = res.status;
        status = res.status >= 200 && res.status < 400 ? "up" : "down";
      } catch (e: any) {
        errorMessage = e.message || "Connection failed";
        status = "down";
      }

      const responseTime = Date.now() - startTime;

      // Log the check
      await supabase.from("uptime_logs").insert({
        monitor_id: monitor.id,
        user_id: monitor.user_id,
        status,
        response_time: responseTime,
        status_code: statusCode,
        error_message: errorMessage || null,
      });

      // Calculate uptime percentage from last 100 checks
      const { data: recentLogs } = await supabase
        .from("uptime_logs")
        .select("status")
        .eq("monitor_id", monitor.id)
        .order("checked_at", { ascending: false })
        .limit(100);

      const upCount = (recentLogs || []).filter((l: any) => l.status === "up").length;
      const totalCount = (recentLogs || []).length;
      const uptimePercentage = totalCount > 0 ? ((upCount / totalCount) * 100).toFixed(2) : "100.00";

      // Update monitor
      await supabase
        .from("uptime_monitors")
        .update({
          last_status: status,
          last_checked_at: new Date().toISOString(),
          last_response_time: responseTime,
          uptime_percentage: uptimePercentage,
        })
        .eq("id", monitor.id);

      results.push({ id: monitor.id, name: monitor.name, status, responseTime });
    }

    return new Response(JSON.stringify({ checked: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Check uptime error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
