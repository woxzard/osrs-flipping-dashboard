# Status

Read this at the start of every session. Updated at the end of each batch and each release. How we work: `docs/workflow.md`.

_Last updated: 2026-11-16._

## Where we are
- Setup batch released to `main`. Nothing live yet.
- Foundation batch in progress on `next`: all three PRs merged (page skeleton and tools; saved samples and first end-to-end check; Vercel settings). The page shows "No picks yet" until the data job exists.
- **Preview address for `next`:** not known yet. It exists once the owner has imported the repo in Vercel (`TODO-PC.md` step 4); record it here.
- The price API was checked live: the four endpoints in `docs/spec.md` §4 work as assumed.

## Next up
- Owner: import the repo in Vercel, then test and merge the foundation release PR (`next` → `main`).
- Then the **data job batch** (`docs/plan.md`), starting with a batch plan.
- Start sessions for this repo in the **`osrs-flipping-dashboard`** cloud environment: it can reach the price site.

## Open questions for the owner
- For the data job batch: **should window hours be changeable on the phone in v1?** Recommendation: not yet. Keep 22:00–07:00 / 07:00–22:00 in the repo's settings file (a change is a quick request to Claude) and add the phone setting in the Personal batch, once we know how heavy redoing the scoring on the phone is.

## Owner's to-dos
See `TODO-PC.md`.
