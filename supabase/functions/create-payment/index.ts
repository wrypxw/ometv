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

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { package_id, coupon_code } = await req.json();
    if (!package_id) {
      return new Response(JSON.stringify({ error: "package_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get package
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("shop_packages")
      .select("*")
      .eq("id", package_id)
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

    // Validate coupon if provided
    if (coupon_code) {
      const code = String(coupon_code).toUpperCase().trim();
      if (code.length > 0 && code.length <= 50) {
        const { data: coupon } = await supabaseAdmin
          .from("coupons")
          .select("*")
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
    }

    // Calculate final price
    const originalPrice = pkg.price_cents;
    const discountAmount = Math.round(originalPrice * discountPercent / 100);
    const finalPrice = Math.max(0, originalPrice - discountAmount);

    // Get MP access token from site_settings
    const { data: mpSetting } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "mp_access_token")
      .single();

    if (!mpSetting?.value) {
      return new Response(JSON.stringify({ error: "Payment gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, display_name")
      .eq("id", user.id)
      .single();

    // Create transaction record
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
      return new Response(JSON.stringify({ error: "Failed to create transaction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Mercado Pago preference
    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${mpSetting.value}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [
          {
            title: `${pkg.coins + pkg.bonus} Coins`,
            quantity: 1,
            unit_price: finalPrice / 100,
            currency_id: "BRL",
          },
        ],
        payer: {
          email: profile?.email || user.email,
        },
        external_reference: transaction.id,
        back_urls: {
          success: `${req.headers.get("origin") || supabaseUrl}/shop?status=success`,
          failure: `${req.headers.get("origin") || supabaseUrl}/shop?status=failure`,
          pending: `${req.headers.get("origin") || supabaseUrl}/shop?status=pending`,
        },
        auto_return: "approved",
        notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      }),
    });

    if (!mpResponse.ok) {
      const errBody = await mpResponse.text();
      console.error("MP API error:", mpResponse.status, errBody);
      return new Response(JSON.stringify({ error: "Failed to create payment preference" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = await mpResponse.json();

    // Update transaction with MP preference ID
    await supabaseAdmin
      .from("payment_transactions")
      .update({ mp_preference_id: mpData.id, updated_at: new Date().toISOString() })
      .eq("id", transaction.id);

    return new Response(JSON.stringify({
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
      preference_id: mpData.id,
      transaction_id: transaction.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Create payment error:", error.message);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
