# Implementation plan

What's next, in order, as batches (`docs/workflow.md`). Finished work is one line each; full old plans move to `docs/archive/`.

## Done
- **Setup** (2026-11-16, one PR into `main`): template copied in, project profile, spec, stack choice, Makefile / CI / Dependabot / risk paths, owner's steps in `TODO-PC.md`.
- **Foundation** (2026-11-16, PRs #2–#4, release #5): page skeleton and tools; saved API samples and the first end-to-end check on a simulated iPhone; Vercel settings.
- **Data job** (2026-11-17, PRs #7–#9 and #11, release #10): scoring rules in `shared/`, the job in `job/`, the hourly workflow publishing to the `data` branch; one real run before the release led to four fixes (bonds out, tax-heavy at 60%, fill chance out of 14, full tax exempt list). First published run checked the same day.

## Next: Dashboard (on `next`, release PR open)
PRs #13–#17: shared ranking and the real sample; picks rows; controls; item detail; freshness. The owner tests, then merges the release.

## Later
1. **Personal:** "I'm flipping this" with undo, My flips, watchlist, blocklist, window settings.
2. **After v1:** flip log with export; backtest to tune the scoring; phone notification for watched items.

## On hold
- Nothing.
