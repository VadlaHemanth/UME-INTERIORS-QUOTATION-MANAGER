# Release verification — 6 November 2026

## Discoverable work orders and confirmed-document parity

Published quotation rows now offer **Create work order**, opening **Payments & work orders** with the job selected. The setup shows agreed total, verified credits, booking required and booking still to verify. Partial verified credits do not create a work order. Completing the booking creates it on the same customer link; an explicit confirmation can use an existing verified booking without adding another ledger entry. The route is owner-only and idempotent, rejects missing/unverified credits, and detects a changed revision or customer selection before creating the document or recording a payment. Later payment credits and owner revisions retain the original booking confirmation date.

Work-order online/PDF views use agreed prices only, the walkthrough order, Height × Width, finish/preferred plywood, saved material/warranty/drawer terms, current bank recipient, verified payments and remaining milestone balances. The payment QR uses the next scheduled balance within the saved UPI limit, leaves larger amounts for entry and disappears when fully paid. Proposed-revision previews retain credits and agreed room/optional choices while disabling payment, image sharing and live QR codes. PDF payment explanations travel with the milestone table; terms stay with acceptance, with no duplicate standalone laminate clause or quotation-only footer labels.

All **88 tests pass**, and type checking/build pass. Isolated synthetic-data Chromium checks verify the new owner flow and work-order view at **320/390/768/1440 pixels**, including 44px setup controls, no horizontal page overflow and no runtime errors. Recording ₹10,000 then ₹40,000 creates the work order only after the verified booking threshold; confirming an existing ₹50,000 booking leaves the ledger unchanged. Owner online and PDF revision previews retain credits and are read-only. Native print and the visible preview contain identical measured page text: seven work-order pages and eight quotation pages; a separate extreme-description/site-note quotation produces twelve pages. Every page has one logo header, nonempty content, no measured body overflow and no trailing orphan section heading. Rendered furniture, payment/QR, terms/acceptance and proposed-revision pages were inspected. QR tests decode the actual rendered SVGs for an edited recipient, a ₹5,000 scheduled balance, over-limit entry and fully paid cases. No real bank entry or WhatsApp message was sent; physical Android share-sheet behavior is outside this Chromium-emulation check.

## Walkthrough order and visible plywood comparison

Online quotations, owner room editing/previews, work orders and PDFs display rooms in a consistent walkthrough order: Hall/Living/Dining, Pooja, Kitchen, Master Bedroom, Children’s Bedroom, Guest Bedroom, other bedrooms and remaining spaces. Hall furniture starts TV unit, crockery cabinet and vanity, followed by related panelling/other work. Kitchen and bedroom furniture use construction-based sequences. Equal-priority/unknown names remain stable, and absent rooms/items are not invented. Sorting is view-only: original roomIndex/itemIndex values, source JSON arrays, mixed-package selections, optional pointers, rates and saved snapshots remain unchanged. PDF room numbers follow the visible sequence.

The plywood section uses visible Basic/Standard/Premium comparison cards. Each saved brand/product appears beside its manufacturer-warranty period; Basic explicitly says when no fixed period is listed. Conditions explain that listed brands are alternatives and coverage follows the selected product/certificate/invoice. No accordion interaction is required. Package data comes from the quotation's saved catalogue; the selected package can be identified without promising coverage for the entire furniture installation. The AI instructions specify the same ordering and require remapping room/item references if rearranging newly generated JSON, while leaving app-generated plywood/warranty content out of notes.

All 84 tests pass, with coverage for stable ordering, source-index and pricing preservation, warranty-card contents, edited settings, zero-year coverage, and current downloadable instructions. Production-bundle Chromium checks at 320/390/768/1440 pixels show all thirteen fixture products without hidden rows, horizontal page overflow or runtime errors. A deliberately unsorted fixture confirms Hall/Pooja/Kitchen order in customer and PDF comparisons, TV/Crockery/Vanity row order, preserved mixed packages and optional selection, owner editing of the correct original TV item, and matching unpublished preview order. The nine-page mixed-package fixture has no overflowing print bodies or orphan headings; rendered comparison/furniture pages were reviewed. A separate confirmed-work-order fixture starts with Hall/TV online and in native print, shows its six Premium plywood options openly, and retains four agreed-scope columns across seven pages without print overflow.

## Height and width labels

Online quotation tables and PDFs now show “Height × Width” beneath Dimensions; the mobile item layout names both dimensions in its visible label. Assistant instructions require confirmed rectangular front-area measurements in that order, preserve other measurement types and ask about ambiguous orientation once during consolidated review. Existing numbers and prices are unchanged. All 80 tests pass, including the instruction/download match and actual PDF markup. Chromium checks at 320, 390 and 1440 pixels confirm the labels without page overflow. Normal/native quotation, work-order and long-content PDFs retain their tested page counts, with no overflowing page bodies or trailing section headings.

## Mobile workflow follow-up after the rate-card release

