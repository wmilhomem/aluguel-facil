import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

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
    const { priceId, success_url, cancel_url } = body;

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "priceId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const allowedPrices = [
      Deno.env.get("STRIPE_PRICE_INDIVIDUAL"),
      Deno.env.get("STRIPE_PRICE_INTERMEDIARIO"),
      Deno.env.get("STRIPE_PRICE_PROFISSIONAL"),
      Deno.env.get("VITE_STRIPE_PRICE_INDIVIDUAL"),
      Deno.env.get("VITE_STRIPE_PRICE_INTERMEDIARIO"),
      Deno.env.get("VITE_STRIPE_PRICE_PROFISSIONAL"),
    ].filter((value): value is string => Boolean(value));

    if (!allowedPrices.includes(priceId)) {
      return new Response(
        JSON.stringify({ error: "priceId não autorizado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Supabase não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({ error: "Sessão inválida" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;
    const userEmail = authData.user.email ?? "";

    const origin = req.headers.get("origin") || "https://aluguelfacil.app";
    const successUrl = success_url || `${origin}/#dashboard?checkout=success`;
    const cancelUrl = cancel_url || `${origin}/#planos?checkout=cancel`;

    // Assinaturas aceitam apenas cartão. Pix/Boleto não são suportados em mode: 'subscription'.
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
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
