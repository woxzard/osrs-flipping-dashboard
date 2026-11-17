# Status

Read this at the start of every session. Updated at the end of each batch and each release. How we work: `docs/workflow.md`.

_Last updated: 2026-11-17 (hourly timer running)._

## Where we are
- **Released on `main`:** setup, foundation, data job and the **Dashboard batch** (release PR #19, merged 2026-11-17): controls, picks list with icons, item detail with a 14-day chart, stale-data warning.
- **Hourly start:** a free outside timer (cron-job.org, set up 2026-11-17) starts "Hourly data" at :07 every hour; its test run published at 23:35 Manila. GitHub's own schedule never fired and was removed (#21, released in #22). The timer's GitHub key expires **2027-11-16** (`TODO-PC.md`).
- **On `next`, not released:** nothing but docs.
- **Vercel:** connected. **Preview address for `next`:** expected to be https://osrs-flipping-dashboard-git-next-woxzard.vercel.app (not yet confirmed by the owner; cloud sessions can't open Vercel addresses).
- No `owner-ok` is pre-approved: high-risk PRs wait for the owner again.

## Next up
1. The **Personal batch** (`docs/plan.md`): send its plan first.
- Start sessions for this repo in the **`osrs-flipping-dashboard`** cloud environment: it can reach the price site and the Wiki.

## Open questions for the owner
1. **Does the `next` preview address above open on your phone?**

Seen in the real run, for the backtest batch (nothing to decide now):
- No pick ever shows more than about 10 of 14 nights; the page words 8–9 as "typical".
- Rising items' buy prices sit a few percent under the live price; the item screen says how far ("Your buy is 6% under").
- Tax-heavy (60%) shows on about 1 in 10 top-ten rows; tuning stays in the backtest batch.
- Code review notes left for later are listed in `docs/decisions.md`.

## Good to know
- If a PR's risk-gate run hangs "in progress" after labels are added, two runs are waiting on each other: cancel the stuck run and edit the PR description to start a fresh one. Adding the labels in one step right when the PR opens seems to trigger it.
- "Merge when green" only acts when a check run finishes. A PR that was a draft while its checks ran needs a nudge after it is marked ready: edit the PR description (that reruns the risk gate).
- After a squash merge the session branch on GitHub still points at the old commit: restart it with `git push --force-with-lease=<branch>:<old commit> origin <branch>`.
- A session without package installs can still run the unit-test logic, the type check, Prettier and the job's sample run with the tools pre-installed on the machine, but not `make check` / `make build`; open the PR as a draft and let GitHub's checks be the test.

## Owner's to-dos
See `TODO-PC.md`.
