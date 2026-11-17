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
| Candidates are ranked by gp traded in the last 24 hours (not item count) before the 300 cap | Item count would fill the list with cheap stackables; gp traded finds the items worth flipping. |
| The run fails, publishing nothing, when: a list request fails; the lists cover under 2,000 items; the newest trade is over 2 hours old; under 100 candidates or under 50 scored items; more than 10% of history requests fail | "The Wiki failed or returned nonsense". A few failed history requests only drop those items. |
| The results file lists every scored candidate, best first for 50m in one slot; until the dashboard batch the page shows the first ten | The page has no cash or slot controls yet. Unprofitable candidates stay in the file, at the bottom, for the watchlist later. |
| Each item's history file keeps 16 days of hours as short rows | Covers the 14 measured nights plus today; about 12 KB per item. |

### 2026-11-17 – Data job: fixes after the first real run
| Decision | Why |
|---|---|
| Bonds are never picked (`notFlippableIds` in the settings file) | Owner's answer. The real run ranked the bond first, but a bond bought on the Grand Exchange is untradeable and costs 10% to make tradeable again. |
| Tax-heavy flag: tax is at least 60% of the margin before tax (was 50%), and only when there is a margin | Owner's answer. At 50% the real run flagged 229 of 290 items; at 60% it flags 166 and none of the top twenty. To tune further in the backtest batch. |
| Fill chance is counted out of 14 nights even when an item has less history | Owner's answer; matches the spec. 4 good nights of 5 no longer ranks like 80%. |
| Tax exempt list: the Wiki's full list (48 item ids), checked 2026-11-17 | Rate, rounding, 5m cap and 50 gp floor also confirmed on the Wiki's Grand Exchange page. |
| Hours of history in an unexpected shape are dropped; trade times that aren't numbers are ignored by the stuck-prices check | Code review: one broken value could otherwise publish an item with no price, or let old prices through as fresh. |
| Left for later (code review, not bugs today): the trend only sees finished nights, so a sudden crash takes up to two days to raise "falling"; no retry when a Wiki request fails (the next hour retries); the windows must fit in 24 hours from the buy start | To weigh in the backtest and Personal batches. |

### 2026-11-17 – Dashboard
| Decision | Why |
|---|---|
| Volume tabs: **High** when my order is at most 2% of what usually trades in my buy window (`highVolumeShare` in the settings file), **Low** above that; default tab **All** | Owner's answer, from the first real run: at 50m in one slot 78 High / 131 Low; the top ten High average 2.1% return and 8.7 of 14 fill nights, Low 2.7% and 8.3. The group depends on order size, so more cash can move an item to Low. Starting value, tuned in the backtest batch. |
| Fill nights read "8 of 14 nights · typical": 10+ strong, 8–9 typical, under 8 below typical (as shares of the measured nights); never red or amber | Owner's answer. Real picks land at 6–10 of 14 because the buy and the sell both have to fill. |
| A rising item's buy-under-market gap is shown in the item detail ("Last hour: … Your buy is 6% under"), not in the row | Owner's answer. 45% of top-ten rows are rising, so a row warning would be noise; the row would need the job to publish the live price (`risk:high`, backtest batch). |
| The chart is drawn as plain SVG, no chart library | Owner's answer. One line chart; a library would add about 100 KB. |
| Tax-heavy flag kept at 60%, worded "Tax takes over half the margin" | Owner's answer, with the wording corrected in code review: the flag compares tax with the margin before tax, so "over half the profit" was wrong. Shows on about 1 in 10 top-ten rows; tuning stays in the backtest batch. |
| Buy at and Sell at are exact gp (13,751,666); cash, profit, volume and limit stay short | Owner's answer. The prices are typed into the Grand Exchange. |
| First visit: 50m, 1 free slot; then the last choice on this phone; custom cash 100k to 2,147m | Owner's answer. 50m matches the job's default; 2,147m is the game's cash stack limit. |
| Item icons load from the OSRS Wiki's image files, in a fixed 36 px tile with a first-letter fallback; the footer credits the Wiki | Owner's answer. Small, cached by the phone, ~10 per screen; copying them into `data` would be a job change. |
| Page checks use a copy of the first real published run (`samples/published/`) | The hand-written sample has names only. |
| The page sizes picks with the settings the results file was scored with, over its own | Keeps `next` in step with the job on `main` when starting values differ. |
| Left for later (code review): the page's item check repeats the job's number check (`job/build.ts`); sharing it means touching `job/` (`risk:high`) | Fold in with the next job change. |

### 2026-11-17 – Hourly start
| Decision | Why |
|---|---|
| The hourly job is started by cron-job.org (free) calling GitHub's "run workflow" API at :07, with a fine-grained key limited to Actions on this repo; GitHub's own schedule is removed | Owner's answer. GitHub's schedule never fired a single run in 9+ hours, also after rewriting it (#20). Keeping both could run the job twice an hour. The key only lets the service start, re-run or cancel this repo's workflows. |

### 2026-11-17 – Personal
| Decision | Why |
|---|---|
| Trades are marked by hand with "I'm flipping this"; no automatic tracking from my RuneScape name | Owner's decision. Jagex doesn't publish a player's Grand Exchange trades, and the tools that record them need RuneLite plugins on a PC, while I mostly play on my phone. |
| Picks, My flips, Watchlist and Settings are tabs in a bottom bar; the tab is in the address (`?view=flips`), and each list keeps its own scroll position | Owner's answer. Picks stay one tap away, in thumb reach; back, refresh and a link bring the same tab back. |
| Ticked items stay hidden from the picks until I untick them (Sold); nothing comes back by itself | Owner's answer. An item still in a slot would otherwise come back as a fresh pick. My flips shows how long ago each was ticked. |
| No export or backup of my lists in this batch | Owner's answer. The lists are small and easy to rebuild; the flip log gets an export. Each address (`next` preview, the released page, a Home Screen copy) keeps its own lists. |
| Window hours can be changed on the phone; the page then re-scores from the items' hourly history | Owner's answer. Costs about 3.7 MB of downloads per hourly update while my hours differ from the job's; the job keeps scoring with the defaults. |
| Ticking a flip doesn't change "free slots" | Owner's answer. Changing it by itself would quietly resize every pick. |
| The watchlist search covers the ~290 items scored each hour, not the whole game | Owner's answer. Items outside them have no prices; a full list waits for the watched-item notification, which changes the job anyway. |
