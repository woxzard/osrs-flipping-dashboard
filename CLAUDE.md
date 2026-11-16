# CLAUDE.md – OSRS overnight flipping dashboard

## About me and how I work
- I'm a product owner, not a full-time developer. Explain technical decisions in plain language, briefly.
- I work mostly from my phone through cloud sessions. I make the decisions and try things through previews; I don't review code line by line.
- I'm on a PC only part of the time. If something can only be done locally (secrets, local debugging, terminal-only commands, app-store or device steps), tell me clearly and note it in `TODO-PC.md`.
- I switch between phone and laptop, so the repo is the hand-off: push your work and keep `docs/status.md` current before stopping. If you're running in a local session on my laptop, check `TODO-PC.md` first and offer to do those steps with me. Never work on a branch another session is using.
- Defaults unless the project says otherwise: I'm in Manila, Philippines (Manila time, ₱ PHP, metric units).

## Project profile
- **What it is:** a phone-first web page that updates itself every hour and shows the 6–10 best overnight flips in Old School RuneScape for the cash I have. I open it when a sell order finishes, see what to buy next, and decide in under a minute.
- **Kind:** scheduled data job + static web app.
- **User:** me only. No login. Members account, 8 Grand Exchange slots.
- **How I try it:** a preview link for `next` on my phone, at a fixed address (Vercel; the address goes in `docs/status.md` once the foundation batch has it).
- **Where it runs:** the page on Vercel (static); the data job on GitHub Actions, every hour, from `main`.
- **Data:** no database. Market data is rebuilt every hour, so nothing there can be lost. My settings (cash, hidden items, watchlist) stay in the phone's browser storage.
- **Context that shapes the design:** single user, phone-first, ₱0 a month, Manila time (GMT+8), amounts in gp shown short (950k, 12.4m). The repo is public.

Full details and build order live in `docs/spec.md`. If the spec and this file disagree, ask me.

## Tech stack
- **TypeScript** everywhere, one npm package, Node 22. Page: Vite + React in `src/`. Data job: `job/`. Scoring, tax and settings used by both: `shared/` (rules and their tests exist once).
- **Hosting:** Vercel, static. **Hourly job:** GitHub Actions schedule; it overwrites one results file on the `data` branch, which the page reads directly (a refresh never triggers a deploy).
- **Data source:** OSRS Wiki real-time prices API. Always send the project's User-Agent (`docs/spec.md` §4); space requests out.
- **Tests:** Vitest for unit tests; Playwright (simulated iPhone) for end-to-end, pinned to the cloud sessions' version (1.63.0). Tests and checks use the saved samples in `samples/`, never the live site.
- Reasons: `docs/decisions.md`.

## How to work (details: `docs/workflow.md`)
Start every session with `docs/status.md`. Work in **batches** of small PRs:
1. **Batch plan first:** restate the goal, list the PRs in order with acceptance criteria and a risk level each, and ask all open questions at once, each with a recommendation. Plain language, phone-readable, no code. Wait for my OK.
2. **One PR per task, into `next`:** start the branch from the latest `next`. Build it with tests, run the end-to-end checks (`e2e-check` skill), run `/code-review` and fix its findings, then `make check` and `make build`. Open the PR into `next` with the PR template and a `risk:low|medium|high` label. GitHub merges low/medium when the checks pass; high waits for my `owner-ok` label. This session pushes to one branch: after each merge, restart it from the latest `next` (`--force-with-lease`) before the next PR.
3. **Mid-batch questions:** if it changes what I approved, stop and ask. Small choices inside the plan: decide, note them in the PR and the test checklist.
4. **End of batch:** open (or update) the release PR `next` → `main` with the `release` label, how I can try `next` (see "How I try it") and a test checklist I can follow on my phone. I test, you fix on `next`, I merge (merge commit, never squash). Then update `docs/status.md`.
5. Don't add dependencies, services, or change the stack without asking (always `risk:high`). Changes to the hourly workflow, `job/` and deploy settings are `risk:high` too.
6. Design mobile-first; every screen must work well on a phone. Follow the `ux-fundamentals` skill for any screen work and run its checklist before opening a PR that changes screens.

## When you finish a batch (release PR) or need me
- **How to try it:** the preview link or build for `next`, once it's ready. If it isn't ready yet, say so and check again.
- **What changed:** 2–4 plain-language bullets per PR, or per screen/feature for a batch
- **How to test it:** steps I can follow on my phone
- **Anything I need to do:** decisions, `owner-ok` labels waiting, PC-only steps, open questions (or "nothing")

## Commands
The same names in every project (`Makefile`); what they run depends on the stack.
- `make setup` – install dependencies
- `make check` – lint, format check and unit tests
- `make build` – production build or package
- `make dev` – run locally
- `make e2e` – end-to-end checks (from the foundation batch on)
Run `make check`, `make build` and `make e2e` before opening a PR. GitHub runs the same on every PR.

## Secrets and safety
- Never commit real keys or passwords. Use `.env.example` (or the stack's equivalent) with placeholders.
- Don't delete or overwrite my real data without asking.

## Project docs
- `docs/status.md` – where we are and what's next: read first
- `docs/spec.md` – product spec, source of truth
- `docs/plan.md` – build plan: what's next, in order
- `docs/decisions.md` – standing decisions and why (old detail in `docs/archive/`)
- `docs/workflow.md` – how we work, risk levels, GitHub automation
- `TODO-PC.md` – tasks only I can do
