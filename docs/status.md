# Status

Read this at the start of every session. Updated at the end of each batch and each release. How we work: `docs/workflow.md`.

_Last updated: 2026-11-17._

## Where we are
- **Released on `main`:** setup and foundation batches. The page shows "No picks yet" until the data job is released.
- **On `next`, not released:** the data job batch (PRs #7–#9): scoring rules, the job, the hourly workflow. The release PR (`next` → `main`, label `release`) is open **as a draft** because of the blocker below.
- **Blocker before the release: one real run of the job.** The 2026-11-17 session could not reach `prices.runescape.wiki` (it was not running in the `osrs-flipping-dashboard` environment, and package installs were off), so the job has only run on the saved samples. In a session that can reach the site: `make setup`, then `NODE_USE_ENV_PROXY=1 node job/run.ts --out /tmp/out`, and check that the output is believable (about 300 candidates, sensible top ten, prices near the live ones). Then mark the release PR ready and tell the owner.
- **Vercel:** connected. **Preview address for `next`:** expected to be https://osrs-flipping-dashboard-git-next-woxzard.vercel.app (not yet confirmed by the owner).
- `owner-ok` was pre-approved by the owner for the two high-risk PRs of this batch only. Later high-risk PRs wait for the owner again.

## Next up
1. The real run above, then the owner tests and merges the release PR (merge commit).
2. After the merge: start "Hourly data" by hand (Actions → Hourly data → Run workflow), check that the `data` branch gets `picks.json` and the released page lists real item names with a fresh update time. Then move this batch to "Done" in `docs/plan.md`.
3. Then the **Dashboard batch** (`docs/plan.md`): send its plan first.
- Start sessions for this repo in the **`osrs-flipping-dashboard`** cloud environment: it can reach the price site.

## Open questions for the owner
1. **Tax exempt list.** Rate (2%, rounded down), the 5m cap and the 50 gp floor agree with a web search, but the Wiki's own page could not be opened (needs `oldschool.runescape.wiki` allowed in the cloud environment). Only bonds are treated as exempt until that is checked; taxing an exempt item only makes its profit look smaller.
2. **Does the `next` preview address above open on your phone?**

Answered on 2026-11-17 (in `docs/decisions.md`): window hours stay in the settings file for v1; at most 300 history requests an hour.

## Good to know
- If a PR's risk-gate run hangs "in progress" after labels are added, two runs are waiting on each other: cancel the stuck run and edit the PR description to start a fresh one. Adding the labels in one step right when the PR opens seems to trigger it.
- "Merge when green" only acts when a check run finishes. A PR that was a draft while its checks ran needs a nudge after it is marked ready: edit the PR description (that reruns the risk gate).
- After a squash merge the session branch on GitHub still points at the old commit: restart it with `git push --force-with-lease=<branch>:<old commit> origin <branch>`.
- A session without package installs can still run the unit-test logic, the type check, Prettier and the job's sample run with the tools pre-installed on the machine, but not `make check` / `make build`; open the PR as a draft and let GitHub's checks be the test.

## Owner's to-dos
See `TODO-PC.md`.
