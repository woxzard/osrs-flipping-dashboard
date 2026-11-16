---
name: e2e-check
description: How to check this project end to end the way the owner uses it - running and writing the end-to-end checks (make e2e), the saved price-API samples, screenshots for visual changes, and environment quirks of cloud sessions. Use before running or writing end-to-end checks, taking screenshots, or capturing or refreshing samples.
---

# End-to-end checks

<!-- Grow this with one line per surprise. Keep how-tos here, not in CLAUDE.md, so they load only when needed. -->

## Start
1. `make setup`.
2. `make build`, then `make e2e`.
3. By hand: `make dev` (port 5173, live reload) or `npx vite preview --port 4173` (the built page, what the checks use). Without a results file to read, the page shows "No picks yet".

## What "end to end" means here
- **The page:** Playwright with an iPhone profile (`playwright.config.ts`, checks in `e2e/`) tapping through the main path, against saved sample data (never the live `data` branch). `e2e/fixtures.ts` fixes the clock, answers the page's request for the results file with `samples/picks.sample.json` (`servePicks`), and blocks every other outside request. Chromium is pre-installed in cloud sessions: Playwright is pinned to its version (1.63.0); don't download browsers there. CI installs its own (`ci.yml`).
- **The data job** (from the data job batch): a sample run on the saved API responses in `samples/`; the result is compared with a saved expected output.

## Samples
- `samples/` holds real responses from the price API (`docs/spec.md` §4): the item list, latest and 24-hour data trimmed to about 300 items, and hourly history for 8 items chosen for their awkward cases (listed in `samples/README.json`). `picks.sample.json` is a hand-written results file for the page. Tests and checks read these; nothing calls the live site.
- These files are big: never read them whole. Look at one item with a short script.
- Refreshing them needs `prices.runescape.wiki`, which only the `osrs-flipping-dashboard` cloud environment allows. Always send the project's User-Agent and space the requests out.
- Refresh with `make samples` (`job/capture-samples.ts`). Expect checks that depend on exact prices to need new expected results afterwards.

## Writing checks
- Use the page as the owner would; find things by visible labels, not internals. Wait for a specific result, not a fixed delay.
- Fix the clock in checks: "Updated 23 min ago", the stale-data warning and the Manila-time windows all depend on the time.
- Each run starts from clean browser storage, so runs can repeat.
- Traces are off by default here (`playwright.config.ts`); turn traces on only to debug one failing check.

## Screenshots
- Screenshots cost a lot of tokens: only for visual changes, viewport-sized, only changed screens (light, dark and a narrow phone width).
- A simulation isn't the real device: say what was checked here and what only the owner can confirm.

## Lessons
- Hours with no trades on one side come back with `null` for that side's price: the 3rd age amulet sample (10344) has many.
- Node's `fetch` ignores the cloud session's proxy unless `NODE_USE_ENV_PROXY=1` is set (`make samples` sets it); without it the price site looks unreachable (`ENOTFOUND`).
- Playwright's iPhone profiles default to WebKit, which cloud sessions don't have: the config forces Chromium. Real Safari behaviour is the owner's to confirm on the phone.
