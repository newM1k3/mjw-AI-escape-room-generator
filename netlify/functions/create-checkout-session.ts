import type { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import PocketBase from 'pocketbase';
import { emptyOptionsResponse, errorResponse, jsonResponse, methodNotAllowed, requiredEnv } from './_utils';

type AuthenticatedUser = {
  id: string;
  email?: string;
};

function getBearerToken(headers: Record<string, string | undefined>): string {
  const authorization = headers.authorization || headers.Authorization;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match?.[1]) {
    const error = new Error('Please sign in before upgrading. Checkout requires a valid PocketBase session.');
    error.name = 'UnauthorizedError';
    throw error;
  }

  return match[1].trim();
}

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.replace(/\/$/, '');
}

async function getAuthenticatedUser(pbUrl: string, token: string): Promise<AuthenticatedUser> {
  const pb = new PocketBase(pbUrl);
  pb.authStore.save(token);

  try {
    const authData = await pb.collection('users').authRefresh<AuthenticatedUser>();
    const user = authData.record;

    if (!user?.id || !user.email) {
      const error = new Error('The authenticated PocketBase user record is missing an id or email address.');
      error.name = 'UnauthorizedError';
      throw error;
    }

    return { id: user.id, email: user.email };
  } catch {
    const error = new Error('Your sign-in session could not be verified. Please sign out, sign back in, and try upgrading again.');
    error.name = 'UnauthorizedError';
    throw error;
  }
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
    const stripePriceId = requiredEnv('STRIPE_PRICE_ID_PRO');
    const appBaseUrl = normalizeBaseUrl(requiredEnv('APP_BASE_URL'));
    const pocketBaseUrl = requiredEnv('PB_URL');
    const token = getBearerToken(event.headers);
    const user = await getAuthenticatedUser(pocketBaseUrl, token);
    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      metadata: {
        pocketbase_user_id: user.id,
        user_email: user.email,
        product: 'puzzleflow_pro_lifetime',
      },
      success_url: `${appBaseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appBaseUrl}/?checkout=cancelled`,
    });

    if (!session.url) {
      return jsonResponse(502, { error: 'Stripe did not return a checkout URL. Please try again or contact support.' });
    }

    console.info('Created PuzzleFlow Pro checkout session', {
      sessionId: session.id,
      userId: user.id,
      product: 'puzzleflow_pro_lifetime',
    });

    return jsonResponse(200, { url: session.url });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'UnauthorizedError') {
      return jsonResponse(401, { error: err.message });
    }

    return errorResponse(err, 'Checkout could not be started. Please try again or contact support.');
  }
};
