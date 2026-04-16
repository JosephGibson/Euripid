# CLAUDE.md

> **Full agent contract:** read [`AGENTS.md`](AGENTS.md) before writing any code.

## What this project is

Euripid is a TypeScript-first k6 + `k6/browser` performance framework. Shared runtime code lives in `harness/`; app-specific code lives in self-contained directories under `projects/`.

## Quick commands

```bash
# Type-check (no emit)
npm run typecheck

# Lint
npm run lint

# Run the zero-setup validation scenario (Linux/macOS, no pwsh required)
./scripts/run.sh -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke

# Same via PowerShell orchestrator (full feature set)
./scripts/run.ps1 -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke

# Dry-run: resolve config and print k6 command without executing
./scripts/run.ps1 -Validate -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke

# Direct k6 call (no orchestrator, useful for harness debugging)
mkdir -p projects/template-project/results/direct-run
bin/k6 run \
  -e PROJECT=template-project \
  -e ENVIRONMENT=self-test \
  -e PROJECT_CONFIG_FILE=projects/template-project/project.config.json \
  -e PROFILE_FILE=projects/template-project/profiles/smoke.json \
  -e RUN_OUTPUT_DIR=projects/template-project/results/direct-run \
  projects/template-project/scenarios/Sc01_self_test.ts
```

## Hard rules (summary — see AGENTS.md for full detail)

- Import only `harness/index.ts`, `harness/data.ts`, or `harness/types.ts` from project code.
- No Playwright. No Node.js APIs inside scenarios, pages, or flows.
- One scenario per file. `open()` and `SharedArray` init belong at module top-level only.
- All artifact writes must respect `RUN_OUTPUT_DIR`. No sibling-project imports.

## Do not

- Commit real credentials. `projects/template-project/data/users.csv` is dummy data only.
- Deep-import harness internals (`harness/runtime/…`, `harness/vendor/…`).
- Re-introduce `async group()` wrappers for browser flows — k6 rejects them.

## Before committing

```bash
npm run typecheck
npm run lint
```

## Extension patterns

Copy-paste templates for new pages, flows, scenarios, environments, profiles, datasets, and metrics are in [`docs/RECIPES.md`](docs/RECIPES.md).
