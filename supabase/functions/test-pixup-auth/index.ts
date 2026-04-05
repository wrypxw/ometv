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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: pixSettings } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", ["pixup_client_id", "pixup_client_secret"]);

    const cfg: Record<string, string> = {};
    for (const s of pixSettings || []) cfg[s.key] = s.value?.trim() || "";

    const clientId = cfg.pixup_client_id;
    const clientSecret = cfg.pixup_client_secret;

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Missing credentials" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test 1: Basic Auth (current approach)
    const credentials1 = btoa(`${clientId}:${clientSecret}`);
    const res1 = await fetch("https://api.pixupbr.com/v2/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials1}`,
        "Accept": "application/json",
      },
    });
    const body1 = await res1.text();

    // Test 2: With Content-Type form-urlencoded and grant_type
    const res2 = await fetch("https://api.pixupbr.com/v2/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials1}`,
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const body2 = await res2.text();

    // Test 3: Credentials in body instead of header
    const res3 = await fetch("https://api.pixupbr.com/v2/oauth/token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}`,
    });
    const body3 = await res3.text();

    return new Response(JSON.stringify({
      credentials_used: { client_id: clientId, secret_length: clientSecret.length },
      test1_basic_auth: { status: res1.status, body: body1 },
      test2_form_grant: { status: res2.status, body: body2 },
      test3_body_creds: { status: res3.status, body: body3 },
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
