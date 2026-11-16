# Standard commands: the same names in every project, whatever the stack.
# GitHub (ci.yml), CLAUDE.md and docs/workflow.md only ever call these.
# This project: TypeScript, one npm package (page in src/, data job in job/).
# No database, so there are no local-db or migrate targets.
#
#   make setup      install dependencies (CI runs this first)
#   make check      lint + format check + unit tests (required)
#   make build      production build of the page (required)
#   make e2e        end-to-end checks on saved samples (run make build first)
#   make samples    refresh the saved price-API responses in samples/
#   make dev        run the page locally

.PHONY: setup check build e2e samples dev

setup:
	npm ci

check:
	npm run lint
	npm run format:check
	npm test

build:
	npm run build

dev:
	npm run dev

e2e:
	npm run e2e

# Needs to reach prices.runescape.wiki (e2e-check skill). Node only uses the
# cloud session's proxy when told to.
samples:
	NODE_USE_ENV_PROXY=1 npm run samples
