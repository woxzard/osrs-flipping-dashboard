# How we work

**In one line:** the owner decides and tests; Claude builds; GitHub checks the work and merges the safe parts; the owner ships.

The owner still makes every product decision and approves anything risky. What goes away is reviewing and merging every small PR. This works the same for any kind of project and any stack: the automation only calls the standard `make` commands (`Makefile`).

## The batch cycle

A **batch** is a group of related PRs that make sense to test together (e.g. "sign-in and profile", or "the import feature").

**1. Plan (Claude → owner, one message).** Claude sends a phone-readable batch plan:
- the goal, and the PRs in order, each with acceptance criteria and a risk level (below);
- every open question at once, each with a recommendation;
- anything only the owner can do (`TODO-PC.md`).

The owner answers with OK or changes. This is where the decisions happen.

**2. Build (Claude, no owner taps for low/medium).** For each PR:
1. Start a branch from the latest `next`.
2. Build it, with unit tests (`make check`) and end-to-end checks if the project has them (`make e2e`; screenshots only for visual changes).
3. Run `/code-review` on the change and fix what it finds.
4. Run `make check` and `make build`, push, and open the PR **into `next`** using the PR template, with a `risk:` label.
5. GitHub runs the checks. Low and medium PRs merge themselves when everything is green (squash). High PRs wait for the owner's `owner-ok` label.
6. A session pushes to one branch only, so the next PR starts after this one has merged: restart the branch from the latest `next` (push with `--force-with-lease`).

To stop any PR from merging itself, add the `hold` label.

If a question comes up that changes what the owner approved, Claude stops and asks. Small choices inside the approved plan: Claude decides, notes it in the PR, and lists it in the test checklist so the owner sees it.

**3. Test (owner, once per batch).** Claude opens a **release PR** (`next` → `main`) with:
- how to try `next`: the way set in `CLAUDE.md` → "How I try it" (a preview link, a test build, a staging URL, a sample run);
- a test checklist: steps on the phone, grouped by screen or feature, including the small choices Claude made.

The owner tests. Problems go in a comment on the release PR (or a GitHub issue). Claude fixes them on `next` (fix PRs merge themselves the same way) and updates the checklist.

**4. Ship (owner, one tap).** Merge the release PR with **Create a merge commit** (not squash). Vercel deploys the page from `main`, and the hourly job starts using the new code on its next run.

**Owner's taps per batch:** approve the plan, add `owner-ok` to any high-risk PR, test once, merge once.

## Risk levels

| Level | Examples | Who merges into `next` |
|---|---|---|
| `risk:low` | Wording, styling, docs, tests, library updates (minor/patch) | GitHub, when checks pass |
| `risk:medium` | Behaviour the owner approved in the batch plan | GitHub, when checks pass |
| `risk:high` | The hourly data job (`job/`) and its workflow, new libraries or services, build/deploy settings, GitHub workflows, export/backup of my data, changing an agreed rule | Waits for the owner's `owner-ok` label |

The **risk gate** check enforces this: a PR into `next` that touches a high-risk path (listed per project in `.github/risk-paths.txt`) or is labelled `risk:high` fails until it has `owner-ok`. Every PR into `next` needs a `risk:` label. To approve on a phone: open the PR in the GitHub app → Labels → `owner-ok`.

PRs into `main` (release and urgent fixes) are merged by the owner, which is the approval.

## What GitHub does by itself

| Workflow | When | What |
|---|---|---|
| `ci.yml` (check **checks**) | Every PR | `make setup`, `make check`, `make build`, then `make e2e` once the foundation batch has added it. |
| `risk-gate.yml` (check **risk-gate**) | PRs into `next` | The rules above. Also creates the labels. |
| `merge-when-green.yml` | After the checks finish | Merges a PR into `next` (squash) when **checks** and **risk-gate** are both green on its newest commit, unless it's a draft or has the `hold` label. Works on any GitHub plan (GitHub's own auto-merge needs branch protection, which private repos only get on paid plans). |
| `next-branch.yml` | Something lands on `main` | Creates `next` from `main` if it doesn't exist; warns if `main` has a fix that `next` doesn't. |
| Hourly data workflow (data job batch) | Every hour, from `main` only | Fetches prices, scores the flips and overwrites the results file on the `data` branch. Can also be started by hand. |
| Dependabot (`.github/dependabot.yml`) | Weekly / monthly | Grouped minor/patch updates into `next`, labelled `risk:low`, so they merge themselves when checks pass. Major updates are left for a planned batch. |

## When something goes wrong

- **A check fails:** Claude fixes it on the branch. Tests are never skipped or disabled to get green.
- **Urgent bug in production:** a small PR straight into `main` (owner merges), then Claude opens a `main` → `next` PR so `next` has it too.
- **A release needs undoing:** roll the page back in Vercel (Deployments → previous one → Promote), then tell Claude. If the data job is the problem, Claude reverts it on `main` with an urgent fix PR. Keep changes to the results file additive, so the old page still works with the new file.

## End-to-end checks (for Claude)

- The foundation batch adds `make e2e`: the page on a simulated iPhone against saved sample data, and (from the data job batch) a sample run of the job compared with a saved expected result.
- Nothing in tests or checks calls the live price site: use `samples/`.
- Keep these tools in the repo. Anything a session builds twice belongs in the repo.
- How-tos and quirks go in the `e2e-check` skill (`.claude/skills/e2e-check/SKILL.md`), loaded only when needed.
- UX rules for screens go in the `ux-fundamentals` skill (`.claude/skills/ux-fundamentals/SKILL.md`); its master copy lives in the knowledge repo.

## Docs map

| File | What it's for | Who updates it |
|---|---|---|
| `CLAUDE.md` | Rules every session follows | Claude, when the way we work changes |
| `docs/status.md` | Where we are, what's next, open questions. **Start of every session.** | Claude, at the end of each batch and release |
| `docs/spec.md` | What the product does (source of truth) | Claude, when a batch changes behaviour |
| `docs/plan.md` | What's next, in order; finished work one line each | Claude, per batch |
| `docs/decisions.md` | Standing decisions + one log entry per batch | Claude, per batch |
| `docs/workflow.md` | This file | Claude, when the way we work changes |
| `TODO-PC.md` | Steps only the owner can do | Claude adds, owner ticks |
| `docs/archive/` | Finished plans, old logs | Read only when the detail is needed |
