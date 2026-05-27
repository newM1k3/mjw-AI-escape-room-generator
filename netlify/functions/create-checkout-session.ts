import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { emptyOptionsResponse, errorResponse, jsonResponse, methodNotAllowed, parseJsonBody, requiredEnv } from './_utils';

type CheckoutBody = {
  userId?: string;
  email?: string;
};

function getBaseUrl(eventHeaders: Record<string, string | undefined>): string {
  const configuredUrl = process.env.SITE_URL?.trim() || process.env.URL?.trim() || '';
  const requestOrigin = eventHeaders.origin || eventHeaders.referer || '';
  const baseUrl = configuredUrl || requestOrigin || 'http://localhost:8888';
  return baseUrl.replace(/\/$/, '');
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return emptyOptionsResponse();
  }

  if (event.httpMethod !== 'POST') {
    return methodNotAllowed(['POST', 'OPTIONS']);
  }

  try {
    const stripeSecretKey = requiredEnv('STRIPE_SECRET_KEY');
    const stripePriceId = requiredEnv('STRIPE_PRICE_ID');
    const stripe = new Stripe(stripeSecretKey);
    const body = parseJsonBody<CheckoutBody>(event.body);
    const { userId, email } = body;

    if (!userId?.trim() || !email?.trim()) {
      return jsonResponse(400, { error: 'userId and email are required.' });
    }

    const baseUrl = getBaseUrl(event.headers);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId,
      },
      success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
    });

    if (!session.url) {
      return jsonResponse(502, { error: 'Stripe did not return a checkout URL.' });
    }

    return jsonResponse(200, { sessionId: session.id, url: session.url });
  } catch (err: unknown) {
    return errorResponse(err, 'Checkout session creation failed.');
  }
};
