# Release verification — 4 November 2026

## PDF corners and unpublished preview follow-up

The suite passes **72/72 tests**, including a new comparison of unpublished preparation with actual publication: furniture vocabulary, reviewed customer notes and priced room scopes match, without changing the editor draft. Rounded PDF table wrappers clip their child backgrounds at the same outer radius, including continuation tables.

The unpublished Online/PDF views now sit outside the studio's font/control styling. Browser checks compare computed customer and PDF styles before and after publication at 390, 768 and 1440 pixels, with zero style differences on the checked headings, package controls, table cells, figures and bank panel. Both mobile print paths generate eight A4 pages for the fixture, with no body overflow, one letterhead per physical page and no leaked editor content. Inactive QR placeholders preserve the published payment-panel geometry. Screenshots and rendered pages are checked for clean corners and aligned grids. This is tested with synthetic records in a separate local database.

## Materials and deletion follow-up

The suite passes **71/71 tests**. Additional coverage verifies automatic drawer charges at Basic ₹4,000 / Standard ₹5,000 / Premium ₹6,000 without AI notes; changed reusable drawer rates flowing into publication; edited material wording in actual PDF source markup and public catalogue responses; migration of old shipped defaults while retaining custom prices; and owner-only, explicitly confirmed deletion across a complete revision series. Deletion revokes customer links and preserves payment history. Tests also prevent deleted records from being restored by a stale draft or publication request.

Material settings use labeled, wrapping text areas, consistent panel padding and a single-column layout on small screens. Unsaved wording survives settings-tab changes and triggers the leave warning. The new defaults apply to new quotations and published revisions; previous material snapshots remain unchanged.

Production-bundle Chromium checks at 320, 390, 768 and 1440 pixels found zero page overflow, clipped settings labels or runtime errors, including a long unbroken plywood product name. The form saved edited wording and retained it across tab changes. A quotation with empty quote.notes generated an eight-page PDF containing all three automatic drawer rates and Fevicol/Jeevanjor wording; page bodies did not overflow, and every page had the same visible letterhead. Browser tests exercised native delete cancellation and confirmed deletion using synthetic records in a separate local database. No customer quotation was deleted in production.

## Current release

The regression suite passes **67/67 tests**. Added coverage verifies private draft storage, automatic metadata, latest-link resolution with immutable owner history, rate-card changes applied to the next publication, payment credits across revisions, confirmed work-order selection locks, canonical vocabulary, editable allowances, current assistant output and public removal of per-item PVC metadata. Historical pricing fixtures retain their totals.

Production-bundle browser verification uses a separate local database and synthetic QA customers. Customer and owner screens, previews, package settings, mobile consent checkboxes and work orders are checked for runtime errors and page-wide overflow. Normal, work-order and unusually long-description PDFs are generated from the same measured A4 nodes used by preview. Printed pages are checked for table grids, continuation headers, clipped content, lone totals and blank pages. No live bank transaction or physical Android WhatsApp delivery is claimed.

The owner navigation keeps the editor mounted when opening a customer quote, reloads current server data on return, and isolates quotation material snapshots from the owner's reusable catalogue. The downloadable assistant instructions must match the live generator exactly; a regression test enforces this.

Final Chromium checks cover 360, 390, 768 and 1440 CSS pixels. Package cards stay readable at tablet widths, without clipped prices or recommendation labels. Native print and preview both produce eight quotation pages and seven work-order pages for the test fixture; the long-content fixture produces eleven pages. Every physical page contains one letterhead and nonempty content. Confirmed work orders use agreed-scope wording rather than a preliminary-estimate notice. The final design inspector reported zero failures; retained warnings concern the approved ivory identity, selection borders and long-form report density.

## Earlier verification record (2 November)

## Automated verification

The earlier regression run passed **59/59 tests**, including owner publication, customer saving and immutable revisions.

Pricing/import/review gates, current assistant instruction snapshot, actual rendered payment/link QR scan decoding, sessions and credential changes, owner API access, full-phone lookup, public payload minimization, payment validation, and real SQLite optimistic-transaction checks pass. Add-on tests verify that recommendations do not affect base pricing, accepted work remains optional, missing confirmed details block publication, and malformed/duplicate suggestions are rejected.

