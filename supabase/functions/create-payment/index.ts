import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!anonKey) {
      console.error("Missing anon/publishable key in function environment");
      return new Response(JSON.stringify({ error: "Payment authentication is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authUser) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = { id: authUser.id, email: authUser.email };

    const rawBody = await req.json().catch(() => null);
    const packageId = typeof rawBody?.package_id === "string" ? rawBody.package_id.trim() : "";
    const couponCode = typeof rawBody?.coupon_code === "string" ? rawBody.coupon_code.trim() : "";

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(packageId)) {
      return new Response(JSON.stringify({ error: "package_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("shop_packages")
      .select("id, price_cents, coins, bonus, active")
      .eq("id", packageId)
      .eq("active", true)
      .single();

    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Package not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data: mpSetting } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "mp_access_token")
      .single();

    const accessToken = mpSetting?.value?.trim();
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", user.id)
      .single();

    const payerEmail = profile?.email || user.email;
    if (!payerEmail) {
      return new Response(JSON.stringify({ error: "User email is required to create payment" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": transaction.id,
      },
      body: JSON.stringify({
        transaction_amount: finalPrice / 100,
        description: `${pkg.coins + pkg.bonus} Coins`,
        payment_method_id: "pix",
        payer: {
          email: payerEmail,
        },
        external_reference: transaction.id,
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      }),
    });

    if (!mpResponse.ok) {
      const errBody = await mpResponse.text();
      console.error("MP API error:", mpResponse.status, errBody);

      await supabaseAdmin
        .from("payment_transactions")
        .update({ status: "gateway_error", updated_at: new Date().toISOString() })
        .eq("id", transaction.id);

      let safeMessage = "Failed to create PIX payment";
      if (mpResponse.status === 400) {
        safeMessage = "Payment gateway rejected the payment data";
      } else if (mpResponse.status === 401 || mpResponse.status === 403) {
        safeMessage = "Payment gateway credentials are invalid";
      }

      return new Response(JSON.stringify({ error: safeMessage }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = await mpResponse.json();
    const pixData = mpData.point_of_interaction?.transaction_data;

    if (!pixData?.qr_code) {
      console.error("Missing PIX payload in Mercado Pago response", mpData);

      await supabaseAdmin
        .from("payment_transactions")
        .update({
          mp_payment_id: mpData?.id ? String(mpData.id) : null,
          status: "gateway_error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      return new Response(JSON.stringify({ error: "Payment gateway did not return PIX data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabaseAdmin
      .from("payment_transactions")
      .update({ mp_payment_id: String(mpData.id), updated_at: new Date().toISOString() })
      .eq("id", transaction.id);

    return new Response(JSON.stringify({
      transaction_id: transaction.id,
      qr_code: pixData.qr_code || "",
      qr_code_base64: pixData.qr_code_base64 || "",
      ticket_url: pixData.ticket_url || "",
      mp_payment_id: String(mpData.id),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create payment error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
