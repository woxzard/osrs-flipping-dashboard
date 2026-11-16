---
name: e2e-check
description: How to check this project end to end the way the owner uses it - running and writing the end-to-end checks (make e2e), the saved price-API samples, screenshots for visual changes, and environment quirks of cloud sessions. Use before running or writing end-to-end checks, taking screenshots, or capturing or refreshing samples.
---

# End-to-end checks

<!-- Finish filling this in during the foundation batch ({{…}} parts), then grow it with one line per surprise. Keep how-tos here, not in CLAUDE.md, so they load only when needed. -->

## Start
1. `make setup`.
2. `make build`, then `make e2e`.
3. {{How to start the page by hand for poking around, and on which port.}}

## What "end to end" means here
- **The page:** Playwright with an iPhone profile tapping through the main path, against saved sample data (never the live `data` branch). Chromium is pre-installed in cloud sessions: Playwright is pinned to its version (1.63.0); don't download browsers there. CI installs its own (`ci.yml`).
- **The data job:** a sample run on the saved API responses in `samples/`; the result is compared with a saved expected output.

## Samples
- `samples/` holds real responses from the price API (`docs/spec.md` §4). Tests and checks read these; nothing calls the live site.
- Refreshing them needs `prices.runescape.wiki`, which only the `osrs-flipping-dashboard` cloud environment allows. Always send the project's User-Agent and space the requests out.
- {{The command that captures or refreshes the samples.}}

## Writing checks
- Use the page as the owner would; find things by visible labels, not internals. Wait for a specific result, not a fixed delay.
- Fix the clock in checks: "Updated 23 min ago", the stale-data warning and the Manila-time windows all depend on the time.
- Each run starts from clean browser storage, so runs can repeat.

## Screenshots
- Screenshots cost a lot of tokens: only for visual changes, viewport-sized, only changed screens (light, dark and a narrow phone width).
- A simulation isn't the real device: say what was checked here and what only the owner can confirm.

## Lessons
- Hours with no trades on one side come back without a price for that side: samples should include a thin item.
