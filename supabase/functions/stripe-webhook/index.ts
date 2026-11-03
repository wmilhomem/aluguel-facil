import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

serve(async (req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseServiceRole) {
      return new Response("Missing env configuration", { status: 500 });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    const signature = req.headers.get("stripe-signature");
    const bodyText = await req.text();

    let event: Stripe.Event;

    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(bodyText, signature, webhookSecret);
    } else {
      // Sem verificação estrita apenas se webhookSecret não estiver configurado em desenvolvimento
      event = JSON.parse(bodyText);
    }

    console.log(`Recebido evento Stripe: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.user_id;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId) {
          await supabase
            .from("profiles")
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              plano_status: "ativo",
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status === "active" || subscription.status === "trialing" ? "ativo" : "inativo";
        const priceId = subscription.items.data[0]?.price?.id;

        let planoNome = "intermediario";
        if (priceId?.includes("27") || priceId?.includes("individual")) {
          planoNome = "individual";
        } else if (priceId?.includes("97") || priceId?.includes("profissional")) {
          planoNome = "profissional";
        }

        await supabase
          .from("profiles")
          .update({
            stripe_subscription_id: subscription.id,
            plano_status: status,
            plano_nome: planoNome,
            plano: planoNome === "individual" ? "1_imovel" : planoNome === "profissional" ? "ate_10_imoveis" : "ate_3_imoveis",
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from("profiles")
          .update({
            plano_status: "cancelado",
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      default:
        console.log(`Evento ${event.type} não processado`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro no processamento do webhook:", error);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});
