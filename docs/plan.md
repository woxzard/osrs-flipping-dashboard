# Implementation plan

What's next, in order, as batches (`docs/workflow.md`). Finished work is one line each; full old plans move to `docs/archive/`.

## Done
- **Personal** (2026-11-17, PRs #25–#29, release pending): tab bar; "I'm flipping this" + My flips; watchlist with search; blocklist; night hours on the phone (re-scored from the published history).
- **Dashboard** (2026-11-17, PRs #13–#18, release #19): shared ranking and a real sample; picks rows with icons; controls in the address; item detail with chart and back to the same spot; stale warning. Hourly start fix: #20, then an outside timer.
- **Setup** (2026-11-16, one PR into `main`): template copied in, project profile, spec, stack choice, Makefile / CI / Dependabot / risk paths, owner's steps in `TODO-PC.md`.
- **Foundation** (2026-11-16, PRs #2–#4, release #5): page skeleton and tools; saved API samples and the first end-to-end check on a simulated iPhone; Vercel settings.
- **Data job** (2026-11-17, PRs #7–#9 and #11, release #10): scoring rules in `shared/`, the job in `job/`, the hourly workflow publishing to the `data` branch; one real run before the release led to four fixes (bonds out, tax-heavy at 60%, fill chance out of 14, full tax exempt list). First published run checked the same day.

## Next: release the Personal batch
The owner tests `next` and merges the release PR. Then "Later" item 1.

## Later
1. **After v1:** flip log with export (also an export/backup of the Personal lists); backtest to tune the scoring; phone notification for watched items (with a full item list for the watchlist search, which changes the job).

## On hold
- Nothing.
