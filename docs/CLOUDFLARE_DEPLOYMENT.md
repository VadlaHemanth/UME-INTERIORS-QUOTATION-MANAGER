# Deploy UME Interiors to Cloudflare

This app includes a Cloudflare Worker, static frontend and D1 storage. The commands explicitly select this app’s config so a parent folder’s Wrangler project cannot be selected accidentally. Deploy the Worker project in this repository. Uploading only `dist/` to Pages would leave login, saving and publishing without an API.

## Current deployment

Live app: https://ume-interiors-quotation-studio.umeinteriors.workers.dev

Owner login: https://ume-interiors-quotation-studio.umeinteriors.workers.dev/owner

This checkout is already configured for the business Cloudflare account and its D1 database. Both migrations and owner secrets are configured. For updates to this deployment, use **Future updates** below; do not create another database. For a separate account, replace `account_id` and create your own database.

If your terminal has an old `CLOUDFLARE_ACCOUNT_ID`, remove that override or set it to the account in `wrangler.toml`. `npx wrangler whoami` confirms the signed-in account. A failed new OAuth attempt does not necessarily invalidate an existing session; check `whoami` before retrying.

## 1. Install and check

Use Node.js 22.12+ (or a current supported Node.js LTS) and open a terminal in this checkout.

```powershell
npm ci
npm test
npm run lint
npm run build
npx wrangler --config ./wrangler.toml login
```

## 2. Create persistent storage

```powershell
npx wrangler --config ./wrangler.toml d1 create ume-interiors-studio
```

Copy the returned database UUID into `database_id` under `[[d1_databases]]` in `wrangler.toml`, replacing the existing deployment’s UUID only when creating a separate deployment. Keep the binding named `DB`. Then run:

```powershell
npx wrangler --config ./wrangler.toml d1 migrations apply DB --remote
```

Both migration files must be applied. `0002_runtime_store.sql` creates the actual current app storage. New deployments start with an empty quotation list and the default rate card. Existing local customer files are not uploaded automatically.

## 3. Publish and configure the owner account

```powershell
npx wrangler --config ./wrangler.toml deploy
npx wrangler --config ./wrangler.toml secret put OWNER_USERNAME
npx wrangler --config ./wrangler.toml secret put OWNER_PASSWORD
```

Enter a username with 3–64 letters, numbers, dots, underscores or hyphens, and a unique password of at least 12 characters. Wrangler prompts for these values; keep them out of source files and GitHub. Login stays unavailable until both secrets are configured.

Open the HTTPS Worker URL returned by deployment. Customers use `/` or their private `/q/<token>` link. The owner signs in at `/owner`. After login, use the account settings to change the username and password. The password is stored as a salted PBKDF2 hash; saved account changes survive restarts and deployments. Changing credentials or signing out invalidates existing owner sessions.

The public customer portal does not expose the owner form. Customer links remain bearer access links: share each private link only with its intended customer.

## 4. Add your domain

In Cloudflare, select **Workers & Pages → ume-interiors-quotation-studio → Settings → Domains & Routes → Add → Custom Domain**. Select a hostname managed by your Cloudflare account, such as `quotes.umeinteriors.com`. Open it and test one fresh owner publication and a customer Save operation. The app generates new share links using the current hostname.

## Future updates

```powershell
git pull
npm ci
npm test
npm run lint
npm run build
npx wrangler --config ./wrangler.toml d1 migrations apply DB --remote
npx wrangler --config ./wrangler.toml deploy
```

Never delete the D1 database to update the app. Database contents and the saved owner account are independent of a code deployment. Use the Cloudflare D1 dashboard or Wrangler export for backups:

```powershell
npx wrangler --config ./wrangler.toml d1 export DB --remote --output studio-backup.sql
```

The backup contains private customer and authentication records. Store it privately; do not commit it.

## Run locally

Copy `.env.example` to `.env` and set `OWNER_USERNAME` and `OWNER_PASSWORD`. Then:

```powershell
npm run dev
```

Open `http://127.0.0.1:3000/owner`. Local saves use the ignored `data/ume-studio-db.json`. Local changes do not modify Cloudflare D1. To expose the development server to another device on your LAN, explicitly set `HOST=0.0.0.0` in your private `.env`.

For the actual Worker runtime, put the same two values into ignored `.dev.vars`, build the frontend, apply migrations locally and start Wrangler:

```powershell
npm run build
npx wrangler --config ./wrangler.toml d1 migrations apply DB --local
npx wrangler --config ./wrangler.toml dev
```

Worker local D1 data stays in ignored `.wrangler/`, separately from the Express JSON database and production D1. `npm run preview` serves only the frontend; use one of the two full-stack commands above to test saving and authentication.

## Account recovery

Update OWNER_USERNAME and OWNER_PASSWORD in **Workers & Pages → ume-interiors-quotation-studio → Settings → Variables and Secrets**, then deploy the changes. These must be runtime Worker secrets, not build variables or secrets on a different Worker/environment. Wrangler can also prompt for each value:

```powershell
npx wrangler --config ./wrangler.toml secret put OWNER_USERNAME
npx wrangler --config ./wrangler.toml secret put OWNER_PASSWORD
```

A changed runtime username or password replaces the saved account on the next API request and revokes prior owner sessions. Sign in again with the configured values. No database deletion or reset is needed. Usernames need 3–64 letters, numbers, dots, underscores or hyphens; passwords need 12–256 characters. Invalid configuration produces a clear configuration error instead of silently accepting the previous password.

Changes made through the app’s Account page persist across requests and deployments while the Cloudflare secret values stay unchanged. A later Cloudflare secret change takes precedence. The app stores a salted PBKDF2 baseline to detect that change, with no plaintext credentials in D1. This release also reconciles older accounts that have no baseline to the currently configured secrets. Quotations, payments and rate cards are retained.

For local Express development, restart the server after editing .env. Production Worker secret updates and local .env values are independent.

## Cloudflare references

- [Workers static assets and SPA routing](https://developers.cloudflare.com/workers/static-assets/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [D1 export](https://developers.cloudflare.com/d1/reference/wrangler-commands/#export)
