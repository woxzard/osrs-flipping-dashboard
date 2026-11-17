# OSRS overnight flipping dashboard – spec

Source of truth for what the app does. Keep it in step as batches change behaviour.

## 1. Overview
A phone-first web page that updates itself every hour and shows the 6–10 best **overnight flips** in Old School RuneScape for the cash I have. I open it when a sell order finishes, see what to buy next, and decide in under a minute.

An overnight flip: I place a low buy offer before bed, it fills while I sleep, and I sell at a higher price the next day.

Recommendations are odds, not promises: past nights don't guarantee tonight, and game updates move prices. The fill chance and the warning flags are there so I can judge.

## 2. Users and constraints
- Me only. No login. Members account, 8 Grand Exchange slots.
- Phone-first; must work at 320 px wide, in dark mode and with large text.
- ₱0 a month.
- Manila time (GMT+8) everywhere. Amounts in gp, shown short (950k, 12.4m); buy and sell prices exact (13,751,666), since they are typed into the Grand Exchange.
- No offline mode in v1.
- The repo is public (needed for the free setup below).

## 3. Tech approach
- **Code:** TypeScript, one npm package, Node 22.
  - `src/` – the page (Vite + React), static.
  - `job/` – the hourly data job.
  - `shared/` – scoring, tax, formatting and the settings file, used by both, with unit tests. The rules exist once.
  - `samples/` – saved API responses for tests and end-to-end checks.
- **Hosting:** Vercel. `main` is the released page; `next` has a preview at a fixed address.
- **Hourly job:** a GitHub Actions workflow on `main`, started every hour by a free outside timer (cron-job.org) through GitHub's "run workflow" API, with a key that can only start this repo's workflows; it can also be started by hand. GitHub's own schedule never fired here (decisions, 2026-11-17). It writes the results to a separate **`data` branch**, overwriting the previous run so history doesn't pile up. The page reads those files directly from GitHub, so a refresh never triggers a deploy and the `next` preview shows the same live data as the released page. Vercel doesn't deploy the `data` branch.
- **Nothing to protect:** no login, no secrets, no personal data on a server. My settings stay in the phone's browser storage.
- **Tests:** Vitest for unit tests (tax and scoring maths especially); Playwright on a simulated iPhone against saved samples; the data job as a sample run compared with a saved expected result. Nothing in tests calls the live price site.

## 4. Data source
OSRS Wiki real-time prices API, `https://prices.runescape.wiki/api/v1/osrs`. Free, no key. Checked live on 2026-11-16:

| Endpoint | What it gives | Seen |
|---|---|---|
| `/mapping` | Item list: id, name, icon, members, buy limit (`limit`) | 4,681 items, 4,163 with a buy limit |
| `/latest` | Latest instant-buy (`high`) and instant-sell (`low`) price per item, with times | 4,558 items |
| `/24h` | 24-hour average prices and volumes for all items | 4,240 items |
| `/timeseries?timestep=1h&id=…` | Hourly history for one item: average high/low price and volume per hour | 365 points ≈ 15 days |

