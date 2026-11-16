# Implementation plan

What's next, in order, as batches (`docs/workflow.md`). Finished work is one line each; full old plans move to `docs/archive/`.

## Done
- **Setup** (2026-11-16, one PR into `main`): template copied in, project profile, spec, stack choice, Makefile / CI / Dependabot / risk paths, owner's steps in `TODO-PC.md`.

## Next: Foundation
Goal: make the project runnable and checkable before any features, so every later PR is checked automatically and `next` opens on the owner's phone. Plan approved 2026-11-16; the owner pre-approved `owner-ok` for these three PRs.

1. **Page skeleton and tools** (`risk:high`: new libraries). A bare page (title, "No picks yet", phone layout, dark mode); `make setup / check / build / dev` work, with lint, format check and a first unit test. Done when the **checks** run is green.
2. **Saved samples and the first end-to-end check** (`risk:high`: Makefile, the Wiki client). Real API responses in `samples/` (item list, latest and 24-hour data trimmed to about 300 items; hourly history for about 8 items, including a thin one and a bond); a command to refresh them politely; `make e2e`: the page on a simulated iPhone loads a small sample results file and shows the update time and item names; `e2e-check` skill filled in. Done when `make e2e` passes here and on GitHub.
3. **Vercel preview** (`risk:high`: deploy settings). Vercel builds `main` and `next`, never `data`; the fixed `next` address goes in `docs/status.md`. Needs `TODO-PC.md` step 4. Done when the owner sees the skeleton at the `next` address on their phone.

Then the release PR `next` → `main`.

## Later
1. **Data job:** fetch, choose candidates, score, tax, write the results to the `data` branch; the hourly schedule; unit tests on the tax and scoring maths; a sample-run check. Check the tax rules against the Wiki. Decide how window settings work (spec assumption 3).
2. **Dashboard:** controls, picks list, item detail, freshness, all the loading / empty / error states. Propose the High/Low volume cut-off from real data.
3. **Personal:** "I'm flipping this" with undo, My flips, watchlist, blocklist, window settings.
4. **After v1:** flip log with export; backtest to tune the scoring; phone notification for watched items.

## On hold
- Nothing.
