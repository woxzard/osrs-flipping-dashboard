# Implementation plan

What's next, in order, as batches (`docs/workflow.md`). Finished work is one line each; full old plans move to `docs/archive/`.

## Done
- **Setup** (2026-11-16, one PR into `main`): template copied in, project profile, spec, stack choice, Makefile / CI / Dependabot / risk paths, owner's steps in `TODO-PC.md`.
- **Foundation** (2026-11-16, PRs #2–#4, release #5): page skeleton and tools; saved API samples and the first end-to-end check on a simulated iPhone; Vercel settings.

## Next: Data job
Goal: every hour, GitHub fetches prices, scores the flips as in `docs/spec.md` §5, and publishes the results to the `data` branch. The page keeps showing item names only; the full list and controls come in the dashboard batch.

**Approved by the owner on 2026-11-17. All three PRs are on `next` (#7–#9).** Still open before the release: one real run of the job from a session that can reach the price site (`docs/status.md`). After the release: start the workflow by hand once and check the released page.

1. **Scoring rules** (`risk:medium`). The rules from spec §5 in `shared/`: night and day windows in Manila time, the 70% buy and sell levels, tax, profit, quantity, fill chance, trend and warning flags, rank. All starting values in one settings file. Unit tests on the saved samples, including tax edge cases (under 50 gp, the 5m cap, bonds), hours with no trades, and items with under 14 days of history. Done when the tests pass and a scored whip, bond and 3rd age amulet from the samples look sensible in the PR notes.
2. **The job** (`risk:high`: `job/`). Fetches the item list, latest prices and 24-hour data, narrows to candidates, fetches hourly history only for those, scores them, and writes `picks.json` plus one small history file per item. If the Wiki fails or returns nonsense, it publishes nothing and the run fails, so the last good results stay. A sample run on the saved responses is compared with a saved expected result, as part of `make e2e`. Done when that check passes here and on GitHub, and one real run from a cloud session produces a believable file.
3. **The hourly schedule** (`risk:high`: GitHub workflow). Runs at 7 minutes past every hour and can be started by hand. Overwrites the `data` branch each run. GitHub only runs schedules and hand-started runs from `main`, so it can't be tried before the release is merged: run the job from a cloud session first. Done when, after the release, a hand-started run publishes the file and the released page lists real item names with a fresh update time.

Then the release PR `next` → `main`.

## Later
1. **Dashboard:** controls, picks list, item detail, freshness, all the loading / empty / error states. Propose the High/Low volume cut-off from real data.
2. **Personal:** "I'm flipping this" with undo, My flips, watchlist, blocklist, window settings.
3. **After v1:** flip log with export; backtest to tune the scoring; phone notification for watched items.

## On hold
- Nothing.
