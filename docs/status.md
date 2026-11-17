# Status

Read this at the start of every session. Updated at the end of each batch and each release. How we work: `docs/workflow.md`.

_Last updated: 2026-11-17._

## Where we are
- **Released on `main`:** setup, foundation and the **data job batch** (release PR #10, merged 2026-11-17). The hourly job runs from `main` at 7 minutes past every hour and publishes to the `data` branch.
- **First published run (hand-started, 2026-11-17 12:37 Manila):** 290 items in `picks.json`, 290 history files, no bond. Top ten: Purple sweets, Uncut dragonstone, Dragonfire ward, Masori mask, Hydra leather, Crimson kisten, Ancient godsword, Pegasian boots, Red dragonhide, Sanfew serum(4). The page still shows the ten names only; prices and controls come with the dashboard batch.
- **On `next`, not released:** nothing.
- **Vercel:** connected. **Preview address for `next`:** expected to be https://osrs-flipping-dashboard-git-next-woxzard.vercel.app (not yet confirmed by the owner).
- No `owner-ok` is pre-approved: high-risk PRs wait for the owner again.

## Next up
1. The **Dashboard batch** (`docs/plan.md`): send its plan first.
2. At the start of that session, check that the scheduled runs kept going (Actions → Hourly data: a green run every hour, `data` branch updated within the last hour or so).
- Start sessions for this repo in the **`osrs-flipping-dashboard`** cloud environment: it can reach the price site and the Wiki.

## Open questions for the owner
1. **Does the `next` preview address above open on your phone?**
2. **Does the released page show the ten item names and a fresh "Updated" time on your phone?** (The published file is fine; only you can see the real page.)

Seen in the real run, for the dashboard and backtest batches (nothing to decide now):
- No pick ever shows more than about 10 of 14 nights. The buy and sell prices are each reached on about 70% of nights, so both together land at 6–10 of 14. The dashboard should not present 8 of 14 as weak.
- Suggested buy prices can sit a few percent under the live price for a rising item (Masori mask: buy at 13.69m, trading at 14.6m). That is the method working (wait for the dip), but such offers fill less often.
- The top ten is a mix: four cheap stackables and six items over 8m, sized for 50m in one slot.
- Code review notes left for later are listed in `docs/decisions.md`.

## Good to know
- If a PR's risk-gate run hangs "in progress" after labels are added, two runs are waiting on each other: cancel the stuck run and edit the PR description to start a fresh one. Adding the labels in one step right when the PR opens seems to trigger it.
- "Merge when green" only acts when a check run finishes. A PR that was a draft while its checks ran needs a nudge after it is marked ready: edit the PR description (that reruns the risk gate).
- After a squash merge the session branch on GitHub still points at the old commit: restart it with `git push --force-with-lease=<branch>:<old commit> origin <branch>`.
- A session without package installs can still run the unit-test logic, the type check, Prettier and the job's sample run with the tools pre-installed on the machine, but not `make check` / `make build`; open the PR as a draft and let GitHub's checks be the test.

## Owner's to-dos
See `TODO-PC.md`.
