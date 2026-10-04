# Invis-Fielding

Concept-stage React + Tailwind landing page. iPhone and Android first; additional hardware integrations are planned. No custom wearable, launch date, or working safety capability is claimed.

The landing page includes an interactive, four-step concept workflow with sample data: preparation, capture, trusted-contact alert preview, and record review. It does not access sensors or send alerts.

## Run locally

Use Node 22 or later:

```sh
npm ci
npm run dev
npm test
npm run build
```

Browser checks: run `npx playwright install chromium`, then `npm run test:browser` with no existing server on port 5173. They cover mobile/desktop layout, automated WCAG scans, keyboard entry, and mocked submission/retry flows. Browser submission behavior is mocked; a live D1 write must still be verified after deployment.

The complete reusable page is `src/InvisFieldingLandingPage.jsx`. Import it into any React application with Tailwind enabled and render `<InvisFieldingLandingPage signupEndpoint="https://YOUR-WORKER.workers.dev/signup" />`. All components, icons, classes, and hooks live in this file. No icon packages or remote assets are needed. The included Vite wrapper reads `VITE_SIGNUP_ENDPOINT` from `.env.local`; copy `.env.example` and replace its placeholder. This public URL is not a secret. Without configuration the form is disabled, with a visible explanation.

## Cloudflare D1 signup backend

The flow is GitHub Pages → Worker → D1. No Google access or application secrets are required. Only normalized email and UTC signup time are stored. There is no public list-reading endpoint and no automatic email sending.

### Local verification

```sh
npm run test:d1
npm test
npm run build
```

`test:d1` uses real local D1 and rate-limit bindings in a temporary directory. It checks writes, concurrent duplicate submissions, unchanged original timestamps, rate limiting, and database failures. It does not contact the production database. Unit and browser tests use mocks; they do not prove production connectivity.

To run the Worker locally, from the repository root:

```sh
npx wrangler d1 migrations apply invis-fielding-signups --local --config services/wrangler.toml
npx wrangler dev --config services/wrangler.toml --var ALLOWED_ORIGINS:http://localhost:5173
```

Set `.env.local` to `VITE_SIGNUP_ENDPOINT=http://localhost:8787/signup`, then run `npm run dev`. Production configuration allows only `https://kenn20.github.io`; the command above overrides it locally.

### Production deployment

```sh
npx wrangler login
npx wrangler whoami
npx wrangler d1 create invis-fielding-signups
```

Verify the intended Cloudflare account before creating resources. For a different account, copy the returned database ID into `services/wrangler.toml`; keep binding name `DB`. The checked-in ID belongs to the deployed Invis-Fielding database. Database IDs are not secrets.

```sh
npx wrangler d1 migrations apply invis-fielding-signups --remote --config services/wrangler.toml
npx wrangler deploy --config services/wrangler.toml
```

`POST /signup` accepts JSON `{ "email": "person@example.com" }`. Success is `{ "ok": true }` only after D1 acknowledges the write. Duplicate email submissions also succeed without updating the first timestamp. Invalid input returns 400; unavailable database, limiter, or client-IP information returns 503. Existing method, size, and origin restrictions remain in place.

The `SIGNUP_RATE_LIMITER` binding allows 10 POST requests per 60 seconds per `CF-Connecting-IP`; preflights do not count. Excess requests return 429 with `Retry-After: 60` and a retry message. Cloudflare supplies this header in production. Its native limiter is approximate, eventually consistent, and local to each Cloudflare location, rather than an exact global quota. Shared-IP visitors share the limit. CORS is not caller authentication.

### Private list administration

Use the authenticated Cloudflare dashboard's D1 console to view the `signups` table or remove a requested email. Alternatively, from a trusted terminal:

```sh
npx wrangler d1 execute invis-fielding-signups --remote --config services/wrangler.toml --command "SELECT email, registered_at FROM signups ORDER BY registered_at DESC LIMIT 100"
npx wrangler d1 execute invis-fielding-signups --remote --config services/wrangler.toml --command "DELETE FROM signups WHERE email = 'person@example.com'"
```

The deletion example is for a known literal address; prefer the dashboard for real removal requests rather than interpolating untrusted text into SQL. Restrict account access to list administrators. Do not commit exported subscriber data or log request bodies.

## GitHub Pages

Push this project to your chosen GitHub repository. In Settings → Pages, choose GitHub Actions. Add the repository Actions variable `VITE_SIGNUP_ENDPOINT` with your deployed Worker `/signup` URL. The included workflow runs tests, builds, and deploys `dist/` on pushes to `main`, or manually. Relative asset paths support both user and project Pages URLs. GitHub Pages serves only the frontend; database access stays in the Worker through its D1 binding.

Production deployment requires an authenticated Cloudflare account and an actual D1 database ID. The pre-existing `.setup-pages.py` is unrelated and is not used or modified.

## Acceptance checks before collecting real emails

- Submit a test email from the deployed page; verify exactly one row in your private D1 database.
- Submit it again with different letter casing; verify no extra row and an unchanged original timestamp.
- Use an unavailable database in an isolated test environment; confirm the page shows a retry error and retains the email.
- Check mobile/desktop layouts, keyboard navigation, reduced motion, and screen-reader confirmation.
- Do not display queue positions or hardware reservations. Signup requests availability updates only.
- Restrict Cloudflare account access to those managing the interest list. Define an email removal process and update signup disclosures if collection or messaging expands.

## References

- [D1 setup and Worker bindings](https://developers.cloudflare.com/d1/get-started/)
- [Workers rate limiting and its accuracy limitations](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

## Current deployment

- Site: https://kenn20.github.io/Invis-Fielding/
- Signup endpoint: https://invis-fielding-signup.kenn-chong1.workers.dev/signup
- Database: `invis-fielding-signups` (binding `DB`).
- Verified October 4, 2026: real local D1 checks, 23 unit tests, four browser tests, production build, Worker packaging, and two live-page submissions with different email casing producing exactly one production row. The synthetic test row was removed after verification.

The initial Pages deployment used `feat/invis-fielding-workflow` via workflow dispatch. The Pages environment remains restricted to `main`; merge the integration PR for subsequent automatic production deployments.
