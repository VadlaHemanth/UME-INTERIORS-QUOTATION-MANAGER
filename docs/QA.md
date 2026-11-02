# Release verification — 2 November 2026

## Automated verification

All 42 automated tests pass for this release, including owner publication, customer saving and immutable revisions.

Pricing/import/review gates, current assistant instruction snapshot, actual rendered payment/link QR scan decoding, sessions and credential changes, owner API access, full-phone lookup, public payload minimization, payment validation, and real SQLite optimistic-transaction checks pass. Add-on tests verify that recommendations do not affect base pricing, accepted work remains optional, missing confirmed details block publication, and malformed/duplicate suggestions are rejected.

TypeScript, production Vite build, Cloudflare Worker dry-run and the dependency audit are checked for the release. The audit reported zero known vulnerabilities after removing unused packages and updating Wrangler/esbuild.

## Browser verification

The customer portal, /owner sign-in, owner Create/Quotations/Assistant instructions/Payments tabs, account form, private customer quote, direct room-price choices, mixed grades/PVC and Save/reload were checked. Widths checked: 320, 390, 768 and 1440 CSS pixels. No page-wide overflow or broken package/logo assets were observed. Long owner tables scroll within their own containers.

Customer views without a valid owner session do not show quotation editing controls. API enforcement separately blocks unauthorized edits. Compact package thumbnails and consistent customer table typography are used.

## Cloudflare runtime

Correct repository migrations were applied to a local D1 database. An actual Wrangler dev Worker verified unauthorized bootstrap 401, owner login/session, canonical UPI, catalogue write/reload, cross-origin rejection and logout revocation. Fresh cloud storage starts with no customer quotations. Local credentials and customer runtime data are excluded from Git and the deployment bundle.

## Scope and limits

Cloudflare production is deployed at https://ume-interiors-quotation-studio.umeinteriors.workers.dev. Live checks returned 401 for unauthorized bootstrap and 200 for owner login, authorized bootstrap and logout. Both production migrations are applied; the cloud quotation list starts empty. No live bank transaction was performed. Software checks and Chromium viewport tests do not cover every physical device or possible input. The deployment guide covers updates and separate-account setup.

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
