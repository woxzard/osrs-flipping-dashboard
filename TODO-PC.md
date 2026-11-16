# TODO – things I need to do myself

These involve accounts or settings, so Claude can't do them. All can be done in a phone browser.

## Workflow setup (once)
- [x] 1. Create the GitHub repo.
- [ ] 2. **Make the repo public:** GitHub → the repo → Settings → General → scroll to "Danger Zone" → Change visibility → Public. Needed before the dashboard can read its data and for the free branch protection below. Nothing in the repo is secret.
- [x] 3. Merge the setup PR into `main`. GitHub then creates the `next` branch by itself (Actions → "Next branch").
- [ ] 4. **Vercel** (ready now): vercel.com → Add New → Project → import `osrs-flipping-dashboard` → Deploy. Keep every default; the repo's `vercel.json` sets the rest. The first build of `main` fails until the foundation release is merged: that's expected. Then open the project → Deployments, find the one for branch `next`, and send Claude its address that contains `-git-next-`: that address never changes.
- [ ] 5. Optional: protect `main` (Settings → Rules → Rulesets → New branch ruleset: target `main`, require a pull request and the `checks` status check, block force pushes). Works once the repo is public.
- [ ] 6. Optional tidy-up: delete the branch `claude/tender-tesla-bolrrb` (it only held the project brief, now replaced by `docs/spec.md`, `docs/plan.md` and `docs/decisions.md`).

Nothing to switch on for merging: PRs into `next` are merged by the "Merge when green" workflow. `hold` stops a PR; `owner-ok` approves a high-risk one.

## Good to know
- New Claude sessions for this repo: pick the **osrs-flipping-dashboard** environment (already created). It lets Claude reach the OSRS price site.
- If GitHub ever emails that scheduled workflows will be disabled for inactivity, tap the link to keep them on, and tell Claude.
