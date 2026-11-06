# Assistant handoff checks — 6 November 2026

These checks exercise supported JSON, pricing, validation, presentation and generated instruction content. They do not claim that an external Gemini Gem or Custom GPT has been reconfigured or run automatically.

| Scenario | Expected behaviour | Verification |
|---|---|---|
| Hall has TV, crockery and a loft above crockery | Keep the loft immediately after crockery, before the next main unit | Explicit parent ordering and rendered customer/PDF checks |
| Bedroom has wardrobe loft and dressing loft | Wardrobe → its loft → Dressing → its loft | Distinct parent references, including deliberately shuffled input |
| Same-sized optional lofts are reordered | Preserve which parent's loft was agreed, not just the first matching name | Selection identity regression |
| Multiple lofts have no confirmed location | One combined clarification; main-unit dropdown/validation blocks an ambiguous publication | Validation cases for missing links and cycles |
| Shoe storage comes in Hall notes | Move it and confirmed related work to Entrance & Shoe Storage; remap references | Paths, suggestions, optional pointers and unchanged-total checks |
| Ordinary quotation uses saved rates | Show only used rates, compact room scope and one package-total preview; do not duplicate the full catalogue | Generated instructions and known arithmetic fixture |
| Owner changes a reusable rate | Save all confirmed package values; next setup uses the new rate | Persistence, copy/download equality, mobile save/reload |
| Owner sets a one-job custom rate | Keep the reusable catalogue unchanged | Pricing/import regression |
| Owner reports a recurring validation mistake | Fix that field and all instances, retain a current-chat checklist; save an approved reusable lesson through supported JSON | Deduplication/persistence and public-payload privacy tests |
| New AI chat uses an old setup | Require the refreshed app instructions; never claim silent external memory/configuration changes | Explicit handoff limitation in instructions/UI |
| Owner edits an old quotation | Show today and 30 days; changing issue/date/days recalculates expiry | Mobile/desktop entry, preview and publication checks |
| Owner enters 26 or 28 days across a month/year boundary | Use calendar-day arithmetic; keep ISO in JSON and DD-MM-YYYY in the document | Leap/year-boundary and invalid-date cases |
| Shared hardware, plywood, drawers, bank or payment terms | App supplies them once; JSON notes stay empty unless job-specific | Automatic-content ownership tests and actual PDF markup |
| Optional shoe cabinet is selected | Room comparison price/count agrees with selected scope; no false zero-price row | Shared comparison calculation regression |

The example JSON remains one complete copyable fenced block, with missing customer facts gated for review. The app's saved rates and calculated totals remain authoritative over an assistant's indicative arithmetic preview.
