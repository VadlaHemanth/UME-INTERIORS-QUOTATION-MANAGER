# UME Interiors Quotation Manager

A private owner workspace and customer quotation portal for Umamaheshwara Enterprises, Hyderabad. React + TypeScript, a local Node server, and a Cloudflare Worker with D1 storage.

## Run locally

Requires Node.js 22.15 or newer.

```powershell
npm ci
Copy-Item .env.example .env
# Edit .env with your OWNER_USERNAME and a unique OWNER_PASSWORD (12+ characters).
npm run dev
```

Open **http://127.0.0.1:3000/** for the client portal and **http://127.0.0.1:3000/owner** for owner sign-in. This prepared workspace already has a private `.env`; its initial local login is saved in `LOCAL-LOGIN.txt`. Both are excluded from Git. Use **Settings → Account** after sign-in to update your username and password yourself. Enter your current password, choose a new password of at least 12 characters, confirm it, and select **Save sign-in details**. Changed credentials persist in your local database and invalidate earlier sessions.

Customer quotations open at `/q/<private-token>`. `/studio` remains a legacy owner-route alias. The homepage contains no owner sign-in form.

## Owner workflow

1. Copy the current **Assistant instructions** into one Gemini Gem or Custom GPT. They include the current reusable rate card. Copy them again after changing reusable rates.
2. Paste/upload the assistant's `quotation-studio.draft.v2` JSON, or start a blank quotation.
3. Review customer details, measurements, work types, optional items, PVC eligibility, rates and open questions. Tick **This quotation is based on the supplied floor plan** only when that is true. No missing measurements are guessed. `Base` is the schema name for the customer-facing **Standard** package.
4. Review **Suggested for this home** recommendations returned in `suggested_addons`. Add useful ideas as optional items or dismiss them. Unaccepted suggestions never enter the scope or totals; accepted ideas still need confirmed measurements and prices.
5. Choose a default package using the clickable package cards or dropdown. Select **Save & publish quotation** for a private link; use revision mode when replacing an earlier quotation.
6. Review saved customer selections and messages in **Quotations & selections**. Verify payment screenshots received on WhatsApp against the bank statement, then record confirmed receipts in **Payments**. A screenshot never counts as verified payment by itself.

Customers can compare three packages, mix room grades, add eligible PVC, select optional work, save choices, request changes, and print/save a quotation PDF. Contact-request saving is labelled **Save**.

## Quotation basis and notes

The owner studio has one clear checkbox: **This quotation is based on the supplied floor plan**. When it is checked, the customer quotation and PDF include the standard preliminary-estimate notice. When it is unchecked, the app generates no quotation-basis note and does not imply that a site visit has happened.

A checked floor-plan estimate carries a preliminary estimate notice in the customer view and PDF: on-site measurements, scope, requirements, material specifications and prices may change after the site visit; changes require a revised quotation and written customer approval before work proceeds. Review the customer preview before publishing.

In assistant JSON, use the preferred boolean `quote.is_floor_plan_estimate`: `true` when the owner confirms the supplied floor plan is the basis, otherwise `false` (or omit it). The legacy `quote.estimate_basis` and `quote.estimate_note` fields remain accepted when importing existing JSON, but new assistant output should use the boolean and omit automatic notes when it is false.

## Business, bank and account settings

After owner sign-in, open **Settings → Business** to edit the display/legal names, description, proprietor, website, contact numbers and business address. Open **Payment details** for the bank, branch, account holder/name, account number, IFSC, UPI ID and UPI payment limit. Select **Save details** to persist changes. Subsequent customer quotation loads and PDF previews use the saved business and payment details.

Every payment QR code is generated from the saved UPI ID and account holder name. The customer QR uses the entered payment amount; the PDF booking QR uses the quotation's booking amount. The PDF's online quotation QR uses the current hosting origin. Field-format checks do not verify a bank account or recipient; confirm the details with the bank before saving. Automated tests decode the actual PDF QR with edited recipient details. No live bank transaction was performed.

Use **Settings → Account** to change your own username and password. Account changes persist while the configured owner environment secrets remain unchanged; a later secret rotation takes precedence. Password entry and changes remain with the user.

## Customer payments and screenshot sharing

On narrow mobile layouts, **Pay with UPI** opens a compatible installed UPI app with the entered amount and saved recipient. It is unavailable for invalid amounts, amounts above the configured UPI limit, missing UPI details or small orders requiring owner confirmation. Desktop customers can open **Bank details & QR**, scan the payment QR from a phone, or use a bank transfer. A mobile viewport alone does not guarantee an installed UPI app or successful handoff.

For payment evidence, attach a JPG/PNG/WebP screenshot up to 10 MB, review the consent, and tap **I’ve made the payment**. On browsers supporting native file sharing, the image opens in the device share sheet. Choose WhatsApp, select the proprietor and tap Send. Secure HTTPS (or localhost), browser file-share support and an available share target are required.

If sharing is unavailable or fails, **Download screenshot** and then **Open WhatsApp to attach screenshot** provide a manual path. Attach the saved image yourself. Cancelling the share sheet does not report delivery or save payment acceptance. Screenshots are not uploaded to app storage and never count as verified payment; the owner checks bank credit and records confirmed receipts. Physical Android-to-WhatsApp delivery and live UPI payment were not verified from this Windows session.

## Production hosting

Use [the Cloudflare deployment guide](docs/CLOUDFLARE_DEPLOYMENT.md). This is a full-stack Worker + D1 app; a static-only `dist` upload cannot process sign-ins or save quotations. The business deployment is live at [UME Interiors](https://quotation.umeinteriors.workers.dev), with [owner access](https://quotation.umeinteriors.workers.dev/owner). Its D1 database and owner secrets are configured. Configure your own account, D1 database UUID and owner secrets for a separate deployment. Cloudflare production starts with an empty quotation list; local customer records and credentials are never bundled into the deployment.

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

## Assistant JSON and tailored recommendations

Copy the current **Assistant instructions** into your Gemini Gem or Custom GPT before requesting a quotation, and refresh that saved configuration after reusable rate-card changes. The snapshot is not a live sync. The app does not require an AI API key or send customer data to an AI service itself.

The instructions require one complete JSON object inside one copyable fenced `json` block, with no surrounding prose. The loader accepts either the copied JSON contents or the complete fenced block. Final quotation output always includes `suggested_addons`, using `[]` when no useful recommendation fits the actual brief.

Each recommendation contains an existing zero-based `room_index`, a tailored `reason`, and a complete `item` with `optional: true`. Unknown dimensions and quantities stay null; no rates or household facts are invented. Recommendations stay outside the quotation scope and totals until the owner adds them as optional and confirms missing measurements, quantities, PVC scope and rates. Confirmed customer-requested optional work belongs directly in `rooms[].items`.

Eligible catalogue work types include the standard PVC contact parts from the current instructions. For an existing draft with missing parts, review the list and choose **Use reviewed standard PVC scope**. Explicit practice records require real-customer confirmation before publication; omitting `is_demo` from a legacy import does not itself make the job a demo.

Account recovery and runtime secret changes are covered in the deployment guide. The user enters passwords directly in **Settings → Account** or the relevant private Cloudflare settings; no password is included in documentation.
