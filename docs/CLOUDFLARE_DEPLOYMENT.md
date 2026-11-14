# Deploy UME Interiors to Cloudflare

This app includes a Cloudflare Worker, static frontend and D1 storage. The commands explicitly select this app’s config so a parent folder’s Wrangler project cannot be selected accidentally. Deploy the Worker project in this repository. Uploading only `dist/` to Pages would leave login, saving and publishing without an API.

Keep `/q/*` in `assets.run_worker_first`: quotation links need server-rendered social metadata and their PNG preview route. Wrangler bundles the `@resvg/resvg-wasm` WebAssembly module automatically; `npm run build` copies the UME logo and licensed Plus Jakarta Sans font into the assets. No extra image-service keys, new secrets or database migrations are needed for link previews.

## Current deployment

Live app: https://quotation.umeinteriors.workers.dev

Owner login: https://quotation.umeinteriors.workers.dev/owner

This checkout is already configured for the business Cloudflare account and its D1 database. Both migrations and owner secrets are configured. For updates to this deployment, use **Future updates** below; do not create another database. For a separate account, replace `account_id` and create your own database.

If your terminal has an old `CLOUDFLARE_ACCOUNT_ID`, remove that override or set it to the account in `wrangler.toml`. `npx wrangler whoami` confirms the signed-in account. A failed new OAuth attempt does not necessarily invalidate an existing session; check `whoami` before retrying.

## 1. Install and check

Use Node.js 22.15+ (or a current supported Node.js LTS) and open a terminal in this checkout. The QR regression test uses the Node module-loader hook introduced in Node 22.15.

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

Enter a username with 3–64 characters starting with a letter or number; email addresses and business names with spaces, dots, underscores, plus signs or hyphens are accepted, and a unique password of at least 12 characters. Wrangler prompts for these values; keep them out of source files and GitHub. Login stays unavailable until both secrets are configured.

Open the HTTPS Worker URL returned by deployment. Customers use `/` or their private `/q/<token>` link. The owner signs in at `/owner`. After login, open **Settings → Account** to change your username and password yourself. Enter the current password, enter and confirm a new password of at least 12 characters, then select **Save sign-in details**. The password is stored as a salted PBKDF2 hash; saved account changes survive restarts and deployments. Changing credentials or signing out invalidates existing owner sessions.

The public customer portal does not expose the owner form. Customer links remain bearer access links: share each private link only with its intended customer.

## Business and payment configuration

After sign-in, use **Settings → Business** for business identity, address and contact details, and **Settings → Payment details** for the bank account, IFSC, UPI ID, account holder name and UPI payment limit. Review the recipient details against your bank records and select **Save details**. These settings are stored in the app database; they are independent of the owner login secrets and are retained during ordinary code deployments.

Subsequent quotation loads and PDF previews use saved business/payment details. Payment QR codes encode the saved UPI recipient and account holder name, with the entered customer amount or the PDF booking amount. Format validation does not verify the account. Regenerate a PDF when you need it to reflect changed details; an already downloaded PDF is a static file.

Each quotation has an owner checkbox, **This quotation is based on the supplied floor plan**. When checked, the customer view and PDF include the standard preliminary-estimate notice; when unchecked, no quotation-basis note is generated and the app does not claim a site visit. New assistant JSON should use `quote.is_floor_plan_estimate` as a boolean. Legacy `quote.estimate_basis` and `quote.estimate_note` fields remain accepted for existing imports, but new output should omit automatic notes unless the checkbox/boolean is true.

Deploy over HTTPS for native screenshot file sharing. The mobile **Pay with UPI** action requires a compatible installed UPI app; desktop users use bank details or scan the QR with a phone. Screenshot sharing depends on browser/device file-share support. When unavailable, the customer downloads the image, opens WhatsApp and attaches it manually. No delivery or payment verification is implied by opening the share sheet.

