# PuzzleFlow AI QA Checklist

This checklist is the **end-to-end release gate** for PuzzleFlow AI. Complete it against the production Netlify URL or the final deploy preview that uses production-equivalent Netlify, Stripe test-mode, PocketBase, and AI-provider environment variables. Record the tester, date, deployment URL, browser, viewport, test user email, Stripe test session, and PocketBase user record before marking a release ready.

> **Release rule:** Do not mark the launch candidate as approved until every critical path below is either passed or has a documented, owner-approved exception.

## Automated Smoke Tests

The repository includes a lightweight smoke-test runner at `scripts/qa-smoke-tests.mjs`. It checks the public app shell, SPA fallback behavior, unsupported function methods, and unauthenticated protection for sensitive Netlify Functions. These tests intentionally avoid creating accounts, completing Stripe checkout, or generating paid AI output because those flows require controlled test credentials and human confirmation.

| Command | Purpose | Required environment |
|---|---|---|
| `npm run smoke:qa` | Runs route and function protection smoke tests against `QA_BASE_URL`, `APP_BASE_URL`, or `http://localhost:8888`. | Set `QA_BASE_URL=https://YOUR_SITE.netlify.app` for deployed QA. |
| `QA_POCKETBASE_AUTH_TOKEN=... npm run smoke:qa` | Adds an optional authenticated `generate-room` call and accepts expected protected outcomes such as success, paywall, cooldown, or friendly server error. | Use only a test user token; never paste production admin or superuser tokens. |

Before manual QA, run the smoke tests against the target deployment and capture the output in the release notes.

```bash
QA_BASE_URL=https://YOUR_SITE.netlify.app npm run smoke:qa
```

## Manual End-to-End QA Matrix

Use this table as the source of truth for launch verification. The **Expected result** column defines the minimum acceptable behavior, while **Evidence** should contain a screenshot name, Stripe event ID, PocketBase record ID, terminal output, or short tester note.

