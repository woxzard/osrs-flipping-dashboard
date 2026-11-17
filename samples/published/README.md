# A real published run

Copied unchanged from the `data` branch: the results file of the first real
hourly run (2026-11-17 04:37 UTC, 290 items) and the history files of three
items the page checks are built around:

- 27226 Masori mask: expensive, rising (its buy price sits under the last hour's price)
- 10476 Purple sweets: cheap stackable, the top pick for 50m in one slot
- 19707 Amulet of eternal glory: thin (flag "few trades in my hours")

The page's checks and unit tests read these instead of the live `data` branch.
To refresh: copy `picks.json` and the same three `history/<id>.json` files from
the `data` branch, then update the checks whose numbers changed.
