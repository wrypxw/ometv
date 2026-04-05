import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PIXUP_API = "https://api.pixupbr.com/v2";

async function getPixUpToken(clientId: string, clientSecret: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  console.log("PixUp token request - clientId length:", clientId.length, "secretLength:", clientSecret.length);
  const res = await fetch(`${PIXUP_API}/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Accept": "application/json",
    },
  });
  const txt = await res.text();
  console.log("PixUp token response:", res.status, txt);
  if (!res.ok) {
    let providerMessage = txt;
    try {
      const parsed = JSON.parse(txt);
      providerMessage = parsed?.message || parsed?.error || txt;
    } catch {
      // keep raw response text
    }
    throw new Error(`PixUp auth failed: ${res.status} ${providerMessage}`);
  }
  const data = JSON.parse(txt);
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

    // Get PixUp credentials from secure secrets
    const pixupClientId = (Deno.env.get("PIXUP_CLIENT_ID") || "").trim();
    const pixupClientSecret = (Deno.env.get("PIXUP_CLIENT_SECRET") || "").trim();

    if (!pixupClientId || !pixupClientSecret) {
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

    // Get PixUp access token
    let accessToken: string;
    try {
      accessToken = await getPixUpToken(pixupClientId, pixupClientSecret);
    } catch (e) {
      console.error("PixUp auth failed:", e);
      const message = e instanceof Error ? e.message : "Payment gateway authentication failed";
      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: "gateway_error", updated_at: new Date().toISOString() })
        .eq("id", transaction.id);
      return new Response(JSON.stringify({ error: message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create PIX payment via PixUp
    // PixUp API: POST /v2/pix/payment
    // amount is in float (reais), not cents
    const amountReais = finalPrice / 100;

    const pixBody = {
      amount: amountReais,
      description: `Compra de ${pkg.coins} moedas`,
      external_id: transaction.id,
      creditParty: {
        name: profile?.display_name || "Cliente",
        taxId: "00000000000",
      },
    };

    console.log("PixUp payment request:", JSON.stringify(pixBody));

    const pixRes = await fetch(`${PIXUP_API}/pix/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify(pixBody),
    });

    const pixData = await pixRes.json();
    console.log("PixUp payment response:", pixRes.status, JSON.stringify(pixData));

    if (!pixRes.ok || pixData.error) {
      console.error("PixUp payment error:", pixRes.status, JSON.stringify(pixData));
      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: "gateway_error", updated_at: new Date().toISOString() })
        .eq("id", transaction.id);
      return new Response(JSON.stringify({ error: pixData.message || "Failed to create PIX payment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction with PixUp payment ID
    await supabaseAdmin
      .from("payment_transactions")
      .update({
        mp_payment_id: pixData.id || pixData.external_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    // PixUp returns qrCode (the copia e cola string) and possibly qrCodeBase64
    return new Response(JSON.stringify({
      transaction_id: transaction.id,
      qr_code: pixData.qrCode || pixData.qr_code || pixData.brcode || "",
      qr_code_base64: pixData.qrCodeBase64 || pixData.qr_code_base64 || "",
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
