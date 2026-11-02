# UME Interiors Quotation Manager

A private owner workspace and customer quotation portal for Umamaheshwara Enterprises, Hyderabad. React + TypeScript, a local Node server, and a Cloudflare Worker with D1 storage.

## Run locally

Requires Node.js 22.12 or newer.

```powershell
npm ci
Copy-Item .env.example .env
# Edit .env with your OWNER_USERNAME and a unique OWNER_PASSWORD (12+ characters).
npm run dev
```

Open **http://127.0.0.1:3000/** for the client portal and **http://127.0.0.1:3000/owner** for owner sign-in. This prepared workspace already has a private `.env`; its initial local login is saved in `LOCAL-LOGIN.txt`. Both are excluded from Git. Use **Account** after sign-in to update your username and password. Changed credentials persist in your local database and invalidate earlier sessions.

Customer quotations open at `/q/<private-token>`. `/studio` remains a legacy owner-route alias. The homepage contains no owner sign-in form.

## Owner workflow

1. Copy the current **Assistant instructions** into one Gemini Gem or Custom GPT. They include the current reusable rate card. Copy them again after changing reusable rates.
2. Paste/upload the assistant's `quotation-studio.draft.v2` JSON, or start a blank quotation.
3. Review customer details, measurements, work types, optional items, PVC eligibility, rates and open questions. No missing measurements are guessed. `Base` is the schema name for the customer-facing **Standard** package.
4. Review **Suggested for this home** recommendations returned in `suggested_addons`. Add useful ideas as optional items or dismiss them. Unaccepted suggestions never enter the scope or totals; accepted ideas still need confirmed measurements and prices.
5. Choose a default package using the clickable package cards or dropdown. Select **Save & publish quotation** for a private link; use revision mode when replacing an earlier quotation.
6. Review saved customer selections and messages in **Quotations & selections**. Verify payment references against the bank statement in **Payments**. A submitted UTR never counts as verified payment by itself.

Customers can compare three packages, mix room grades, add eligible PVC, select optional work, save choices, request changes, and print/save a quotation PDF. Contact-request saving is labelled **Save**.

## Payment details

The canonical UPI recipient is **9177389543@oksbi**. Payment QR codes use a real offline QR encoder and the selected payment amount. Printed quotations use the current hosting origin for their online quotation QR. Bank account number, IFSC and branch remain those supplied in the app catalogue. QR decoding is tested; no live bank transaction was performed.

For projects below the app's booking threshold, online booking is disabled until the owner confirms a small-order payment arrangement.

## Production hosting

Use [the Cloudflare deployment guide](docs/CLOUDFLARE_DEPLOYMENT.md). This is a full-stack Worker + D1 app; a static-only `dist` upload cannot process sign-ins or save quotations. Configure the D1 database UUID and owner secrets before use. Cloudflare production starts with an empty quotation list; local customer records and credentials are never bundled into the deployment.

```powershell
npm run deploy
```

The script explicitly uses this repository's `wrangler.toml`. Keep runtime data and backup files private. Local JSON storage, local Wrangler D1 and production D1 are separate stores.

## Verification

```powershell
npm test
npm run check
npm run build
npx wrangler deploy --config wrangler.toml --dry-run
```

Tests cover pricing, imports, review gates, current assistant instructions, rendered QR decoding, session authentication, credential changes, payment validation and D1 transaction behaviour. Browser QA covers the customer portal, owner sign-in and owner tabs, customer package selection and save/reload, payment form and printable quotation at phone, tablet and desktop widths. See [QA notes](docs/QA.md) for observed results and limits.

Generated package photographs are illustrative material compositions, not product certification or proof of a particular manufacturer's construction.

## Tailored AI add-ons

The external Gemini Gem or Custom GPT can now suggest relevant optional work from the actual home brief, rooms, storage priorities, household needs and budget. Copy the updated Assistant instructions into your assistant before requesting new JSON. The app does not require an AI API key or send customer data to an AI service itself.

Recommendations use the optional root `suggested_addons` array, each containing `room_index`, a tailored `reason`, and an `item` using the existing item schema with `optional: true`. Unknown measurements/quantities stay null. The owner reviews them before inclusion. Confirmed customer-requested optional work continues to go directly into `rooms[].items`.
