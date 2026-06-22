import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import PocketBase from 'pocketbase';
import { emptyOptionsResponse, errorResponse, jsonResponse, methodNotAllowed, requiredEnv } from './_utils';
import { getSuperuserPb } from './pbSuperuser';

type ProEntitlementPayload = {
  tier: 'pro';
  role: 'pro';
  is_pro: true;
  stripe_customer_id: string;
  stripe_checkout_session_id: string;
  pro_purchased_at: string;
};

function getSessionCustomerId(session: Stripe.Checkout.Session): string {
  if (typeof session.customer === 'string') return session.customer;
  return session.customer?.id || '';
}

function getRequiredSessionMetadata(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.pocketbase_user_id || session.client_reference_id || '';
  const product = session.metadata?.product || '';

  if (!userId) {
    const error = new Error('Stripe checkout session is missing pocketbase_user_id metadata.');
    error.name = 'BadRequestError';
    throw error;
  }

  if (product !== 'puzzleflow_pro_lifetime') {
    const error = new Error('Stripe checkout session product metadata does not match puzzleflow_pro_lifetime.');
    error.name = 'BadRequestError';
    throw error;
  }

  return { userId, product };
}

async function updatePocketBaseUserEntitlement(pb: PocketBase, userId: string, payload: ProEntitlementPayload) {
  try {
    return await pb.collection('users').update(userId, payload);
  } catch (err) {
    console.warn('Full Pro entitlement update failed; retrying with legacy-compatible fields.', {
      userId,
      reason: err instanceof Error ? err.name : 'UnknownPocketBaseUpdateError',
    });

    return pb.collection('users').update(userId, {
      tier: 'pro',
      stripe_customer_id: payload.stripe_customer_id,
    });
  }
}

export const handler: Handler = async (event) => {
  const requestOrigin = event.headers.origin || event.headers.Origin;

  if (event.httpMethod === 'OPTIONS') {
    return emptyOptionsResponse(requestOrigin);
  }

  if (event.httpMethod !== 'POST') {
    return methodNotAllowed(['POST', 'OPTIONS'], requestOrigin);
  }

  try {
    const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
    const webhookSecret = requiredEnv('STRIPE_WEBHOOK_SECRET');
    const pocketBaseUrl = requiredEnv('PB_URL');
    const stripe = new Stripe(stripeSecretKey);
    const sig = event.headers['stripe-signature'];

    if (!sig) {
      return jsonResponse(400, { error: 'Missing stripe-signature header.' }, {}, requestOrigin);
    }

    let stripeEvent: Stripe.Event;
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body || '', sig, webhookSecret);
    } catch (err: unknown) {
      console.warn('Stripe webhook signature verification failed.', {
        reason: err instanceof Error ? err.name : 'UnknownStripeSignatureError',
      });
      return jsonResponse(400, { error: 'Webhook signature verification failed.' }, {}, requestOrigin);
    }

    if (stripeEvent.type !== 'checkout.session.completed') {
      console.info('Ignoring unsupported Stripe webhook event', { type: stripeEvent.type });
      return jsonResponse(200, { received: true, ignored: true }, {}, requestOrigin);
    }

    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const { userId, product } = getRequiredSessionMetadata(session);

    if (session.payment_status && session.payment_status !== 'paid') {
      console.warn('Checkout session completed without paid status; entitlement not granted.', {
        userId,
        paymentStatus: session.payment_status,
      });
      return jsonResponse(200, { received: true, ignored: true, reason: 'payment_not_paid' }, {}, requestOrigin);
    }

    const pb = await getSuperuserPb(pocketBaseUrl);

    const purchasedAt = new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString();
    const entitlementPayload: ProEntitlementPayload = {
      tier: 'pro',
      role: 'pro',
      is_pro: true,
      stripe_customer_id: getSessionCustomerId(session),
      stripe_checkout_session_id: session.id,
      pro_purchased_at: purchasedAt,
    };

    await updatePocketBaseUserEntitlement(pb, userId, entitlementPayload);

    console.info('Granted PuzzleFlow Pro lifetime access from Stripe checkout.', {
      userId,
      product,
    });

    return jsonResponse(200, { received: true, upgraded: true }, {}, requestOrigin);
  } catch (err: unknown) {
    return errorResponse(err, 'Stripe webhook processing failed.', 500, requestOrigin);
  }
};
