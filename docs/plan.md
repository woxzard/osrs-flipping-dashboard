# Implementation plan

What's next, in order, as batches (`docs/workflow.md`). Finished work is one line each; full old plans move to `docs/archive/`.

## Done
- **Setup** (2026-11-16, one PR into `main`): template copied in, project profile, spec, stack choice, Makefile / CI / Dependabot / risk paths, owner's steps in `TODO-PC.md`.

## Next: Foundation
Goal: make the project runnable and checkable before any features, so every later PR is checked automatically. The detailed batch plan (PRs, acceptance criteria, risk levels, open questions) comes first, for the owner's OK.

Expected contents:
- Page skeleton (Vite + React + TypeScript) that `make setup / check / build / dev` work on, with lint, format and a first unit test. New libraries, so `risk:high`.
- Vercel: preview link for `next` at a fixed address; `data` branch not deployed. `risk:high` (deploy settings). Needs `TODO-PC.md` step 2.
- Saved API samples in `samples/` (mapping, latest, 24h, a handful of item histories), captured with the project's User-Agent.
- First `make e2e`: the skeleton page on a simulated iPhone against the saved samples; Playwright pinned to 1.63.0.
- Fill in the `e2e-check` skill.

## Later
1. **Data job:** fetch, choose candidates, score, tax, write the results to the `data` branch; the hourly schedule; unit tests on the tax and scoring maths; a sample-run check. Check the tax rules against the Wiki. Decide how window settings work (spec assumption 3).
2. **Dashboard:** controls, picks list, item detail, freshness, all the loading / empty / error states. Propose the High/Low volume cut-off from real data.
3. **Personal:** "I'm flipping this" with undo, My flips, watchlist, blocklist, window settings.
4. **After v1:** flip log with export; backtest to tune the scoring; phone notification for watched items.

## On hold
- Nothing.