- **User-Agent** (required by the Wiki; default ones are blocked): `osrs-flipping-dashboard (hourly overnight-flip picks; https://github.com/woxzard/osrs-flipping-dashboard)`. The contact is the public repo, not an email.
- **Polite client:** `/mapping`, `/latest` and `/24h` are one request each. History is one request per item, so first narrow the ~4,000 items to a few hundred candidates (has a buy limit, trades every day, has both a buy and a sell price, and can be flipped at all: bonds can't, because one bought on the Grand Exchange becomes untradeable), then space the history requests out.
- Hours with no trades on one side have no price for that side; the scoring must cope with gaps.

## 5. How a flip is scored
Uses the last 14 nights of hourly history, measured in **my hours**. My night in Manila is afternoon and evening in Europe and morning in the US, which are busy game hours, so the job measures what prices actually do in my window instead of assuming a night dip.

1. **Windows:** buy window = while I sleep, default **22:00–07:00** Manila; sell window = the following day, default **07:00–22:00**.
2. **Per past night:** the lowest hourly buy-side price in the buy window, and the highest hourly sell-side price in the sell window after it.
3. **Suggested buy price:** a price reached on about 70% of those nights. **Suggested sell price:** a price reached on about 70% of the following days. Worked out as "% below/above that day's average" and applied to today's level, so a slowly rising or falling item still gets sensible prices.
4. **Tax:** 2% of the sell price, rounded down, capped at 5m per item; nothing under 50 gp; the Wiki's list of exempt items (bonds, energy potions, and low-level ammunition, food, teleports and tools: 48 item ids in `shared/settings.ts`). *Checked against the Wiki's Grand Exchange page on 2026-11-17.*
5. **Profit per item** = sell − tax − buy.
6. **Quantity** = the smallest of: the buy limit; what the cash for this slot can afford; a modest share of what actually trades in my buy window (starting value 10%), so the order can realistically fill. One buy limit per night.
7. **Fill chance** = on how many of the 14 nights both the buy and the sell would have gone through. Shown as "11 of 14 nights". An item with less than 14 nights of history is still counted out of 14, so a new item can't outrank a proven one.
8. **Rank** = profit per item × quantity × fill chance, with a penalty for a falling price.

**Cash and slots:** "cash to spend" is split evenly across the free slots. 50m with 2 free slots sizes each pick for 25m.

Hourly averages hide the extremes, so these numbers lean cautious. The 70% levels, the volume share and the trend penalty are starting values: they live in one settings file (`shared/`) with tests, and get tuned in the backtest batch.

Because quantity depends on the cash and slots I choose on the phone, the job publishes the per-item numbers (prices, tax, limit, window volume, fill nights, trend, flags) and the page does the last step (quantity, cash tied up, profit, rank) with the same shared code.

## 6. Data model
No database. Two kinds of data:

**Published by the job (on the `data` branch, rebuilt every hour):**
- `picks.json` – when it was generated, the settings used (windows, levels), and one entry per candidate item, best first for 50m in one slot: id, name, icon, buy limit, suggested buy and sell price, tax per item, volume in my buy window, daily volume, the last 14 nights as hit/miss, trend, flags.
- One small file per candidate (`history/<id>.json`) with its hourly history for the measured nights, loaded only when I open that item (keeps the first load small).

**On my phone (browser storage):**
- Last cash choice and free slots.
- "I'm flipping this" items, watchlist, blocklist.
- Settings: buy and sell window hours (see assumption 3).

Nothing here is irreplaceable until the flip log (later); that gets an export before I rely on it.

## 7. Modules and acceptance criteria

### 7.1 Data job
- As the owner, I want the picks rebuilt every hour without me doing anything.
- Acceptance:
  - Fetches the item list, latest prices and 24-hour data; narrows to candidates; fetches hourly history only for those, spaced out, with the User-Agent above.
  - Scores each candidate as in section 5 and writes the results to the `data` branch, replacing the previous run.
  - If the API fails or returns nonsense, the previous results stay in place and the run is marked failed (the page's freshness warning covers the rest).
  - Unit tests cover the tax rules (rounding, cap, under 50 gp, exempt items) and the scoring maths, including gaps in the history and items with under 14 days of data.
  - A sample run on saved responses matches a saved expected result.

### 7.2 Controls
At the top of the screen, kept in the URL so refresh and back keep them.
- **Cash to spend:** chips 10m / 50m / 100m, plus a custom amount (numeric keyboard; 100k to 2,147m, typed as 25m, 750k or 1.5b). First visit 50m; after that remembers the last choice.
- **Free slots:** a stepper 1–8, default 1.
- **Volume:** High / Low tabs, plus All (the default). High = my order is at most 2% of what usually trades in my buy window (fills reliably, thinner margin). Low = more than that (fatter margin, may not fill). The cut-off is a starting value in the settings file and is shown on the page.
- Acceptance: changing any control updates the list at once; refresh, back and a pasted link restore cash, slots and tab.

### 7.3 Picks list
- Top 10 for the chosen cash, slots and volume. If fewer than 6 qualify, show what there is and say why.
- Each row: item icon and name; **buy at**, **sell at** (exact gp, as typed into the Grand Exchange); quantity and the cash it ties up; expected profit after tax and return on that cash (%); fill chance ("8 of 14 nights · typical": 10+ strong, 8–9 typical, under 8 below typical); trend arrow with a word (rising / flat / falling); warning flags. Thin (low-volume) items say their prices are rougher.
- Acceptance: the whole row is tappable (at least 44 px); loading shows skeletons; empty, error and stale-data states are written out; works at 320 px, in dark mode and with large text.

### 7.4 Item detail
- Opens from a row in Picks, My flips or the Watchlist; the open item is in the URL.
- Shows: 14-day price chart with the buy and sell lines drawn on it, buy limit, daily volume, tax per item, the last 14 nights as hit/miss, and a link to the item's Wiki page.
- Acceptance: back returns to the same scroll position in the list it came from (Picks, My flips or Watchlist), not to a default screen.

### 7.5 Warning flags
Icon + text, never colour alone:
- price falling for several days;
- sudden spike (often a game update or manipulation);
- few trades in my hours;
- tax eats most of the margin (shown as "Tax takes over half the margin"; flagged at 60%);
- last trade is old;
- less than 14 days of history.

### 7.6 Freshness
- "Updated 23 min ago" in Manila time at the top.
- A clear warning when the data is more than about 2 hours old (the outside timer or GitHub can fail or stall).

### 7.7 Personal (stored on the phone)
- **Reached by a bottom bar:** Picks · My flips · Watchlist · Settings. The tab is in the address (`?view=flips`); each list keeps its own scroll position.
- **"I'm flipping this"** tick: hides the item from the picks, with a "Hidden · Undo" toast. A **My flips** list shows what's ticked so I can untick when sold.
- **Watchlist** (pinned items) and **blocklist** (never show).
- **Settings:** buy and sell window hours.
- Acceptance: toasts go away on their own (about 2.5 s; about 5 s with Undo); Undo instead of "Are you sure?"; everything survives closing the browser.

### 7.8 Rules for every screen
The `ux-fundamentals` skill applies. Its owner's rule 3 (spot duplicates) doesn't apply here: items are picked from the game's item list, never typed in as new.

## 8. Build order
Each batch is usable or checkable on its own. Details in `docs/plan.md`.
1. **Foundation:** page skeleton, preview link for `next`, saved API samples, first end-to-end check on a simulated phone.
2. **Data job:** fetch, choose candidates, score, tax, publish; the hourly schedule; unit tests; sample-run check.
3. **Dashboard:** controls, picks list, item detail, freshness, all loading / empty / error states.
4. **Personal:** "I'm flipping this" with undo, My flips, watchlist, blocklist, window settings.

## 9. Later
- **Flip log:** what I really bought and sold, with an export before I rely on it.
- **Backtest:** "if I had followed the top picks for 30 days", to tune the scoring.
- **Notification** on my phone when a watched item becomes a top pick.

## 10. Assumptions and known risks
1. **Tax rules** (section 5, step 4): rate, rounding, cap, the 50 gp floor and the exempt list match the Wiki's Grand Exchange page as of 2026-11-17. Jagex changes the list now and then (last on 29 May 2025); a missing item only makes its profit look smaller.
2. **The hourly start depends on an outside timer:** GitHub's own schedule never fired in this repo (2026-11-17), so cron-job.org starts the job. Its key expires (renew it before the date in `TODO-PC.md`), and the service can fail; cron-job.org emails on failures, and the freshness warning is the safety net. Runs always use `main`, so the job can't be tried from `next` except by starting it by hand.
3. **Window hours as a phone setting:** the job scores with the default windows. Letting the phone use different hours means the page must redo the scoring from the hourly history. To decide in the data job batch plan (recommendation in `docs/status.md`).
4. **Thin items:** a few trades set the hourly price, so suggested prices are rougher. The row says so.
5. **History length:** the API gives about 15 days of hourly data, just enough for 14 nights. Items with less get a flag.
6. **Reading the results from GitHub** needs the repo to be public, and GitHub may serve a copy up to about 5 minutes old. Fine next to an hourly refresh.