| # | Scenario | Steps | Expected result | Evidence | Status |
|---:|---|---|---|---|---|
| 1 | Logged-out visitor can view landing page. | Open `/` in a fresh private browser window with no active PocketBase session. | The marketing landing page loads, primary content is visible, and no sign-in requirement blocks viewing. |  | Not run |
| 2 | Logged-out visitor can view demo room. | Open `/demo` while logged out. | The demo room is visible and usable enough to evaluate the sample output without creating an account. |  | Not run |
| 3 | Logged-out visitor is prompted to sign in for protected app actions. | From the landing page or demo, attempt a protected action such as opening the generator, saving, account, or upgrade flow. | The app opens a clear sign-in or create-account prompt instead of silently failing. |  | Not run |
| 4 | User can create an account. | Create a new account with a unique test email and valid password. | The user is registered, authenticated, and returned to the intended app area. |  | Not run |
| 5 | User can sign out. | Use the account or sidebar sign-out control. | The session is cleared and protected actions again require authentication. |  | Not run |
| 6 | User can sign back in. | Sign in with the test email and correct password. | The user is authenticated successfully and sees the app dashboard. |  | Not run |
| 7 | Wrong password shows a useful error. | Sign out, then attempt sign-in with the correct email and an incorrect password. | The app shows a friendly, actionable error message and does not crash or expose technical secrets. |  | Not run |
| 8 | Free user sees Pro paywall. | Sign in as a free user and attempt to generate or access Pro-only capabilities. | The paywall appears, explains the Pro requirement, and provides a clear upgrade path. |  | Not run |
| 9 | Upgrade button redirects to Stripe Checkout in test mode. | Click the upgrade button from the paywall while using Stripe test-mode configuration. | The browser redirects to Stripe Checkout test mode for the PuzzleFlow AI Pro product and price. |  | Not run |
| 10 | Completed Stripe test purchase updates PocketBase user to Pro through webhook. | Complete checkout with a Stripe test card, wait for webhook delivery, then inspect the PocketBase user record. | The user record reflects Pro access through the expected entitlement fields, and the app recognizes the change after refresh. |  | Not run |
| 11 | Pro user can generate a room. | Sign in as the upgraded test user, fill out the generator form, and submit. | A complete room is generated or, if provider credentials are intentionally disabled, a friendly provider configuration error appears. |  | Not run |
| 12 | Pro user can save room. | Save the generated room from the generator result screen. | The save operation succeeds, shows confirmation, and does not create duplicate saves from repeated clicks. |  | Not run |
| 13 | Pro user can refresh and see saved room in My Rooms. | Refresh the browser, navigate to My Rooms, and search/filter for the saved room. | The saved room persists after refresh and is visible only to the owning Pro user. |  | Not run |
| 14 | Pro user can export Markdown, JSON, and print/PDF. | Open a saved or generated room and use Markdown download, JSON download, and print/PDF controls. | Each export action produces usable output with the correct room content. |  | Not run |
| 15 | Pro user can delete a saved room. | Delete the saved room and confirm the destructive action. | The room is removed from My Rooms and does not reappear after refresh. |  | Not run |
| 16 | Free user cannot bypass frontend and call `generate-room` directly. | Use `curl`, Postman, browser dev tools, or `npm run smoke:qa` to call `/.netlify/functions/generate-room` as a free user or without a token. | Missing auth returns `401`; authenticated free users receive `403`; no room content is generated. |  | Not run |
| 17 | Missing AI key returns a friendly server error. | In a controlled deploy preview, set `AI_PROVIDER` to a real provider while omitting that provider key, then call `generate-room` as a Pro user. | The function returns a friendly JSON error and the UI displays a useful message without crashing. |  | Not run |
| 18 | Mobile layout works at 375px width. | In browser responsive tools, test `/`, `/demo`, `/app`, generator, account/paywall, and My Rooms at `375px` width. | Navigation, forms, modal dialogs, accordions, cards, and export controls remain readable and keyboard/touch usable. |  | Not run |
| 19 | Desktop layout works at 1440px width. | Test the same routes at `1440px` width. | Layout uses available space cleanly, no critical controls are clipped, and focus states remain visible. |  | Not run |
| 20 | Legal links and support email are visible. | Inspect landing page, auth modal, sidebar/account area, Terms, and Privacy routes. | Terms of Use, Privacy Policy, and the configured support email are visible and reachable. |  | Not run |

## Direct Function QA Commands

These commands can supplement the manual matrix. Replace `https://YOUR_SITE.netlify.app` with the deploy under test and use only test-user bearer tokens.

| Check | Command | Expected result |
|---|---|---|
| Unsupported method guard | `curl -i https://YOUR_SITE.netlify.app/.netlify/functions/generate-room` | HTTP `405` with an `Allow` header that includes `POST`. |
| Missing authentication guard | `curl -i -X POST https://YOUR_SITE.netlify.app/.netlify/functions/generate-room -H 'Content-Type: application/json' --data '{"theme":"A lighthouse mystery with a storm radio","difficulty":"Intermediate","players":"4-6","format":"Single Room","duration":"60 mins"}'` | HTTP `401` with a friendly JSON error. |
| Free-user bypass guard | Repeat the POST command with `-H 'Authorization: Bearer TEST_FREE_USER_TOKEN'`. | HTTP `403`; no AI provider request should be made. |
| Pro-user generation | Repeat the POST command with `-H 'Authorization: Bearer TEST_PRO_USER_TOKEN'`. | HTTP `200` with valid room JSON, unless cooldown or intentionally missing provider configuration applies. |

## Release Sign-Off

| Role | Name | Date | Decision | Notes |
|---|---|---|---|---|
| Product owner |  |  | Pending |  |
| Technical reviewer |  |  | Pending |  |
| QA tester |  |  | Pending |  |
