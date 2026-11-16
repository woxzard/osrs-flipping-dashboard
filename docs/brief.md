# OSRS overnight flipping dashboard – project brief

Written 2026-11-16 from a planning session with the owner. This is the input for the **setup batch** (knowledge repo → `playbooks/start-a-new-project.md`). It already answers most of the interview, so ask only the open questions in section 10. Once `docs/spec.md`, `docs/plan.md` and `docs/decisions.md` are written from it, **delete this file** (no hand-off files that duplicate the plan).

Facts marked **(verify)** were not checked against the live source: the planning session's network could not reach the OSRS Wiki.

## 1. What it is
A phone-first web page that updates itself every hour and shows the 6–10 best **overnight flips** in Old School RuneScape for the cash I have. I open it when a sell order finishes, see what to buy next, and decide in under a minute.

An overnight flip: I place a low buy offer before bed, it fills while I sleep, and I sell at a higher price the next day.

## 2. Project profile (for `CLAUDE.md`)
- **Kind:** scheduled data job + static web app.
- **User:** me only. No login. Members account, 8 Grand Exchange slots.
- **How I try it:** a preview link for `next` on my phone, at a fixed address.
- **Where it runs:** static hosting; the data job runs on GitHub Actions on a schedule.
- **Data:** no database. Market data is rebuilt every hour, so nothing there can be lost. My own settings (cash, hidden items, watchlist) stay in the phone's browser storage.
- **Context that shapes the design:** single user, phone-first, ₱0 a month, GMT+8 (Manila time), amounts in gp shown short (950k, 12.4m).
- **Repo:** public is fine (owner's answer). That makes free hosting, reading the data file from the page, and branch protection on `main` all possible.

## 3. Stack to recommend (owner chooses in the setup batch)
| | Recommended | Alternative |
|---|---|---|
| Code | TypeScript for both the data job and the page (Vite + React), so the scoring rules and their tests exist once | Python data job + plain HTML page: fewer tools, but the rules live in two languages |
| Hosting | Vercel: the owner already uses it (Plateful), preview link per branch, a fixed address for `next` | GitHub Pages: no extra account, but no preview links without extra plumbing |
| Hourly job | GitHub Actions schedule | Same |
| Cost | ₱0 | ₱0 |

**How the data reaches the page (recommended):** the hourly job writes one results file to a separate `data` branch (overwritten each run, so history doesn't pile up). The page reads that file directly. This way an hourly refresh never triggers a new deploy, and the `next` preview shows the same live data as the released page.

Template changes for this project: delete `db-migrate.yml` and the `local-db` and `migrate` make targets (no database); add the data job's folder and the hosting config to `.github/risk-paths.txt`.

## 4. Data source
- **OSRS Wiki real-time prices API** (`prices.runescape.wiki/api/v1/osrs`): free, no key. **(verify)** the endpoints: item list with buy limits (`/mapping`), latest prices (`/latest`), 24-hour averages and volumes for all items (`/24h`), and per-item history (`/timeseries`; hourly steps cover about 15 days).
- **The Wiki requires a descriptive User-Agent** that says what the tool is and how to reach its owner; default ones are blocked. See open question 4.
- **Be a polite client:** one history request per candidate item, so narrow the roughly 4,000 items to a few hundred candidates first (has a buy limit, trades every day, has both a buy and a sell price), and space the requests out.
- **Cloud sessions can't reach this site by default.** In the planning session the network refused `prices.runescape.wiki`. So: tests and end-to-end checks run on **saved sample responses committed to the repo** (also the `e2e-check` rule: nothing that needs the real internet). To capture the first samples, either the owner allows the host in the environment's network settings, or a manually started GitHub Action fetches them.

## 5. How a flip is scored
Uses the last 14 nights of hourly history, measured in **my hours**, not a general "night dip". My night in GMT+8 is afternoon and evening in Europe and morning in the US, which are busy game hours, so the job must measure what prices actually do in my window instead of assuming they fall.

1. **Windows:** buy window = while I sleep (default 22:00–07:00 Manila); sell window = the following day (07:00–22:00). Both are settings.
2. **Per past night:** the lowest hourly buy-side price in the buy window, and the highest hourly sell-side price in the sell window after it.
3. **Suggested buy price:** a price that was reached on about 70% of those nights. **Suggested sell price:** a price reached on about 70% of the following days. Work in "% below/above that day's average" and apply it to today's level, so a slowly rising or falling item still gets sensible prices.
4. **Tax:** 2% of the sell price, rounded down, capped at 5m per item; nothing under 50 gp; a short list of exempt items (e.g. bonds). **(verify)** on the Wiki's Grand Exchange page.
5. **Profit per item** = sell − tax − buy.
6. **Quantity** = the smallest of: the buy limit, what the cash for this slot can afford, and a modest share of what actually trades in my buy window (so the order can realistically fill). Assume one buy limit per night.
7. **Fill chance** = on how many of the 14 nights both the buy and the sell would have gone through. Shown as "11 of 14 nights".
8. **Rank** = profit per item × quantity × fill chance, with a penalty for a falling price.

Hourly averages hide the extremes, so these numbers lean cautious. The 70% levels, the volume share and the trend penalty are starting values: keep them in one settings file with tests, and tune them in the backtest batch.

## 6. What the page shows
**Controls (top of the screen, kept in the URL so refresh and back keep them):**
- **Cash to spend:** quick-pick chips 10m / 50m / 100m, plus a custom amount. Remembers the last choice.
- **Free slots:** a stepper 1–8, default 1. The cash is split evenly across them. One slot covers "a sell just finished"; eight covers the evening setup.
- **Volume:** High / Low tabs, plus "All". High = my order is a small part of what trades (fills reliably, thinner margin). Low = fatter margin, may not fill. The session proposes the exact cut-off from real data and shows it on the page.

**The list:** top 10 for the chosen cash and volume. If fewer than 6 qualify, show what there is and say why. Each row:
- Item icon and name, **buy at**, **sell at**
- Quantity to buy and cash it ties up
- Expected profit after tax, and return on that cash (%)
- Fill chance ("11 of 14 nights")
- Trend arrow with a word (rising / flat / falling), and any warning flags

**Item detail (tap a row):** 14-day price chart with the buy and sell lines drawn on it, buy limit, daily volume, tax per item, the last 14 nights as hit/miss, and a link to the item's Wiki page.

**Warning flags (icon + text, never colour alone):** price falling for several days; sudden spike (often a game update or manipulation); few trades in my hours; tax eats most of the margin; last trade is old; less than 14 days of history.

**Freshness:** "Updated 23 min ago" in Manila time at the top; a clear warning when the data is more than about 2 hours old.

**Personal (stored on the phone):**
- **"I'm flipping this"** tick: hides the item from the picks, with "Hidden · Undo". A "My flips" list shows what's ticked so I can untick when sold.
- **Watchlist** (pinned items) and **blocklist** (never show).
- **Settings:** buy and sell window hours.

## 7. Rules from the knowledge base that shape this project
- **Workflow:** setup batch is one PR into `main`; after that, batches of small PRs into `next` with a `risk:` label, merge-when-green, one release PR per batch that I test on my phone and merge with a merge commit. Batch plan first, all open questions at once, each with a recommendation.
- **Foundation before features:** `make setup / check / build`, the preview link, and a first `make e2e` before any feature work, so every later PR is checked automatically.
- **End-to-end checks:** the page in a simulated iPhone against saved sample data; the data job as a sample run compared with a saved expected result. Chromium is pre-installed in cloud sessions: pin the test tool to its version.
- **`ux-fundamentals` applies to every screen.** The points most likely to bite here:
  - URL holds cash, slots, volume tab and open item; refresh and back restore them.
  - Back from item detail returns to the same scroll position in the list (owner's rule 1).
  - Item detail opens from Picks, My flips and Watchlist: closing it returns to whichever one it came from (owner's rule 2).
  - Toasts go away on their own: about 2.5 s, about 5 s with Undo (owner's rule 4). Undo, not "Are you sure?".
  - Loading skeletons, and written empty / error / offline / stale-data states.
  - Numeric keyboard for the cash field, inputs at least 16 px, tap targets at least 44 px, whole row tappable, works at 320 px wide, dark mode, large text.
  - Owner's rule 3 (spot duplicates) doesn't apply: items are picked from the game's item list, never typed in as new.
- **Token use:** samples and test tools live in the repo; one short `docs/status.md`; screenshots only for visual changes.
- **Real-device check early** for anything that depends on iOS Safari behaviour (Plateful's offline lesson). This project has no offline mode in v1.
- **No new libraries or services without asking** (always `risk:high`). Changes to the hourly workflow and to deploy settings are `risk:high` too.

## 8. Batches
0. **Setup** (one PR into `main`): copy the template, fill in the profile, write `docs/spec.md` from this brief, record the stack choice, fill in Makefile / CI / Dependabot / risk paths, list my steps in `TODO-PC.md`.
1. **Foundation:** page skeleton, preview link for `next`, saved API samples, first end-to-end check on a simulated phone.
2. **Data job:** fetch, choose candidates, score, tax, write the results file; the hourly schedule; unit tests on the tax and scoring maths; a sample-run check.
3. **Dashboard:** controls, picks list, item detail, freshness, all the loading / empty / error states.
4. **Personal:** "I'm flipping this" with undo, My flips, watchlist, blocklist, window settings.
5. **Later:** flip log (what I really bought and sold, with an export before I rely on it); backtest ("if I had followed the top picks for 30 days") to tune the scoring; a phone notification when a watched item becomes a top pick.

## 9. Known risks
- **GitHub's schedule is approximate:** runs can start late, and schedules only run from `main`, so the hourly job can't be tried from `next` except by starting it by hand. GitHub also switches off schedules in repos with no activity for 60 days **(verify whether the job's own writes count as activity)**. The freshness warning is the safety net.
- **Recommendations are odds, not promises.** Past nights don't guarantee tonight; game updates move prices. The flags and the fill chance are there so I can judge.
- **Thin items:** on low-volume items, a few trades set the hourly price, so the suggested prices are rougher. Say so on the row.

## 10. Open questions for the owner (ask these in the setup batch plan)
1. **Hosting:** Vercel (recommended) or GitHub Pages?
2. **My hours:** are 22:00–07:00 for buying and 07:00–22:00 for selling right as defaults?
3. **Cash and slots:** is "cash to spend, split evenly across the free slots" how I want the 10m / 50m / 100m choice to work? (Recommended: yes.)
4. **How the Wiki can reach me:** the API asks for a contact in the User-Agent. Recommended: the public repo address, not an email.
5. **Reaching the price site from cloud sessions:** allow `prices.runescape.wiki` in the environment's network settings (recommended, makes capturing and refreshing samples easy), or keep it blocked and fetch samples through a GitHub Action?
