# PuzzleFlow AI

PuzzleFlow AI is a React/Vite application deployed on Netlify for generating premium escape-room puzzle flows. It uses PocketBase for authentication and saved rooms, Stripe for Pro checkout, and a server-side AI provider selected with `AI_PROVIDER` (`openai`, `gemini`, or `mock`) for room generation.

## Release Readiness Documents

Use the in-repo [QA checklist](QA_CHECKLIST.md) to validate the full logged-out, free-user, checkout, Pro-user, export, responsive, and direct-function bypass flows before release. Use the [launch checklist](LAUNCH_CHECKLIST.md) as the final production readiness gate for Netlify, Stripe, PocketBase, AI provider, domain, test purchase, and support-policy setup.

## Production Setup Checklist

Before deploying to Netlify, configure the following environment variables in **Netlify Site Settings → Environment Variables**. Keep all server secrets out of frontend code and never prefix secrets with `VITE_`.

| Variable | Scope | Required | Purpose |
|---|---:|---:|---|
| `VITE_POCKETBASE_URL` | Frontend | Yes | Public PocketBase URL used by the browser for user auth and saved-room reads/writes, for example `https://mjwdesign-core.pockethost.io`. |
| `VITE_SUPPORT_EMAIL` | Frontend | Recommended | Public support contact shown in auth, account, legal, and password-reset copy. Defaults to `support@example.com`, but should be set before launch. |
| `AI_PROVIDER` | Netlify Functions | Yes | Server-only provider selector for `/.netlify/functions/generate-room`. Supported values: `openai`, `gemini`, or `mock`. |
| `AI_MODEL` | Netlify Functions | No | Optional model override. Defaults to `gpt-4.1-mini` for OpenAI, `gemini-2.5-flash` for Gemini, and `mock-room-designer-v1` for mock mode. |
| `OPENAI_API_KEY` | Netlify Functions | Required when `AI_PROVIDER=openai` | Server-only OpenAI API key used only by the Netlify Function. Do not expose it with a `VITE_` prefix. |
| `GEMINI_API_KEY` | Netlify Functions | Required when `AI_PROVIDER=gemini` | Server-only Gemini API key used only by the Netlify Function. Do not expose it with a `VITE_` prefix. |
| `STRIPE_SECRET_KEY` | Netlify Functions | Yes | Server-only Stripe secret key used to create checkout sessions and verify webhook behavior. |
| `STRIPE_PRICE_ID_PRO` | Netlify Functions | Yes | Stripe one-time price ID for the $97 PuzzleFlow AI Pro Lifetime Access product. |
| `STRIPE_WEBHOOK_SECRET` | Netlify Functions | Yes | Stripe webhook signing secret for the Netlify webhook endpoint. |
| `PB_URL` | Netlify Functions | Yes | Server-only PocketBase URL used by the Stripe webhook to grant Pro access. Usually the same URL as `VITE_POCKETBASE_URL`, but intentionally named separately to keep frontend and server contracts clear. |
| `PB_SUPERUSER_TOKEN` | Netlify Functions | Yes | Server-only PocketBase superuser token used by the Stripe webhook to grant Pro access and by `generate-room` to maintain per-user cooldown records. Do not expose it with a `VITE_` prefix. |
| `GENERATION_COOLDOWN_SECONDS` | Netlify Functions | Optional | Per-user abuse guardrail for `generate-room`; defaults to `30`, must be at least `1`, and is capped at `300` seconds. |
| `APP_BASE_URL` | Netlify Functions/build | Yes | Canonical production URL used for Stripe success/cancel redirects, origin-aware CORS, and generated `sitemap.xml`/`robots.txt`, for example `https://your-site.netlify.app` or a custom domain. |
| `VITE_APP_BASE_URL` | Frontend/build | Recommended | Public canonical URL fallback for landing-page canonical metadata when `APP_BASE_URL` is not available to the browser. |

## Production Security Hardening

