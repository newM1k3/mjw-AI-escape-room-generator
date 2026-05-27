import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import PocketBase from 'pocketbase';
import { errorResponse, jsonResponse, methodNotAllowed, requiredEnv } from './_utils';

async function authenticatePocketBase(pb: PocketBase) {
  const superuserToken = process.env.PB_SUPERUSER_TOKEN?.trim();

  if (superuserToken) {
    pb.authStore.save(superuserToken);
    return;
  }

  const pocketBaseAdminEmail = requiredEnv('PB_ADMIN_EMAIL');
  const pocketBaseAdminPassword = requiredEnv('PB_ADMIN_PASSWORD');
  await pb.collection('_superusers').authWithPassword(pocketBaseAdminEmail, pocketBaseAdminPassword);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return methodNotAllowed(['POST']);
  }

  try {
    const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
    const webhookSecret = requiredEnv('STRIPE_WEBHOOK_SECRET');
    const pocketBaseUrl = requiredEnv('PB_URL');
    const stripe = new Stripe(stripeSecretKey);
    const sig = event.headers['stripe-signature'];

    if (!sig) {
      return jsonResponse(400, { error: 'Missing stripe-signature header.' });
    }

    let stripeEvent: any;
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body || '', sig, webhookSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Webhook signature verification failed';
      return jsonResponse(400, { error: `Webhook signature verification failed: ${msg}` });
    }

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object as any;
      const userId = session.metadata?.userId;

      if (!userId) {
        return jsonResponse(400, { error: 'No userId was found in the Stripe session metadata.' });
      }

      const pb = new PocketBase(pocketBaseUrl);
      await authenticatePocketBase(pb);

      await pb.collection('users').update(userId, {
        tier: 'pro',
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : '',
      });
    }

    return jsonResponse(200, { received: true });
  } catch (err: unknown) {
    return errorResponse(err, 'Stripe webhook processing failed.');
  }
};
