# Release verification — 2 November 2026

## Automated verification

All 27 automated tests pass for this release, including owner publication, customer saving and immutable revisions.

Pricing/import/review gates, current assistant instruction snapshot, actual rendered payment/link QR scan decoding, sessions and credential changes, owner API access, full-phone lookup, public payload minimization, payment validation, and real SQLite optimistic-transaction checks pass. Add-on tests verify that recommendations do not affect base pricing, accepted work remains optional, missing confirmed details block publication, and malformed/duplicate suggestions are rejected.

TypeScript, production Vite build, Cloudflare Worker dry-run and the dependency audit are checked for the release. The audit reported zero known vulnerabilities after removing unused packages and updating Wrangler/esbuild.

## Browser verification

The customer portal, /owner sign-in, owner Create/Quotations/Assistant instructions/Payments tabs, account form, private customer quote, direct room-price choices, mixed grades/PVC and Save/reload were checked. Widths checked: 320, 390, 768 and 1440 CSS pixels. No page-wide overflow or broken package/logo assets were observed. Long owner tables scroll within their own containers.

Customer views without a valid owner session do not show quotation editing controls. API enforcement separately blocks unauthorized edits. Compact package thumbnails and consistent customer table typography are used.

## Cloudflare runtime

Correct repository migrations were applied to a local D1 database. An actual Wrangler dev Worker verified unauthorized bootstrap 401, owner login/session, canonical UPI, catalogue write/reload, cross-origin rejection and logout revocation. Fresh cloud storage starts with no customer quotations. Local credentials and customer runtime data are excluded from Git and the deployment bundle.

## Scope and limits

Cloudflare production deployment and a live bank transaction were not performed. Software checks and Chromium viewport tests do not cover every physical device or possible input. Use the deployment guide to configure your own D1 database and owner secrets.

## PDF preview and print design

The PDF preview uses measured 210×297mm page nodes with the same fixed padding, typography and table geometry used by browser printing. Logical blocks and table rows are paginated, section/table headings repeat, and pages are numbered. The reference quote now previews five pages. The reference quote was checked as a five-page preview; measured page bodies showed no vertical overflow before continuous packing. Print preparation waits for fonts and layout; direct Download PDF uses the same preview pages.

Actual native Save as PDF visual verification was interrupted by the computer-use safety check because the active native browser URL could not be confirmed. The saved native PDF has therefore not been independently rendered in this session. Use A4 with the default 100% scale and no browser-added headers/footers. This is a verification limit, not a claim that native export was tested successfully.

The AI add-on review panel was browser-tested with a practice JSON: a tailored folding-desk recommendation could be added as optional, its missing measurements remained under review, and the base price stayed unchanged. No live quotation was published during that check.