TypeScript, production Vite build, Cloudflare Worker dry-run and the dependency audit are checked for the release. The audit reported zero known vulnerabilities after removing unused packages and updating Wrangler/esbuild.

## Current local follow-up

This release adds optional quotation basis/notes, editable business/payment settings, a mobile UPI handoff and updated customer copy.

Estimate regression tests verify that old drafts never imply completed site measurements, floor-plan notices cannot be replaced by custom notes, optional metadata survives migration/JSON round trips, and invalid or overlong/non-English notes are rejected. Pricing tests retain the historical totals and confirm that display formatting does not invent cabinet depth, stainless-steel grade or full-height construction. Assistant instruction tests verify the generated/downloaded snapshot, one copyable JSON block, `suggested_addons`, catalogue PVC scope and optional estimate fields.

The rendered-PDF integration test uses a real priced quotation and edited bank settings, extracts the actual **UPI booking** QR SVG, and decodes it with jsQR. It verifies the edited recipient/account holder, ₹50,000 booking amount, INR and current quotation reference, rather than a default recipient constant. This test renders the source markup; physical scanning and a live bank transfer were not performed.

Current Chromium checks at **320 and 390 CSS pixels** found no document overflow and retained **22 px checkboxes**. The mobile UPI action was available at ₹50,000 and unavailable at ₹1,25,000 under the configured limit; unchanged quotation selections could still be saved. These checks validate layout and browser behavior, not physical Android UPI-app handoff or WhatsApp delivery. Current desktop/settings/PDF visual checks are recorded separately when completed.

Business/account settings are intended for owner-controlled edits. The user enters the current and replacement password in **Settings → Account**; the agent has not changed the user's password during this follow-up.

Native screenshot sharing sends the selected image file through the browser's share API in a secure context. The customer chooses WhatsApp, recipient and Send. Unsupported/insecure/failed sharing offers download plus manual attachment; cancellation does not report delivery or record accepted terms. No screenshot is stored by the app or credited automatically.

## Browser verification

The customer portal, /owner sign-in, owner Create/Quotations/Assistant instructions/Payments tabs, account form, private customer quote, direct room-price choices, mixed grades/PVC and Save/reload were checked. Widths checked: 320, 390, 768 and 1440 CSS pixels. No page-wide overflow or broken package/logo assets were observed. Long owner tables scroll within their own containers.

Customer views without a valid owner session do not show quotation editing controls. API enforcement separately blocks unauthorized edits. Compact package thumbnails and consistent customer table typography are used.

## Cloudflare runtime

Correct repository migrations were applied to a local D1 database. An actual Wrangler dev Worker verified unauthorized bootstrap 401, owner login/session, the then-configured UPI recipient, catalogue write/reload, cross-origin rejection and logout revocation. Fresh cloud storage starts with no customer quotations. Local credentials and customer runtime data are excluded from Git and the deployment bundle.

## Scope and limits

Earlier deployment checks used the legacy https://ume-interiors-quotation-studio.umeinteriors.workers.dev hostname. The configured primary deployment is now https://quotation.umeinteriors.workers.dev; the rename history is recorded below. Live checks returned 401 for unauthorized bootstrap and 200 for owner login, authorized bootstrap and logout. Both production migrations are applied; the cloud quotation list starts empty. No live bank transaction was performed. Software checks and Chromium viewport tests do not cover every physical device or possible input. The deployment guide covers updates and separate-account setup.

## PDF preview and print design

The PDF preview uses measured 210×297mm page nodes with the same fixed padding, typography and table geometry used by browser printing. Logical blocks and table rows are paginated, section/table headings repeat, and pages are numbered. After the Kitchen table fix, the reference quotation previews six pages, preserves all 22 furniture rows in tables, has zero plain-text fallback fragments, one letterhead per page, no page-body overflow and no dimension-cell overflow. Print preparation waits for fonts and layout; direct Download PDF uses the same preview pages.

Actual native Save as PDF visual verification was interrupted by the computer-use safety check because the active native browser URL could not be confirmed. The saved native PDF has therefore not been independently rendered in this session. Use A4 with the default 100% scale and no browser-added headers/footers. This is a verification limit, not a claim that native export was tested successfully.

