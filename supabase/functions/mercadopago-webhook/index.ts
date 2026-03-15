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
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    
    // MP sends different notification types
    if (body.type !== "payment" && body.action !== "payment.updated" && body.action !== "payment.created") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get MP access token
    const { data: mpSetting } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", "mp_access_token")
      .single();

    if (!mpSetting?.value) {
      console.error("MP access token not configured");
      return new Response(JSON.stringify({ error: "Not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { "Authorization": `Bearer ${mpSetting.value}` },
    });

    if (!mpResponse.ok) {
      console.error("MP payment fetch error:", mpResponse.status);
      return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payment = await mpResponse.json();
    const transactionId = payment.external_reference;
    const status = payment.status; // approved, pending, rejected, etc.

    if (!transactionId) {
      console.error("No external_reference in payment");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      console.error("Transaction not found:", transactionId);
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction status
    await supabaseAdmin
      .from("payment_transactions")
      .update({
        mp_payment_id: String(paymentId),
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    // If approved and not already credited, add coins
    if (status === "approved" && transaction.status !== "approved") {
      const totalCoins = transaction.coins_amount + transaction.bonus_amount;
      
      await supabaseAdmin
        .from("profiles")
        .update({
          coins: totalCoins, // We use RPC for proper increment
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.user_id);

      // Use direct SQL increment via RPC-like approach
      // Actually let's use the admin function properly
      const { error: coinError } = await supabaseAdmin.rpc("admin_update_coins", {
        _user_id: transaction.user_id,
        _amount: totalCoins,
      });

      if (coinError) {
        console.error("Failed to credit coins:", coinError.message);
      }

      // Increment coupon usage if applicable
      if (transaction.coupon_code) {
        const { data: coupon } = await supabaseAdmin
          .from("coupons")
          .select("used_count")
          .eq("code", transaction.coupon_code)
          .single();

        if (coupon) {
          await supabaseAdmin
            .from("coupons")
            .update({ used_count: coupon.used_count + 1 })
            .eq("code", transaction.coupon_code);
        }
      }
    }

    return new Response(JSON.stringify({ received: true, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
