import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import Stripe from 'stripe';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || 'sk_test_dummy', {
  apiVersion: '2023-10-16',
  // @ts-ignore
  typescript: true,
});

Deno.serve(async (req) => {
  const method = req.method;

  if (method === 'POST') {
    try {
      const body = await req.json();
      const { customerId, userId, return_url } = body;

      // Create portal session
      const session = await stripe.billingPortalsessions.create({
        customer: customerId,
        return_url: return_url,
      });

      return new Response(
        JSON.stringify({ url: session.url }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (error: any) {
      console.error('Erro na Edge Function create-portal-session:', error);
      return new Response(
        JSON.stringify({ error: error.message || 'Erro interno' }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
});