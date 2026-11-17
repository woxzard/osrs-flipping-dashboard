# TODO – things I need to do myself

These involve accounts or settings, so Claude can't do them. All can be done in a phone browser.

## Workflow setup (once)
- [x] 1. Create the GitHub repo.
- [x] 2. **Make the repo public:** GitHub → the repo → Settings → General → scroll to "Danger Zone" → Change visibility → Public. Needed before the dashboard can read its data and for the free branch protection below. Nothing in the repo is secret.
- [x] 3. Merge the setup PR into `main`. GitHub then creates the `next` branch by itself (Actions → "Next branch").
- [x] 4. **Vercel** (done; confirm the `next` address in `docs/status.md` opens): vercel.com → Add New → Project → import `osrs-flipping-dashboard` → Deploy. Keep every default; the repo's `vercel.json` sets the rest. The first build of `main` fails until the foundation release is merged: that's expected. Then open the project → Deployments, find the one for branch `next`, and send Claude its address that contains `-git-next-`: that address never changes.
- [ ] 5. Optional: protect `main` (Settings → Rules → Rulesets → New branch ruleset: target `main`, require a pull request and the `checks` status check, block force pushes). Works once the repo is public.
- [ ] 6. Optional tidy-up: delete the branch `claude/tender-tesla-bolrrb` (it only held the project brief, now replaced by `docs/spec.md`, `docs/plan.md` and `docs/decisions.md`).

Nothing to switch on for merging: PRs into `next` are merged by the "Merge when green" workflow. `hold` stops a PR; `owner-ok` approves a high-risk one.

## Data job release
- [x] 7. After merging the data job release PR: GitHub app or browser → the repo → Actions → "Hourly data" → Run workflow (branch `main`). A minute or two later the page should list real item names. After that it runs by itself every hour.
- [x] 8. Optional, for the tax check: add `oldschool.runescape.wiki` to the `osrs-flipping-dashboard` cloud environment's allowed sites. (Done; the tax rules were checked on 2026-11-17.)

## Hourly start (outside timer) – all on the phone, about 5 minutes
GitHub's own hourly schedule never ran, so a free timer service starts the job instead.
- [ ] 9. **Make a key that can only start this repo's workflows:** github.com → your picture → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
  - Name: `osrs hourly trigger`. Expiration: the longest offered (write the date here: ________).
  - Repository access: **Only select repositories** → `osrs-flipping-dashboard`.
  - Permissions → Repository permissions → **Actions: Read and write** (nothing else).
  - Generate, and copy the key (it's shown once).
- [ ] 10. **Set up the timer:** cron-job.org → sign up (free) → Create cronjob.
  - Title: `OSRS hourly data`.
  - URL: `https://api.github.com/repos/woxzard/osrs-flipping-dashboard/actions/workflows/hourly-data.yml/dispatches`
  - Schedule: every hour, at minute **7**.
  - Advanced → Request method: **POST**. Headers:
    - `Accept`: `application/vnd.github+json`
    - `Authorization`: `Bearer ` followed by the key from step 9
    - `X-GitHub-Api-Version`: `2022-11-28`
    - `Content-Type`: `application/json`
  - Request body: `{"ref":"main"}`
  - Turn on the email for failed runs. Save.
- [ ] 11. **Test it:** on the job, tap "Test run": it should answer **204**. Then GitHub → Actions → Hourly data should show a new run within a minute. Tell Claude.
- [ ] Before the key expires: make a new one (step 9) and paste it into the cronjob's `Authorization` header.

## Good to know
- New Claude sessions for this repo: pick the **osrs-flipping-dashboard** environment (already created). It lets Claude reach the OSRS price site.
- If cron-job.org emails that the hourly job failed (often an expired key), see step 9–11, and tell Claude.
