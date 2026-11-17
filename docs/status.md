# Status

Read this at the start of every session. Updated at the end of each batch and each release. How we work: `docs/workflow.md`.

_Last updated: 2026-11-17._

## Where we are
- **Released on `main`:** setup and foundation batches. The page shows "No picks yet" until the data job is released.
- **On `next`, not released:** the data job batch (PRs #7–#9 and the fixes from the first real run): scoring rules, the job, the hourly workflow. The release PR #10 (`next` → `main`, label `release`) is **ready for the owner to test and merge**.
- **The real run is done (2026-11-17, 11:56 Manila):** 4,681 items, 300 candidates, 290 scored, 10 with too little history, 0 failed requests, 91 seconds. Prices were near the live ones. It led to four fixes, all agreed with the owner (`docs/decisions.md`): bonds are never picked, the tax-heavy flag starts at 60%, fill chance counts out of 14, and the tax exempt list is the Wiki's full list. `make check`, `make build` and `make e2e` pass in a cloud session, and `/code-review` has been run over the whole batch.
- **Vercel:** connected. **Preview address for `next`:** expected to be https://osrs-flipping-dashboard-git-next-woxzard.vercel.app (not yet confirmed by the owner).
- `owner-ok` was pre-approved by the owner for the high-risk PRs of this batch only, including the fix PR. Later high-risk PRs wait for the owner again.

## Next up
1. The owner tests and merges the release PR #10 (merge commit).
2. After the merge: start "Hourly data" by hand (Actions → Hourly data → Run workflow), check that the `data` branch gets `picks.json` and the released page lists real item names with a fresh update time. Then move this batch to "Done" in `docs/plan.md`.
3. Then the **Dashboard batch** (`docs/plan.md`): send its plan first.
- Start sessions for this repo in the **`osrs-flipping-dashboard`** cloud environment: it can reach the price site and the Wiki.

## Open questions for the owner
1. **Does the `next` preview address above open on your phone?**

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
