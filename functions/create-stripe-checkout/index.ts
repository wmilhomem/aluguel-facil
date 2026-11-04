import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || 'sk_test_dummy', {
  apiVersion: '2023-10-16',
  // @ts-ignore
  typescript: true,
});

interface CreateCheckoutSessionBody {
  priceId: string;
  userId: string;
  userEmail: string;
  success_url: string;
  cancel_url: string;
}

interface CreateCheckoutSessionResponse {
  sessionUrl?: string;
  error?: string;
  customerId?: string;
  subscriptionId?: string;
}

Deno.serve(async (req) => {
  const method = req.method;

  if (method === 'POST') {
    try {
      const body = await req.json();
      const { priceId, userId, userEmail, success_url, cancel_url } = body as CreateCheckoutSessionBody;

      // Check if user already has a customer or subscription
      const customerId = await getOrCreateCustomer(userId, userEmail);

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        customer: customerId,
        success_url: success_url,
        cancel_url: cancel_url,
        metadata: {
          userId,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });

      return new Response(
        JSON.stringify({
          sessionUrl: session.url,
          customerId,
          subscriptionId: session.subscription?.id,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error: any) {
      console.error('Erro na Edge Function create-stripe-checkout:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Erro interno' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  }

  // HEAD request for stripe webhook signature verification
  if (method === 'HEAD') {
    return new Response(null, { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
});

/**
 * Obtém ou cria um cliente Stripe para o usuário
 */
async function getOrCreateCustomer(userId: string, userEmail: string): Promise<string> {
  // Try to find existing customer by user metadata
  const customers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  });

  if (customers.data.length > 0) {
    return customers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: {
      userId,
    },
  });

  return customer.id;
}