After a release that changes assistant guidance or the reusable rate card, copy the app's current **Assistant instructions** into the saved Gem/Custom GPT configuration. Final JSON uses one complete copyable fenced block and includes tailored `suggested_addons`; those suggestions require owner review before entering the quotation scope.

## 4. Add your domain

In Cloudflare, select **Workers & Pages → quotation → Settings → Domains & Routes → Add → Custom Domain**. Select a hostname managed by your Cloudflare account, such as `quotes.umeinteriors.com`. Open it and test one fresh owner publication and a customer Save operation. The app generates new share links using the current hostname.

## Future updates

The current release includes private drafts, automatic owner-only revisions, quotation material snapshots and confirmed work orders. These fields use the existing JSON runtime store; no new database or migration is required for this update. Refresh the Gem/Custom GPT's saved instructions from the app after deployment. Package names displayed to users are Standard, Premium and Luxury; JSON keys remain Base, Normal and Premium.

Work-order creation is an explicit owner action in **Quotations → Create work order / Payments & work orders**. Existing bank-verified bookings can be confirmed without recording another payment. Deployment does not automatically convert legacy quotations or add financial records. Work-order revision previews are read-only; current bank settings, verified credits and the original booking confirmation date are retained in the confirmed document.

The v11 catalogue adds editable hardware priorities/scope and saved assistant corrections while retaining owner rates, business details and existing brand edits. Additive quotation fields support linked furniture and validity days; no SQL migration is required. Historical quotation/material snapshots are preserved. Publish an update to apply new layout/material settings to an existing customer job. Refresh the saved external assistant instructions after deployment and after later reusable rate/correction changes.

Local source changes are not live until this deployment procedure completes. The QA notes distinguish local checks from previously deployed behavior.

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

Update OWNER_USERNAME and OWNER_PASSWORD in **Workers & Pages → quotation → Settings → Variables and Secrets**, then deploy the changes. Choose **Secret** as the type for both values. These must be runtime Worker secrets, not build variables or secrets on a different Worker/environment. This repository sets keep_vars=true so code deployments preserve dashboard runtime variables; encrypted credentials should remain Secret bindings. Wrangler can also prompt for each value:

```powershell
npx wrangler --config ./wrangler.toml secret put OWNER_USERNAME
npx wrangler --config ./wrangler.toml secret put OWNER_PASSWORD
```

A changed runtime username or password replaces the saved account on the next API request and revokes prior owner sessions. Sign in again with the configured values. No database deletion or reset is needed. Usernames need 3–64 characters starting with a letter or number; email addresses and business names with spaces, dots, underscores, plus signs or hyphens are accepted; passwords need 12–256 characters. Invalid configuration produces a clear configuration error instead of silently accepting the previous password.

Changes made through the app’s Account page persist across requests and deployments while the Cloudflare secret values stay unchanged. A later Cloudflare secret change takes precedence. The app stores a salted PBKDF2 baseline to detect that change, with no plaintext credentials in D1. This release also reconciles older accounts that have no baseline to the currently configured secrets. Quotations, payments and rate cards are retained.

For local Express development, restart the server after editing .env. Production Worker secret updates and local .env values are independent.

## Cloudflare references

- [Workers static assets and SPA routing](https://developers.cloudflare.com/workers/static-assets/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [D1 export](https://developers.cloudflare.com/d1/reference/wrangler-commands/#export)


## Renamed Worker and old links

The main deployment target is now quotation, at https://quotation.umeinteriors.workers.dev. Keep owner runtime secrets on this Worker. The old ume-interiors-quotation-studio Worker serves only a temporary redirect for GET/HEAD requests and never reads or writes the studio database. Existing customer-link paths and package query strings are preserved. A stale old-host submission gets a refresh message instead of forwarding passwords or payments.

The redirect uses wrangler.legacy-redirect.toml; ordinary npm run deploy updates only the quotation app. Redeploy the redirect separately only when its target changes:

```powershell
npx wrangler deploy --config wrangler.legacy-redirect.toml
```
