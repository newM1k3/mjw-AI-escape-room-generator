# PuzzleFlow AI

PuzzleFlow AI is a React/Vite application deployed on Netlify for generating premium escape-room puzzle flows. It uses PocketBase for authentication and saved rooms, Stripe for Pro checkout, and Anthropic for server-side AI generation.

## Production Setup Checklist

Before deploying to Netlify, configure the following environment variables in **Netlify Site Settings → Environment Variables**. Keep all server secrets out of frontend code and never prefix secrets with `VITE_`.

| Variable | Scope | Required | Purpose |
|---|---:|---:|---|
| `VITE_POCKETBASE_URL` | Frontend | Yes | Public PocketBase URL used by the browser for user auth and saved-room reads/writes, for example `https://mjwdesign-core.pockethost.io`. |
| `VITE_SUPPORT_EMAIL` | Frontend | Recommended | Public support contact shown in auth, account, legal, and password-reset copy. Defaults to `support@example.com`, but should be set before launch. |
| `ANTHROPIC_API_KEY` | Netlify Functions | Yes | Server-only Anthropic API key used by `/.netlify/functions/generate-room`. |
| `ANTHROPIC_MODEL` | Netlify Functions | No | Optional Anthropic model override. Defaults to `claude-sonnet-4-5`. |
| `STRIPE_SECRET_KEY` | Netlify Functions | Yes | Server-only Stripe secret key used to create checkout sessions and verify webhook behavior. |
| `STRIPE_PRICE_ID_PRO` | Netlify Functions | Yes | Stripe one-time price ID for the $97 PuzzleFlow AI Pro Lifetime Access product. |
| `STRIPE_WEBHOOK_SECRET` | Netlify Functions | Yes | Stripe webhook signing secret for the Netlify webhook endpoint. |
| `PB_URL` | Netlify Functions | Yes | Server-only PocketBase URL used by the Stripe webhook to grant Pro access. Usually the same URL as `VITE_POCKETBASE_URL`, but intentionally named separately to keep frontend and server contracts clear. |
| `PB_SUPERUSER_TOKEN` | Netlify Functions | Recommended | Preferred server-only PocketBase superuser token used by the Stripe webhook to grant Pro access without storing a password. |
| `PB_ADMIN_EMAIL` | Netlify Functions | Fallback | Server-only PocketBase superuser email used only if `PB_SUPERUSER_TOKEN` is not configured. |
| `PB_ADMIN_PASSWORD` | Netlify Functions | Fallback | Server-only PocketBase superuser password used only if `PB_SUPERUSER_TOKEN` is not configured. |
| `APP_BASE_URL` | Netlify Functions | Yes | Canonical production app URL for Stripe success/cancel redirects, for example `https://your-site.netlify.app` or a custom domain. |

## Netlify Functions

The app expects three Netlify Functions under `netlify/functions`.

| Function | Purpose | Notes |
|---|---|---|
| `generate-room` | Calls Anthropic and returns a structured escape-room JSON object. | Missing `ANTHROPIC_API_KEY` returns a clear JSON error instead of crashing. |
| `create-checkout-session` | Validates the current PocketBase bearer token server-side and creates a Stripe Checkout Session for the $97 one-time Pro Lifetime Access purchase. | Missing Stripe/PocketBase env vars or invalid auth returns clear JSON errors. The UI displays checkout failures. |
| `stripe-webhook` | Receives `checkout.session.completed`, verifies Stripe's signature, and upgrades the PocketBase user to permanent Pro access. | Requires Stripe webhook signing and `PB_SUPERUSER_TOKEN` or fallback PocketBase superuser credentials. |

## PocketBase Requirements

PocketBase must contain a `users` auth collection compatible with the app's auth flow. The app expects user records to include `tier` with values such as `free` or `pro`. For the Stripe lifetime Pro flow, add the entitlement fields `role` (text), `is_pro` (boolean), `stripe_customer_id` (text), `stripe_checkout_session_id` (text), and `pro_purchased_at` (date/text compatible with an ISO timestamp). The webhook first attempts to write the full entitlement payload and falls back to legacy `tier` plus `stripe_customer_id` if the newer fields are not present, but the full schema is recommended before production. The app uses the PocketBase auth token stored by the SDK only for the browser session; Pro access must come from the authenticated PocketBase user record, not from custom localStorage flags. The app also expects a `generated_rooms` collection with fields for `user`, `title`, `theme`, `difficulty`, and `content`. For production, configure `PB_SUPERUSER_TOKEN` in Netlify if possible. If you cannot issue a superuser token yet, configure `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` as a fallback until the token workflow is available.

Password reset uses PocketBase's built-in `requestPasswordReset` flow. Before public launch, configure PocketBase mail settings, set the correct application URL in PocketBase, and test the reset email end-to-end. If PocketBase email delivery is not configured, the app will show a friendly support-oriented message instead of leaving the user stuck.

The app includes placeholder Terms of Use and Privacy Policy pages so the auth modal and sidebar have working legal links. Replace these placeholders with final legal copy before launch, including business entity, refund/access terms, privacy processor disclosures, and support contact details.

## Stripe Setup

Create a one-time Stripe product named **PuzzleFlow AI Pro Lifetime Access** with a **$97 one-time price**, then set `STRIPE_PRICE_ID_PRO` to that price ID. The checkout session is created in `payment` mode and includes metadata `pocketbase_user_id`, `user_email`, and `product = puzzleflow_pro_lifetime`. Add the deployed webhook endpoint in Stripe:

```text
https://YOUR_NETLIFY_SITE/.netlify/functions/stripe-webhook
```

Subscribe the webhook to `checkout.session.completed`, copy the webhook signing secret, and set `STRIPE_WEBHOOK_SECRET` in Netlify. After payment, Stripe returns users to `APP_BASE_URL/?checkout=success&session_id={CHECKOUT_SESSION_ID}`; cancelled checkouts return to `APP_BASE_URL/?checkout=cancelled`.

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