After publishing the rate editor/defaults/instructions, the broader mobile pass checked customer package changes, room mixing, optional-work selection, saved preferences, support requests, payment-image attachment and sharing, cancellation, UPI recipient links, owner login, quotation listing/editing/publication, returning to the studio, settings and assistant instructions. Synthesized touch and native keyboard checks cover 320px and 390px portrait plus 844×390 landscape; the initial pass also covers 768px tablet and 1440px desktop. Checked screens have no horizontal page overflow or browser runtime errors. The file-share test checks the actual file type, byte count and quotation-based filename with a mocked native share target; no WhatsApp recipient or bank transaction was used.

Two follow-up fixes shipped: a cancelled image share now gives a neutral retry message while keeping the screenshot attached; a section heading moves with its table when a complete table is advanced to the next PDF page. Preview and native-print checks cover normal/mixed/optional quotations, confirmed work orders and unusually long descriptions. Tested selections produce eight or nine quotation pages, seven work-order pages and eleven long-content pages, with no measured print-body overflow, empty pages or trailing section headings. Rendered comparison and furniture pages confirm the heading and table stay together. The automated suite remains 80/80 passing, and type checks/build pass. Physical Android sharing/keyboard behavior remains outside this Chromium-emulation check.

## Mobile rate editor and owner-approved defaults

The owner corrected Box type from the initial spoken values using a screenshot: Basic ₹950, Standard ₹1,150, Premium ₹1,350, with ₹100/sq.ft PVC extra. Frame rates are ₹750/₹900/₹1,050 with ₹60 PVC; loft and low-roof closures share those base rates with ₹75 PVC. Folding tables remain ₹700/₹800/₹1,000 with zero PVC; plywood wall panelling (including below wall cabinets) uses ₹400/₹500/₹550 plus ₹150 PVC; Pooja CNC/glass doors remain ₹700/₹800/₹850 with zero PVC. Other shipped work types keep their base prices with zero PVC extra. The one-time v10 update preserves custom work types, company/bank details and plywood settings. Published pricing snapshots stay unchanged; the defaults apply to new quotations and owner-published updates.

Mobile rates use labeled two-column fields rather than a narrow, nested scrolling table. All work types are visible initially, with search and an active-work filter. Amounts can be cleared/replaced using the keyboard; save state, errors and retry stay beside the editor. Linked frame edits retain distinct PVC extras. New work supports billing unit and specification and requires confirmed prices rather than prefilled guesses. Old browser payloads cannot downgrade the catalogue version and trigger a second reset.

Instructions distinguish ordinary quotation JSON, item-only custom rates and reusable rate-card changes. The AI reuses saved known rates; it generates rate-card JSON only for confirmed additions/changes. A consolidated saved-rate table, quotation-rate table and scope review precede the single final copyable JSON response; answered questions are not repeated. Imports reject missing rate values instead of fabricating them, and publication blocks an unpriced new work type.

All 80 tests pass. Chromium browser checks at 320, 390, 768 and 1440 pixels verify layout and input sizes. Synthesized touch taps and native keyboard input exercise editing, save/reload persistence, linked frame rates, failed-save preservation and retry, search empty state, and new-work units/specifications, with no runtime errors. This is browser touch emulation, not a physical Android test.

## Package warranty labels and display name

Standard and Premium package choices now show a shared shield label in the online quotation and PDF. The label uses the maximum warranty among that quotation's saved plywood products: up to 15 years for Standard and 30 years for Premium in the current catalogue. The owner confirmed 15 years after the saved products were checked. A nearby sentence explains manufacturer/product conditions; the full brand details remain available. Empty or zero-year lists do not invent a warranty. Instructions explain that the app generates these labels automatically and must not receive duplicate JSON notes.

The shipped display name is UME Interiors, retaining Umamaheshwara Enterprises as the legal name. The one-time v8-to-v9 update changes only the exact previous shipped display name and version, preserving custom names, product coverage, prices and bank details. The PDF signature reads “For UME Interiors (Umamaheshwara Enterprises)”.

All 76 tests pass, including edited warranty values in labels, terms and assistant instructions, actual PDF markup, and preservation of custom settings during the display-name update. Production-bundle Chromium checks at 320, 390, 768 and 1440 pixels found no page overflow or clipped labels. Selected Standard styling was checked on mobile and desktop. Unpublished and published Online/PDF styles match; both printed fixtures have eight A4 pages with no body overflow. Rendered first and signature pages were visually checked, and the browser reported no runtime errors.

## Assistant content-ownership follow-up

The instruction contract explicitly separates app-generated document sections from AI-generated scope. Ordinary JSON examples keep quote.notes and owner_requests empty; genuine job-specific notes, physical extra work and unresolved exceptions remain supported. The conflicting instruction to include standard exclusions was removed. Reference material, exclusion and term lists now come from the same rendering helpers used by the quotation/PDF and reflect edited settings. New regression tests check this boundary, saved custom wording and rates, the single copyable JSON block, and that exporting instructions does not modify settings. This verifies the app's handoff contract; an external Gem must be updated with the copied instructions to receive it.

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
