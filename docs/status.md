# Status

Read this at the start of every session. Updated at the end of each batch and each release. How we work: `docs/workflow.md`.

_Last updated: 2026-11-16._

## Where we are
- Setup batch done (one PR into `main`). No code yet, nothing live.
- The price API was checked live: the four endpoints in `docs/spec.md` §4 work as assumed.
- Until the foundation batch adds `package.json`, the **checks** run fails at `make setup`. That's expected.

## Next up
- **Foundation batch** (`docs/plan.md`). Starts with a batch plan for the owner's OK. The Vercel step waits on `TODO-PC.md` step 2.
- Start sessions for this repo in the **`osrs-flipping-dashboard`** cloud environment: it can reach the price site.

## Open questions for the owner
- For the data job batch: **should window hours be changeable on the phone in v1?** Recommendation: not yet. Keep 22:00–07:00 / 07:00–22:00 in the repo's settings file (a change is a quick request to Claude) and add the phone setting in the Personal batch, once we know how heavy redoing the scoring on the phone is.

## Owner's to-dos
See `TODO-PC.md`.
