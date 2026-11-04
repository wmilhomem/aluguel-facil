import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || 'sk_test_dummy', {
  apiVersion: '2023-10-16',
  // @ts-ignore
  typescript: true,
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || 'whsec_dummy';

Deno.serve(async (req) => {
  const method = req.method;

  if (method === 'POST') {
    try {
      const body = await req.text();
      const signature = req.headers.get('stripe-signature') || '';

      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const { customer, subscription, client_reference_id, metadata } = session;

          // Update profile with Stripe IDs
          if (metadata?.userId && subscription) {
            try {
              const supabase = await import('../lib/supabase').then((mod) => mod.supabase);
              await supabase
                .from('profiles')
                .update({
                  stripe_customer_id: customer,
                  stripe_subscription_id: subscription,
                  plano_status: 'ativo',
                })
                .eq('id', metadata.userId);
            } catch (err) {
              console.error('Erro ao atualizar perfil Stripe:', err);
            }
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscription = invoice.subscription as string;
          const customer = invoice.customer as string;

          // Find user by customer ID and update status
          try {
            const { data: profiles } = await import('../lib/supabase')
              .then((mod) => mod.supabase)
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', customer);

            if (profiles.data && profiles.data.length > 0) {
              await import('../lib/supabase')
                .then((mod) => mod.supabase)
                .from('profiles')
                .update({ plano_status: 'ativo' })
                .eq('id', profiles.data[0].id);
            }
          } catch (err) {
            console.error('Erro ao atualizar assinatura paga:', err);
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscription = invoice.subscription as string;
          const customer = invoice.customer as string;

          // Find user by customer ID and update status
          try {
            const { data: profiles } = await import('../lib/supabase')
              .then((mod) => mod.supabase)
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', customer);

            if (profiles.data && profiles.data.length > 0) {
              await import('../lib/supabase')
                .then((mod) => mod.supabase)
                .from('profiles')
                .update({ plano_status: 'inativo' })
                .eq('id', profiles.data[0].id);
            }
          } catch (err) {
            console.error('Erro ao atualizar falha de pagamento:', err);
          }
          break;
        }

        case 'subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = subscription.customer as string;

          // Update profile status based on subscription status
          const statusMap: Record<string, string> = {
            'trialing': 'trial',
            'active': 'ativo',
            'past_due': 'atrasado',
            'canceled': 'cancelado',
            'unpaid': 'inativo',
          };

          const status = statusMap[subscription.status] || 'inativo';

          try {
            const { data: profiles } = await import('../lib/supabase')
              .then((mod) => mod.supabase)
              .from('profiles')
              .select('id, stripe_subscription_id')
              .eq('stripe_customer_id', customer);

            if (profiles.data && profiles.data.length > 0) {
              await import('../lib/supabase')
                .then((mod) => mod.supabase)
                .from('profiles')
                .update({ plano_status: status, stripe_subscription_id: subscription.id })
                .eq('id', profiles.data[0].id);
            }
          } catch (err) {
            console.error('Erro ao atualizar assinatura:', err);
          }
          break;
        }

        case 'subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customer = subscription.customer as string;

          try {
            const { data: profiles } = await import('../lib/supabase')
              .then((mod) => mod.supabase)
              .from('profiles')
              .select('id')
              .eq('stripe_customer_id', customer);

            if (profiles.data && profiles.data.length > 0) {
              await import('../lib/supabase')
                .then((mod) => mod.supabase)
                .from('profiles')
                .update({ plano_status: 'cancelado' })
                .eq('id', profiles.data[0].id);
            }
          } catch (err) {
            console.error('Erro ao cancelar assinatura:', err);
          }
          break;
        }

        default:
          console.log(`📦 Evento não tratado: ${event.type}`);
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    } catch (error: any) {
      console.error('Erro na Edge Function stripe-webhook:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
});