Netlify security headers are configured in `netlify.toml`. The policy sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy` that denies camera, microphone, and geolocation, and a Content Security Policy that limits scripts, fonts, frames, form posts, and API connections to the app itself, the configured PocketBase production origin, Stripe Checkout/Stripe.js, and Google Fonts. If the inline JSON-LD block in `index.html` changes, run `node scripts/compute-jsonld-csp-hash.cjs` and update the CSP hash in `netlify.toml` before deploying.

The serverless response helpers use origin-aware CORS headers derived from `APP_BASE_URL`, `VITE_APP_BASE_URL`, and Netlify deploy URL variables, with localhost allowed only for development. Sensitive authenticated functions should not use wildcard origins. Function logs are intentionally limited to operational status, user identifiers, provider names, and product names; they should not print API keys, bearer tokens, Stripe secret values, full checkout session identifiers, payment details, or raw authorization headers.

| Control | Production behavior |
|---|---|
| Security headers | Defined globally in `netlify.toml` for all routes and built assets. |
| SPA fallback | Unknown browser routes are rewritten to `index.html`, and React renders a dedicated 404 screen for unsupported in-app pages. |
| Frontend secrets | Only `VITE_` values are bundled into the browser. Provider keys, Stripe secret keys, webhook secrets, and PocketBase superuser tokens must remain server-only Netlify environment variables. |
| Function methods | Each Netlify Function validates its HTTP method and returns `405` with an `Allow` header for unsupported methods. |
| Authenticated endpoints | `generate-room` and `create-checkout-session` require a valid PocketBase bearer token and reject missing or invalid credentials. |
| Abuse guardrail | `generate-room` enforces a PocketBase-backed per-user cooldown and returns `429` plus retry timing when the user submits too quickly. |

## Netlify Functions

The public site now uses `/` and `/landing` for the marketing landing page, `/app` for the logged-in dashboard/generator experience, and `/demo` for the public Alchemist's Study demo. Netlify's SPA redirect keeps these routes available on direct refresh. `npm run dev` and `npm run build` generate `public/sitemap.xml` and `public/robots.txt` from `APP_BASE_URL` when it is available.

The app expects three Netlify Functions under `netlify/functions`.

| Function | Purpose | Notes |
|---|---|---|
| `generate-room` | Validates the current PocketBase bearer token, verifies authoritative Pro entitlement, validates the generation payload, enforces a per-user cooldown, calls the configured AI provider, and returns a complete operator-ready escape-room JSON object. | Missing auth returns `401`, non-Pro users receive `403`, invalid payloads return `400` with field details, cooldown violations return `429`, and missing `AI_PROVIDER`, provider API keys, `PB_URL`, or `PB_SUPERUSER_TOKEN` returns clear JSON errors instead of crashing. |
| `create-checkout-session` | Validates the current PocketBase bearer token server-side and creates a Stripe Checkout Session for the $97 one-time Pro Lifetime Access purchase. | Missing Stripe/PocketBase env vars or invalid auth returns clear JSON errors. The UI displays checkout failures. |
| `stripe-webhook` | Receives `checkout.session.completed`, verifies Stripe's signature, and upgrades the PocketBase user to permanent Pro access. | Requires Stripe webhook signing and `PB_SUPERUSER_TOKEN`; legacy PocketBase admin email/password fallback is intentionally not used in production. |

### Local mock generation

For local development or preview deployments that should not call a paid AI provider, set `AI_PROVIDER=mock`. The endpoint still validates the PocketBase bearer token and Pro entitlement before returning the sample room, so mock mode can be used to test authenticated Pro-only UI behavior without exposing or spending provider API keys.

## PocketBase Requirements

PocketBase must contain a `users` auth collection compatible with the app's auth flow. The app expects user records to include `tier` with values such as `free` or `pro`. For the Stripe lifetime Pro flow, add the entitlement fields `role` (text), `is_pro` (boolean), `stripe_customer_id` (text), `stripe_checkout_session_id` (text), and `pro_purchased_at` (date/text compatible with an ISO timestamp). The webhook first attempts to write the full entitlement payload and falls back to legacy `tier` plus `stripe_customer_id` if the newer fields are not present, but the full schema is recommended before production. The app uses the PocketBase auth token stored by the SDK only for the browser session; Pro access must come from the authenticated PocketBase user record, not from custom localStorage flags. For production, configure `PB_SUPERUSER_TOKEN` in Netlify and do not rely on PocketBase admin email/password credentials in serverless functions.

### `generated_rooms` collection schema

Create or confirm a regular PocketBase collection named `generated_rooms`. The frontend writes generated room records directly with the authenticated PocketBase SDK, so these fields and owner rules are part of the production security boundary.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `user` | Relation to `users` | Yes | Single relation to the owner account. |
| `title` | Text | Yes | Display title for My Rooms search and cards. |
| `theme` | Text | Yes | Original or generated theme summary. |
| `difficulty` | Text | Yes | `Beginner`, `Intermediate`, `Expert`, or `Enthusiast-Only`. |
| `format` | Text | Recommended | `Single Room`, `Multi-Room`, `Linear`, or `Non-Linear`; used for filtering. |
| `duration` | Text | Recommended | `45 mins`, `60 mins`, or `90 mins`; shown on library cards and exports. |
| `content` | JSON | Yes | Full generated operator plan returned by `generate-room`. |
| `created` | Date | Built-in | PocketBase system field used for sorting. |
| `updated` | Date | Built-in | PocketBase system field used for freshness/debugging. |

My Rooms supports an empty state, title/theme search, difficulty and format filters, detail view, duplicate creation, confirmed delete, browser print/PDF, Markdown download, JSON download, and clipboard copy for the operator summary. New Room displays a visible save confirmation after successful writes, disables repeat saves for the same generated output to prevent accidental duplicates, and warns users before leaving an unsaved generated room.

Saved-room create/list/view/update/delete operations currently use authenticated client-side PocketBase calls, so the `generated_rooms` collection rules must enforce owner and entitlement checks directly in PocketBase. Recommended production rules are:

| Rule | Recommended expression |
|---|---|
| List/Search | `@request.auth.id != "" && user = @request.auth.id && (@request.auth.role = "pro" || @request.auth.is_pro = true || @request.auth.tier = "pro")` |
| View | `@request.auth.id != "" && user = @request.auth.id && (@request.auth.role = "pro" || @request.auth.is_pro = true || @request.auth.tier = "pro")` |
| Create | `@request.auth.id != "" && user = @request.auth.id && (@request.auth.role = "pro" || @request.auth.is_pro = true || @request.auth.tier = "pro")` |
| Update | `@request.auth.id != "" && user = @request.auth.id && (@request.auth.role = "pro" || @request.auth.is_pro = true || @request.auth.tier = "pro")` |
| Delete | `@request.auth.id != "" && user = @request.auth.id && (@request.auth.role = "pro" || @request.auth.is_pro = true || @request.auth.tier = "pro")` |

These rules prevent one user from reading or deleting another user's saved rooms and prevent free accounts from creating or accessing saved generated-room records even if they bypass the frontend gate.

### `generation_cooldowns` collection schema

Create or confirm a regular PocketBase collection named `generation_cooldowns`. This collection supports the server-side abuse guardrail in `generate-room`; it is written by Netlify Functions using `PB_SUPERUSER_TOKEN`, not by browser clients.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `user_id` | Text | Yes | PocketBase user ID used as the cooldown key. Add a unique index if your PocketBase plan/schema workflow supports it. |
| `last_generated_at` | Date/Text | Yes | ISO timestamp of the user's latest successful generation attempt. |
| `created` | Date | Built-in | PocketBase system field. |
| `updated` | Date | Built-in | PocketBase system field. |

For production, deny public list/view/create/update/delete access to this collection and allow writes only through the server-side superuser token. The function catches an absent cooldown record, creates it on first generation, updates it after subsequent allowed generations, and returns `429` with retry guidance when the configured cooldown window has not elapsed.

Password reset uses PocketBase's built-in `requestPasswordReset` flow. Before public launch, configure PocketBase mail settings, set the correct application URL in PocketBase, and test the reset email end-to-end. If PocketBase email delivery is not configured, the app will show a friendly support-oriented message instead of leaving the user stuck.

The app includes placeholder Terms of Use and Privacy Policy pages so the auth modal and sidebar have working legal links. Replace these placeholders with final legal copy before launch, including business entity, refund/access terms, privacy processor disclosures, and support contact details.

## Stripe Setup

Create a one-time Stripe product named **PuzzleFlow AI Pro Lifetime Access** with a **$97 one-time price**, then set `STRIPE_PRICE_ID_PRO` to that price ID. The checkout session is created in `payment` mode and includes metadata `pocketbase_user_id`, `user_email`, and `product = puzzleflow_pro_lifetime`. Add the deployed webhook endpoint in Stripe:

```text
https://YOUR_NETLIFY_SITE/.netlify/functions/stripe-webhook
```

Subscribe the webhook to `checkout.session.completed`, copy the webhook signing secret, and set `STRIPE_WEBHOOK_SECRET` in Netlify. After payment, Stripe returns users to `APP_BASE_URL/app/account?checkout=success&session_id={CHECKOUT_SESSION_ID}` so the entitlement refresh screen opens inside the dashboard. Cancelled checkouts return to `APP_BASE_URL/app?checkout=cancelled`.

## Local Development

Install dependencies and run the app locally:

```bash
npm install
npm run dev
```

For local Netlify Function testing, use the Netlify CLI or deploy previews with the required environment variables configured in Netlify.

## Verification

Run the production checks before deploying:

```bash
npm run lint
npm run typecheck
npm run build
npx tsc --noEmit --moduleResolution bundler --module esnext --target esnext netlify/functions/*.ts
QA_BASE_URL=https://YOUR_SITE.netlify.app npm run smoke:qa
```

A successful build confirms the React/Vite frontend compiles and the Netlify Functions typecheck. The smoke-test command checks the deployed app shell, SPA fallback, unsupported method handling, and unauthenticated function protection. Netlify Function runtime behavior still depends on the production environment variables listed above and the manual end-to-end flows in `QA_CHECKLIST.md`.
