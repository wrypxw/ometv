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
    console.log("X1PAG webhook received:", JSON.stringify(body));

    // X1PAG sends customId which maps to our transaction ID (without dashes, first 20 chars)
    const customId = body.customId || body.custom_id;
    const status = body.status;
    const totalPaid = body.totalPaid || body.total;

    if (!customId) {
      console.error("No customId in webhook");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the transaction by matching the customId (which is transaction.id without dashes, first 20 chars)
    const { data: transactions } = await supabaseAdmin
      .from("payment_transactions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    const transaction = transactions?.find(tx => {
      const txCustomId = tx.id.replace(/-/g, "").slice(0, 20);
      return txCustomId === customId;
    });

    if (!transaction) {
      console.error("Transaction not found for customId:", customId);
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if it's a successful payment
    // X1PAG uses status "Paid" for successful payments
    const isPaid = status === "Paid" || status === "paid" || status === "PAID";
    
    // Check for rejection/failure
    const isFailed = body.updateCode && body.updateCode !== "00" && body.updateMessage;

    if (isPaid) {
      // Verify amount if available (X1PAG sends amount in cents)
      if (totalPaid && totalPaid !== transaction.amount_cents) {
        console.error("Amount mismatch:", totalPaid, "vs", transaction.amount_cents);
        await supabaseAdmin
          .from("payment_transactions")
          .update({ status: "amount_mismatch", updated_at: new Date().toISOString() })
          .eq("id", transaction.id);
        return new Response(JSON.stringify({ error: "Amount mismatch" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update to approved
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "approved",
          mp_payment_id: body.id || body.invoiceCode || null,
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
    } else if (isFailed) {
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "rejected",
          mp_payment_id: body.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);
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
