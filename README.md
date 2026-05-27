# PuzzleFlow AI

PuzzleFlow AI is a React/Vite application deployed on Netlify for generating premium escape-room puzzle flows. It uses PocketBase for authentication and saved rooms, Stripe for Pro checkout, and Anthropic for server-side AI generation.

## Production Setup Checklist

Before deploying to Netlify, configure the following environment variables in **Netlify Site Settings → Environment Variables**. Keep all server secrets out of frontend code and never prefix secrets with `VITE_`.

| Variable | Scope | Required | Purpose |
|---|---:|---:|---|
| `VITE_POCKETBASE_URL` | Frontend | Yes | Public PocketBase URL used by the browser for user auth and saved-room reads/writes, for example `https://mjwdesign-core.pockethost.io`. |
| `VITE_SUPPORT_EMAIL` | Frontend | No | Public support contact shown or used by future UI copy. Defaults to `support@example.com`. |
| `ANTHROPIC_API_KEY` | Netlify Functions | Yes | Server-only Anthropic API key used by `/.netlify/functions/generate-room`. |
| `ANTHROPIC_MODEL` | Netlify Functions | No | Optional Anthropic model override. Defaults to `claude-sonnet-4-5`. |
| `STRIPE_SECRET_KEY` | Netlify Functions | Yes | Server-only Stripe secret key used to create checkout sessions and verify webhook behavior. |
| `STRIPE_PRICE_ID` | Netlify Functions | Yes | Stripe one-time price ID for the Pro license product. |
| `STRIPE_WEBHOOK_SECRET` | Netlify Functions | Yes | Stripe webhook signing secret for the Netlify webhook endpoint. |
| `PB_URL` | Netlify Functions | Yes | Server-only PocketBase URL used by the Stripe webhook to grant Pro access. Usually the same URL as `VITE_POCKETBASE_URL`, but intentionally named separately to keep frontend and server contracts clear. |
| `PB_SUPERUSER_TOKEN` | Netlify Functions | Recommended | Preferred server-only PocketBase superuser token used by the Stripe webhook to grant Pro access without storing a password. |
| `PB_ADMIN_EMAIL` | Netlify Functions | Fallback | Server-only PocketBase superuser email used only if `PB_SUPERUSER_TOKEN` is not configured. |
| `PB_ADMIN_PASSWORD` | Netlify Functions | Fallback | Server-only PocketBase superuser password used only if `PB_SUPERUSER_TOKEN` is not configured. |
| `SITE_URL` | Netlify Functions | Recommended | Canonical production site URL for Stripe success/cancel redirects, for example `https://your-site.netlify.app` or a custom domain. Netlify also provides `URL`, but `SITE_URL` is clearer when using custom domains. |

## Netlify Functions

The app expects three Netlify Functions under `netlify/functions`.

| Function | Purpose | Notes |
|---|---|---|
| `generate-room` | Calls Anthropic and returns a structured escape-room JSON object. | Missing `ANTHROPIC_API_KEY` returns a clear JSON error instead of crashing. |
| `create-checkout-session` | Creates a Stripe Checkout Session for the one-time Pro purchase. | Missing Stripe env vars return clear JSON errors. The UI displays checkout failures. |
| `stripe-webhook` | Receives `checkout.session.completed` and upgrades the PocketBase user to `tier: "pro"`. | Requires Stripe webhook signing and PocketBase admin credentials. |

## PocketBase Requirements

PocketBase must contain a `users` auth collection compatible with the app's auth flow. The app expects user records to include `tier` with values such as `free` or `pro`, and optionally `stripe_customer_id`. The app also expects a `generated_rooms` collection with fields for `user`, `title`, `theme`, `difficulty`, and `content`. For production, configure `PB_SUPERUSER_TOKEN` in Netlify if possible. If you cannot issue a superuser token yet, configure `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` as a fallback until the token workflow is available.

## Stripe Setup

Create a one-time Stripe product and price for the Pro license, then set `STRIPE_PRICE_ID` to that price. Add the deployed webhook endpoint in Stripe:

```text
https://YOUR_NETLIFY_SITE/.netlify/functions/stripe-webhook
```

Subscribe the webhook to `checkout.session.completed`, copy the webhook signing secret, and set `STRIPE_WEBHOOK_SECRET` in Netlify.

## Local Development

Install dependencies and run the app locally:

```bash
npm install
npm run dev
```

For local Netlify Function testing, use the Netlify CLI or deploy previews with the required environment variables configured in Netlify.

## Verification

Run the production build before deploying:

```bash
npm run build
```

A successful build confirms the React/Vite frontend compiles. Netlify Function runtime behavior still depends on the production environment variables listed above.