The AI add-on review panel was browser-tested with a practice JSON: a tailored folding-desk recommendation could be added as optional, its missing measurements remained under review, and the base price stayed unchanged. No live quotation was published during that check.

## Follow-up layout and payment changes

Owner quotation cards reserve space for prices and place actions in their own row. The customer payment form accepts JPG/PNG/WebP screenshots and uses native file sharing when available, with a manual WhatsApp attachment fallback. No image is automatically sent or credited. The change-request textarea and actions use a consistent grid.

The reference PDF previously flattened the Kitchen schedule into text when its table heading did not fit the remaining page space. The paginator now moves the intact table to a fresh page and splits rows with repeated column headings. Every room schedule has cell borders. Each page carries one company letterhead; section headings do not duplicate the logo.

## Mobile checkboxes and screenshot sharing

Customer and owner native checkboxes have fixed 22×22px geometry with no flex shrinking and label tap areas of at least 44px high. Customer optional-item prices wrap onto a separate line on narrow screens. Chromium viewport checks at 320, 390 and 768 CSS pixels showed 22px controls and no page-wide overflow; the optional checkbox was checked and unchecked without saving the quotation. No execution terms were accepted during verification.

Three new sharing regression tests check actual image bytes, correct MIME/filename, file-only share payload, invocation within the original tap, unsupported/insecure contexts, target-app failures and cancellation. The direct text-only WhatsApp link was removed from the screenshot picker. Native image sharing requires HTTPS and a supporting browser/installed share target. Real Android-to-WhatsApp delivery cannot be verified from this Windows session; the user chooses the recipient and sends the image on their device.


## Payment consent, assistant output and secret rotation

The payment-consent checkbox uses its own 22px grid column and a bordered, full-width label. Chromium checks at 390px and 320px kept the control at 22px with no horizontal overflow. No execution terms were accepted during testing.

Regression coverage verifies fenced/raw JSON import, complete catalogue PVC scope in instructions, mandatory JSON recommendation guidance, real-job defaults in legacy imports, explicit practice flags, and an owner-triggered bulk repair that preserves custom PVC scope and unresolved measurements. Downloadable instructions match the app’s generated instructions.

Secret-rotation tests cover username-only, password-only and combined changes; immediate old-session rejection on owner APIs and public quote reads; preserved Account-page changes when environment values do not change; older saved-account migration; invalid configuration; and preserved quotation records. The environment comparison baseline is stored as a salted PBKDF2 digest, never plaintext. No user credential value is printed or changed by these tests.


Deployment follow-up: runtime configuration messages distinguish missing bindings from invalid values without exposing credentials. Wrangler keep_vars=true preserves values entered in dashboard runtime settings. Encrypted owner credentials belong in the deployed Worker’s Variables and Secrets section, rather than build variables. The initial post-deployment check targeted the old Worker name after the owner had renamed the intended app to quotation. The renamed Worker retained both encrypted owner bindings and the same D1 database. Its owner-session configuration endpoint returned 200, as did the local endpoint. The user’s new password was not accessed or printed by the agent.


Worker rename follow-up: the owner renamed the intended app to quotation. Its runtime OWNER_USERNAME and OWNER_PASSWORD Secret bindings were confirmed by name/type only, and its /api/studio/session endpoint returned 200. The main config and deployment guide now target that Worker. The old hostname uses a separate redirect-only Worker, preventing two deployments with different credential settings from reconciling against the same D1 account. Redirect tests preserve customer URLs and prevent forwarding old-host mutation bodies.


Username validation now accepts email addresses and business names, trims surrounding username whitespace consistently and retains the 3–64 character bounds. Passwords retain the 12–256 character requirement and are never trimmed. A regression test verifies business-name login, email secret rotation and password-byte preservation.


After deployment to the renamed Worker, both encrypted secret bindings remain present. Setting OWNER_USERNAME to the exact owner-provided username resolved the runtime configuration error: /api/studio/session now returns 200. The production login page was opened with the confirmed username filled in and the password field empty. The password was not requested, accessed or changed; final interactive sign-in remains for the user.
