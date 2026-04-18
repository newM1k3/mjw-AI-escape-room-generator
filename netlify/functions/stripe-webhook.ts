import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import PocketBase from 'pocketbase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!sig) {
    return { statusCode: 400, body: 'Missing stripe-signature header' };
  }

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body || '', sig, webhookSecret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook signature verification failed';
    return { statusCode: 400, body: `Webhook error: ${msg}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (!userId) {
      return { statusCode: 400, body: 'No userId in session metadata' };
    }

    const pb = new PocketBase(process.env.VITE_POCKETBASE_URL || '');

    try {
      await pb.admins.authWithPassword(
        process.env.PB_ADMIN_EMAIL || '',
        process.env.PB_ADMIN_PASSWORD || ''
      );

      await pb.collection('users').update(userId, {
        tier: 'pro',
        stripe_customer_id: session.customer as string || '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PocketBase update failed';
      console.error('PocketBase update failed:', msg);
      return { statusCode: 500, body: `PocketBase error: ${msg}` };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
