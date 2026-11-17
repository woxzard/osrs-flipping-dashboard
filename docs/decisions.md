# Decisions

- **Standing decisions** are the short version of what still applies. Read these first; keep them short.
- **Log** holds new decisions, newest at the bottom: one short table per batch, not per PR. When the log gets long, move it to `docs/archive/` and fold what still matters into the standing decisions.

## Standing decisions

| Decision | Why |
|---|---|
| Work in batches into `next`; safe PRs merge themselves; the owner tests and ships (`docs/workflow.md`) | The owner decides and tests instead of reviewing and merging every PR. |
| TypeScript for both the data job and the page (Vite + React), one npm package | The scoring and tax rules and their tests exist once, and the page can reuse them to size picks for my cash. Alternative was a Python job + plain HTML page: fewer tools, but the rules would live in two languages. |
| Vercel hosts the page | Already used for Plateful; a preview link per branch and a fixed address for `next`; ₱0. Alternative was GitHub Pages: no extra account, but no preview links without extra plumbing. |
| The hourly job runs on GitHub Actions and overwrites its results on a separate `data` branch; the page reads them from GitHub | ₱0; an hourly refresh never triggers a deploy; the `next` preview shows the same live data as the released page; history doesn't pile up. |
| No database; my settings stay in the phone's browser storage | Market data is rebuilt every hour; one user, one phone. |
| The repo is public | Makes free hosting, reading the results file from the page, and protecting `main` possible. Nothing in it is secret. |
| Tests and end-to-end checks use saved samples in `samples/`, never the live price site | Repeatable, polite to the Wiki, and works where the site is blocked. |
| The User-Agent names the tool and the public repo, not an email | The Wiki requires a contact; the repo's issues are enough and no email is exposed. |
| Playwright stays pinned to the cloud sessions' version (1.63.0) | Cloud sessions can't download another browser. |

## Log

### 2026-11-16 – Setup
| Decision | Why |
|---|---|
| Default windows: buy 22:00–07:00, sell 07:00–22:00 Manila | Owner's sleep hours. |
| "Cash to spend" is split evenly across the free slots | One slot covers "a sell just finished"; eight covers the evening setup. |
| Cloud sessions reach `prices.runescape.wiki` through a personal environment named `osrs-flipping-dashboard` | Makes capturing and refreshing samples easy without widening the Default environment used by other projects. |
| The job publishes per-item numbers; the page works out quantity, profit and rank | Those depend on the cash and slots chosen on the phone. |
| Each item's 14-day history is a separate small file, loaded when the item is opened | Keeps the first load small on a phone. |
| No database workflow or `local-db` / `migrate` targets | No database. |

### 2026-11-16 – Foundation
| Decision | Why |
|---|---|
| Libraries: Vite 8, React 19, TypeScript, Vitest 5, ESLint 10 with typescript-eslint and the React hooks rules, Prettier, Playwright 1.63.0 | Approved by the owner in the batch plan. |
| TypeScript 6.0, not 7 | The lint tool (typescript-eslint) doesn't support 7 yet. Moving up is a planned change, like any major update. |
| gp amounts are cut off, not rounded (999,999 shows as "999k") | Cash or profit never reads as more than it is. |
| Prettier leaves the Markdown docs and the files copied from the knowledge repo alone | Those stay identical to their master copies. |
| The page treats a missing results file as "No picks yet", and any other failure as an error with "Try again" | Before the job's first run (or while the repo is private) there is simply nothing published. |
| Sample files keep the API's exact shape, trimmed to about 300 items picked by a fixed rule | Small enough for the repo, and a refresh picks the same items. |
| The job runs its TypeScript directly with Node 22 | No extra library needed to run it. |
| Requests to the Wiki go one at a time, 250 ms apart | Polite client; a few hundred history requests still finish in a couple of minutes. |
| Vercel builds every branch except `data` and Dependabot's | `data` only holds results, and library-update PRs are covered by the checks. Claude's PR branches still get a preview. |

### 2026-11-17 – Data job
| Decision | Why |
|---|---|
| Window hours stay in the settings file in v1; revisit in the Personal batch | Owner's answer. Changing them on the phone means the phone must redo the scoring from raw history. |
| At most 300 items get a history request each hour | Owner's answer. About 300 spaced-out requests, a little over a minute. |
| Tax as in the spec (2% rounded down, 5m cap, nothing under 50 gp); only bonds are exempt for now | A web search agrees with the spec's numbers, but the Wiki's own page and its full exempt list couldn't be opened from the session. Taxing an exempt item only makes its profit look smaller. |
| My buy offer is measured against the hourly "sold at once" price, my sell offer against the "bought at once" price | Those are the trades that would fill each offer. |
| A night's "average" is the volume-weighted price over the whole night and following day; today's level is the last 24 hours | The 70% levels are "% below/above that average", applied to today's level. |
| A night with no trades on a side counts as a miss; fewer than 5 measured nights, or prices too rare for a 70% level, means no score | Thin items aren't given prices the history can't support. |
| Trend: straight-line slope of the daily level over 7 days; under 0.5% a day is flat. Falling halves the rank and raises the flag | Starting values, tuned in the backtest batch. |
| Flag starting values: spike = today 25% above the usual level; thin = under 30 items a night in my buy window; tax-heavy = tax is at least half the margin; stale = a side hasn't traded for 6 hours | Starting values, all in `shared/settings.ts`. |
