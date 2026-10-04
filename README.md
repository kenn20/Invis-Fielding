# Shield AI

Concept-stage React + Tailwind landing page. iPhone and Android first; additional hardware integrations are planned. No custom wearable, launch date, or working safety capability is claimed.

## Run locally

Use Node 22 or later:

```sh
npm ci
npm run dev
npm test
npm run build
```

Browser checks: run `npx playwright install chromium`, then `npm run test:browser` with no existing server on port 5173. They cover mobile/desktop layout, automated WCAG scans, keyboard entry, and mocked submission/retry flows. Google service behavior is mocked in automated tests; a real Sheet write must still be verified after deployment.

The complete reusable page is `src/ShieldLandingPage.jsx`. Import it into any React application with Tailwind enabled and render `<ShieldLandingPage signupEndpoint="https://YOUR-WORKER.workers.dev/signup" />`. All components, icons, classes, and hooks live in this file. No icon packages or remote assets are needed. The included Vite wrapper reads `VITE_SIGNUP_ENDPOINT` from `.env.local`; copy `.env.example` and replace its placeholder. This public URL is not a secret. Without configuration the form is disabled, with a visible explanation.

## Connect a private Google Sheet

1. Create a private Google Sheet. Create a tab called `Interest`, with `email` in A1 and `registered_at` in B1. Do not make the Sheet publicly writable or share it with registrants.
2. Open Extensions → Apps Script. Paste `services/Code.gs`. In Project Settings → Script properties, set `SPREADSHEET_ID` to the ID in your Sheet URL, and `SIGNUP_SECRET` to a long random secret. Generate a secret with a password manager; never commit it.
3. Deploy → New deployment → Web app. Execute as yourself; allow access to Anyone so the Worker can call it. Authorize the script. The public endpoint rejects requests without the secret. If your organization prevents anonymous web apps, this integration requires a different account or backend.
4. Save the deployment `/exec` URL. After script changes, update the deployment to a new version; editing source alone does not update the deployed version.

The script locks the deduplication/write operation and calls `SpreadsheetApp.flush()` before acknowledging a new row. Duplicate email submissions receive the same success response without adding rows. Store no incident details.

## Deploy the signup Worker

From `services/`, use Cloudflare's Wrangler CLI:

```sh
npx wrangler login
npx wrangler secret put APPS_SCRIPT_URL
npx wrangler secret put SIGNUP_SECRET
npx wrangler deploy
```

Before deployment, replace `ALLOWED_ORIGINS` in `wrangler.toml` with your exact site origin, without a trailing slash or path, e.g. `https://yourname.github.io`. Multiple origins may be comma separated. Set `SIGNUP_SECRET` to the same value as Apps Script. For local integration testing, add `http://localhost:5173` and copy `.dev.vars.example` to `.dev.vars` with real values. Keep local files private.

`POST /signup` accepts JSON `{ "email": "person@example.com" }`. A successful response is `{ "ok": true }`, only after Google confirms storage. Validation errors return 400; storage/configuration failures return 503; disallowed origins return 403. CORS preflight is handled. Emails are trimmed and lowercased. The basic validator requires a leading letter/digit and a dotted domain; it is not a full RFC email parser.

CORS restricts browser access, but does not authenticate callers or stop automated abuse. Apply Cloudflare abuse/rate controls before a broad public launch if needed; the Google secret only protects the storage endpoint. Target free-tier allowances, subject to account quotas and service availability. Neither paid services nor automated email sending are configured.

## GitHub Pages

Push this project to your chosen GitHub repository. In Settings → Pages, choose GitHub Actions. Add the repository Actions variable `VITE_SIGNUP_ENDPOINT` with your deployed Worker `/signup` URL. The included workflow runs tests, builds, and deploys `dist/` on pushes to `main`, or manually. Relative asset paths support both user and project Pages URLs. GitHub Pages serves only the frontend; credentials belong in the Worker and Apps Script.

No repository, Google account, or Cloudflare account was connected or deployed by this implementation. The pre-existing `.setup-pages.py` is unrelated and is not used or modified.

## Acceptance checks before collecting real emails

- Submit a test email from the deployed page; verify exactly one row in your private Sheet.
- Submit it again with different letter casing; verify no extra row.
- Remove the Worker secret temporarily in a test environment; confirm the page shows a retry error and retains the email.
- Check mobile/desktop layouts, keyboard navigation, reduced motion, and screen-reader confirmation.
- Do not display queue positions or hardware reservations. Signup requests availability updates only.
- Restrict Sheet access to those managing the interest list. Define an email removal process and update signup disclosures if collection or messaging expands.

## References

- [GitHub Pages setup](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Apps Script web apps](https://developers.google.com/apps-script/guides/web)
- [Apps Script locks](https://developers.google.com/apps-script/reference/lock/)
- [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
