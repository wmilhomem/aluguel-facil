import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "STRIPE_SECRET_KEY não configurada no Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.json();
    const { priceId, userId, userEmail, success_url, cancel_url } = body;

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "priceId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "https://aluguelfacil.app";
    const successUrl = success_url || `${origin}/#dashboard?checkout=success`;
    const cancelUrl = cancel_url || `${origin}/#planos?checkout=cancel`;

    // Configuração oficial exigida:
    // payment_method_types: ['card', 'pix', 'boleto']
    // mode: 'subscription'
    // allow_promotion_codes: true
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "pix", "boleto"],
      mode: "subscription",
      allow_promotion_codes: true,
      subscription_data: {
        metadata: {
          user_id: userId || "",
        },
      },
      customer_email: userEmail || undefined,
      client_reference_id: userId || undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        user_id: userId || "",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, id: session.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro na criação do Stripe Checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno ao gerar checkout" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
