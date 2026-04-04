import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const X1PAG_BASE = "https://backoffice.x1pag.com.br";

async function getX1PagToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${X1PAG_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      clientid: clientId,
      clientsecret: clientSecret,
      grant_type: "password",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("X1PAG token error:", res.status, txt);
    throw new Error("Failed to authenticate with payment gateway");
  }
  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!anonKey) {
      return new Response(JSON.stringify({ error: "Payment authentication is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: authUser.id, email: authUser.email };

    // Parse body
    const rawBody = await req.json().catch(() => null);
    const packageId = typeof rawBody?.package_id === "string" ? rawBody.package_id.trim() : "";
    const couponCode = typeof rawBody?.coupon_code === "string" ? rawBody.coupon_code.trim() : "";

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(packageId)) {
      return new Response(JSON.stringify({ error: "package_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get package
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("shop_packages")
      .select("id, price_cents, coins, bonus, active")
      .eq("id", packageId)
      .eq("active", true)
      .single();

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found or inactive" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Coupon
    let discountPercent = 0;
    let appliedCoupon = "";

    if (couponCode) {
      const code = couponCode.toUpperCase().slice(0, 50);
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("code, discount_percent, expires_at, max_uses, used_count, active")
        .eq("code", code)
        .eq("active", true)
        .single();

      if (coupon) {
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        const notMaxed = !coupon.max_uses || coupon.used_count < coupon.max_uses;
        if (notExpired && notMaxed) {
          discountPercent = Math.min(100, Math.max(0, coupon.discount_percent));
          appliedCoupon = code;
        }
      }
    }

    const originalPrice = pkg.price_cents;
    const discountAmount = Math.round((originalPrice * discountPercent) / 100);
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    // Get X1PAG credentials from site_settings
    const { data: x1Settings } = await supabaseAdmin
      .from("site_settings")
      .select("key, value")
      .in("key", ["x1pag_client_id", "x1pag_client_secret", "x1pag_application_token"]);

    const x1Config: Record<string, string> = {};
    for (const s of x1Settings || []) {
      x1Config[s.key] = s.value?.trim() || "";
    }

    if (!x1Config.x1pag_client_id || !x1Config.x1pag_client_secret || !x1Config.x1pag_application_token) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", user.id)
      .single();

    const payerEmail = profile?.email || user.email;
    if (!payerEmail) {
      return new Response(JSON.stringify({ error: "User email is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create local transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        user_id: user.id,
        package_id: pkg.id,
        amount_cents: finalPrice,
        currency: "BRL",
        coins_amount: pkg.coins,
        bonus_amount: pkg.bonus,
        coupon_code: appliedCoupon || null,
        discount_percent: discountPercent,
        status: "pending",
      })
      .select("id")
      .single();

    if (txError || !transaction) {
      console.error("Failed to create transaction", txError);
      return new Response(JSON.stringify({ error: "Failed to create transaction" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get X1PAG access token
    let accessToken: string;
    try {
      accessToken = await getX1PagToken(x1Config.x1pag_client_id, x1Config.x1pag_client_secret);
    } catch (e) {
      console.error("X1PAG auth failed:", e);
      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: "gateway_error", updated_at: new Date().toISOString() })
        .eq("id", transaction.id);
      return new Response(JSON.stringify({ error: "Payment gateway authentication failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create PIX payment via X1PAG
    const webhookUrl = `${supabaseUrl}/functions/v1/x1pag-webhook`;
    const now = new Date();
    const dueDate = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

    const pixBody = {
      customId: transaction.id.replace(/-/g, "").slice(0, 20),
      amount: finalPrice,
      dueDate,
      txId: transaction.id.replace(/-/g, "").slice(0, 25),
      expiration: 600,
      customer: {
        name: profile?.display_name || "Cliente",
        email: payerEmail,
        cpfcnpj: "00000000000",
        address: "Endereco",
        neighborhood: "Bairro",
        city: "Cidade",
        state: "SP",
        country: "Brasil",
        zipcode: "00000000",
      },
      recipient: {
        name: profile?.display_name || "Cliente",
        cpfcnpj: "00000000000",
        email: payerEmail,
      },
      confirmationUrl: webhookUrl,
    };

    const pixRes = await fetch(`${X1PAG_BASE}/payment/pix`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ApplicationToken": x1Config.x1pag_application_token,
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(pixBody),
    });

    const pixData = await pixRes.json();

    if (!pixRes.ok || pixData.error) {
      console.error("X1PAG payment error:", pixRes.status, JSON.stringify(pixData));
      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: "gateway_error", updated_at: new Date().toISOString() })
        .eq("id", transaction.id);
      return new Response(JSON.stringify({ error: pixData.returnMessage || "Failed to create PIX payment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction with X1PAG payment ID
    await supabaseAdmin
      .from("payment_transactions")
      .update({
        mp_payment_id: pixData.id || pixData.customId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    return new Response(JSON.stringify({
      transaction_id: transaction.id,
      qr_code: pixData.qrCodeString || "",
      qr_code_base64: pixData.qrCodeBase64 || "",
      ticket_url: "",
      mp_payment_id: pixData.id || "",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create payment error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
