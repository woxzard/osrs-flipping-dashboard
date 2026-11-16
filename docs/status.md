# Status

Read this at the start of every session. Updated at the end of each batch and each release. How we work: `docs/workflow.md`.

_Last updated: 2026-11-16._

## Where we are
- **Released on `main`:** setup and foundation batches. The page shows "No picks yet" until the data job exists. `next` has nothing beyond `main` except doc updates.
- The repo is public. The price API was checked live: the four endpoints in `docs/spec.md` §4 work as assumed.
- **Vercel:** connected. A real build of a PR branch succeeded with `vercel.json` (2026-11-16).
- **Preview address for `next`:** expected to be https://osrs-flipping-dashboard-git-next-woxzard.vercel.app (worked out from Vercel's naming of the PR branch preview; not opened yet, the owner should confirm it loads).
- The owner pre-approved `owner-ok` for the three foundation PRs only. Later high-risk PRs wait for the owner again.

## Next up
- **Data job batch** (`docs/plan.md`). The plan was sent but is **not approved yet**: get the owner's OK and the answers below first.
- Start sessions for this repo in the **`osrs-flipping-dashboard`** cloud environment: it can reach the price site.

## Open questions for the owner
1. **Should window hours be changeable on the phone in v1?** Recommendation: not yet. Keep 22:00–07:00 / 07:00–22:00 in the settings file and revisit in the Personal batch; changing them on the phone means the phone must redo the scoring from the raw history.
2. **How many items get a history request each hour?** Recommendation: a cap of 300, from the most-traded items that have a buy limit and both prices (about 300 requests an hour, spaced out over a little more than a minute).
3. **May Claude check the tax rules on the Wiki's own page?** That needs `oldschool.runescape.wiki` added to the `osrs-flipping-dashboard` cloud environment (the owner gets an approval prompt). Recommendation: yes; the tax rules in spec §5 are still unverified. Without it, build on the spec's numbers and flag them as unchecked.
4. **Does the `next` preview address above open on your phone?**

## Good to know
- If a PR's risk-gate run hangs "in progress" after labels are added, two runs are waiting on each other: cancel the stuck run and edit the PR description to start a fresh one. Adding the labels in one step right when the PR opens seems to trigger it.

## Owner's to-dos
See `TODO-PC.md`.
