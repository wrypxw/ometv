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

    const body = await req.json();
    console.log("PixUp webhook received:", JSON.stringify(body));

    // PixUp sends external_id which is our transaction.id
    const externalId = body.external_id || body.externalId;
    const status = body.status;

    if (!externalId) {
      console.error("No external_id in webhook");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the transaction by external_id (which is the transaction UUID)
    const { data: transaction } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("id", externalId)
      .eq("status", "pending")
      .single();

    if (!transaction) {
      console.error("Transaction not found for external_id:", externalId);
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if payment is successful
    // PixUp uses status like "paid", "approved", "completed"
    const isPaid = ["paid", "approved", "completed", "Paid", "PAID", "Approved", "APPROVED"].includes(status);
    const isFailed = ["failed", "rejected", "cancelled", "expired", "Failed", "FAILED"].includes(status);

    if (isPaid) {
      // Update to approved
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "approved",
          mp_payment_id: body.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      // Credit coins
      const totalCoins = transaction.coins_amount + transaction.bonus_amount;
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("coins")
        .eq("id", transaction.user_id)
        .single();

      if (profile) {
        await supabaseAdmin
          .from("profiles")
          .update({
            coins: profile.coins + totalCoins,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transaction.user_id);
      }

      // Increment coupon usage
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

      console.log("Payment approved, credited", totalCoins, "coins to user", transaction.user_id);
    } else if (isFailed) {
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "rejected",
          mp_payment_id: body.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);
      console.log("Payment rejected for transaction", transaction.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
