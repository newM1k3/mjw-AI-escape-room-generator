# PuzzleFlow AI Launch Checklist

This launch checklist is the **production readiness gate** for PuzzleFlow AI. Complete it after the QA checklist has been run against the final Netlify deployment or final production-equivalent deploy preview. Each row should be assigned to an owner, verified with concrete evidence, and marked complete only when the production configuration is confirmed.

> **Launch rule:** The public launch should not proceed until every required item is complete or explicitly deferred by the product owner with a documented risk decision.

## Launch Readiness Matrix

| # | Launch item | Verification standard | Owner | Evidence | Status |
|---:|---|---|---|---|---|
| 1 | Netlify env vars configured. | Netlify contains `VITE_POCKETBASE_URL`, `VITE_SUPPORT_EMAIL`, `AI_PROVIDER`, provider key for the selected provider, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_PRO`, `STRIPE_WEBHOOK_SECRET`, `PB_URL`, `PB_SUPERUSER_TOKEN`, `APP_BASE_URL`, and `VITE_APP_BASE_URL` as appropriate for production. No server secrets use the `VITE_` prefix. |  |  | Not run |
| 2 | Stripe product/price created. | Stripe test mode and live mode contain the **PuzzleFlow AI Pro Lifetime Access** product and the intended one-time price. `STRIPE_PRICE_ID_PRO` points to the correct environment-specific price ID. |  |  | Not run |
| 3 | Stripe webhook configured. | Stripe webhook endpoint points to `https://YOUR_DOMAIN/.netlify/functions/stripe-webhook`, subscribes to `checkout.session.completed`, and the signing secret is saved as `STRIPE_WEBHOOK_SECRET` in Netlify. |  |  | Not run |
| 4 | PocketBase users fields confirmed. | The `users` auth collection includes the app-required entitlement fields: `tier`, `role`, `is_pro`, `stripe_customer_id`, `stripe_checkout_session_id`, and `pro_purchased_at`. A test webhook can update the intended fields. |  |  | Not run |
| 5 | `generated_rooms` collection confirmed. | The collection exists with the required owner, metadata, and JSON content fields. List/view/create/update/delete rules restrict access to the owning authenticated Pro user. |  |  | Not run |
| 6 | `generation_cooldowns` collection confirmed. | The collection exists with `user_id` and `last_generated_at`, public client rules are denied, and server-side writes work through `PB_SUPERUSER_TOKEN`. |  |  | Not run |
| 7 | AI provider key configured. | The selected `AI_PROVIDER` has its matching server-only key configured, and a Pro test user can generate a room without exposing provider credentials to the frontend bundle. |  |  | Not run |
| 8 | Domain connected. | The production domain points to the Netlify site, HTTPS is active, `APP_BASE_URL` and `VITE_APP_BASE_URL` match the canonical domain, and `/`, `/demo`, `/app`, Terms, Privacy, and unknown SPA routes resolve correctly. |  |  | Not run |
| 9 | Test purchase completed. | A Stripe test-mode checkout completes, the webhook is delivered successfully, the PocketBase user becomes Pro, and the user can generate and save a room after returning to the app. |  |  | Not run |
| 10 | Refund/support policy published. | Terms of Use, Privacy Policy, refund/access terms, and the support email are visible in the app and match the production business policy. Placeholder legal copy has been replaced or explicitly approved for launch. |  |  | Not run |

## Pre-Launch Command Checks

Run these repository checks immediately before the production deploy. Capture terminal output in the launch record.

```bash
npm run lint
npm run typecheck
npm run build
npx tsc --noEmit --moduleResolution bundler --module esnext --target esnext netlify/functions/*.ts
QA_BASE_URL=https://YOUR_DOMAIN npm run smoke:qa
```

## Launch Sign-Off

| Role | Name | Date | Decision | Notes |
|---|---|---|---|---|
| Product owner |  |  | Pending |  |
| Technical owner |  |  | Pending |  |
| QA owner |  |  | Pending |  |
| Support/legal owner |  |  | Pending |  |
