# Standard commands: the same names in every project, whatever the stack.
# GitHub (ci.yml), CLAUDE.md and docs/workflow.md only ever call these.
# This project: TypeScript, one npm package (page in src/, data job in job/).
# No database, so there are no local-db or migrate targets.
#
#   make setup      install dependencies (CI runs this first)
#   make check      lint + format check + unit tests (required)
#   make build      production build of the page (required)
#   make e2e        end-to-end checks on saved samples (filled in by the foundation batch)
#   make dev        run the page locally
#
# The npm scripts these call (lint, format:check, test, build, dev) arrive
# with package.json in the foundation batch.

.PHONY: setup check build e2e dev todo

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

e2e: todo

todo:
	@echo "This make target isn't filled in yet: see the comments at the top of the Makefile." >&2
	@exit 1
