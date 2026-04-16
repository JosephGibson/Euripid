# AGENTS.md

Entry point for AI/LLM agents working on Euripid.

## What this repo is

Euripid is now a **TypeScript-first** k6 + `k6/browser` framework built around:

1. a shared repo-level harness under `harness/`
2. self-contained testing projects under `projects/`
3. a committed `projects/template-project/` that users copy as their bootstrap

The repo has already removed the old top-level `config/`, `data/`, `src/`, and `results/` trees. Treat `harness/` plus `projects/` as the only active implementation surface.

## Non-negotiable runtime facts

- **Not Playwright.** Do not import the npm `playwright` package into runtime code.
- **k6 runtime code is not Node runtime code.** Node is acceptable for dev tooling, type checking, and repo scripts, but not inside scenarios/pages/flows that execute in k6.
- **`open()` stays init-context only.** Keep file reads in top-level module scope or `SharedArray` init callbacks.
- **CSV data still goes through `SharedArray`.** Use the shared loader exposed via [`harness/data.ts`](/home/joker/Projects/Euripid/harness/data.ts).
- **Browser scenarios still need Chromium options.** Use `buildOptions()` from the harness instead of assembling browser scenario config by hand.
- **One scenario per file.** Do not collapse multiple runnable scenarios into one file unless the user explicitly wants that design change and understands the tradeoff.
- **Output paths must respect `RUN_OUTPUT_DIR`.** Anything that writes artifacts must remain run-isolated.
- **No sibling-project imports.** `project -> harness` is allowed; `project A -> project B` is forbidden.

## Mental model

```text
harness/
  index.ts        stable runtime/reporting entrypoint for project code
  data.ts         stable SharedArray data-loader entrypoint
  types.ts        stable type-only entrypoint
  runtime/        config loading, assertions, metrics, logging, transactions, page-core
  reporting/      shared handleSummary
  vendor/         vendored k6-safe helpers

projects/
  template-project/
    project.config.json   project metadata + named environment variants
    profiles/             load-shape JSON
    data/                 project-local CSV datasets
    pages/                app-specific page objects
    flows/                app-specific user journeys
    scenarios/            k6 entry points
    metrics.ts            project-local custom metrics
    results/              per-run output dirs and zips

scripts/run.ps1           primary orchestrator
```

Runtime flow:

`run.ps1` -> resolves project/scenario/profile/environment -> sets `PROJECT`, `ENVIRONMENT`, `PROJECT_CONFIG_FILE`, `PROFILE_FILE`, optional `DATA_FILE`, and `RUN_OUTPUT_DIR` -> invokes k6 on a project-local scenario -> harness config loads and validates project config + profile at init -> scenario runs pages/flows -> shared `handleSummary` writes artifacts into the project-local result directory.

## Stable harness entrypoints

Project code should import only from:

- [`harness/index.ts`](/home/joker/Projects/Euripid/harness/index.ts) for runtime helpers and reporting
- [`harness/data.ts`](/home/joker/Projects/Euripid/harness/data.ts) for `rowForVU()` / dataset loading
- [`harness/types.ts`](/home/joker/Projects/Euripid/harness/types.ts) for type-only imports

Do not deep-import internal harness files from projects unless the user explicitly asks to change the public boundary.

## Current project contract

Each project directory should be understandable on its own and should contain:

- `project.config.json`
- `profiles/`
- `pages/`
- `scenarios/`
- `data/`
- `results/`

`flows/` and project-local `metrics.ts` are expected when the project needs them, even though the minimal contract above is the required core.

## How to run

```powershell
./scripts/run.ps1 -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke
```

Tutorial path:

```powershell
./scripts/run.ps1 -Project template-project -Scenario Sc02_first_test_tutorial -Environment example-tutorial -Profile smoke
```

## How to extend

Start with [`docs/RECIPES.md`](docs/RECIPES.md). The new recipes cover:

- new page objects
- new flows
- new scenarios
- project environment variants inside `project.config.json`
- project-local profiles
- project-local CSV datasets
- project-local custom metrics

## Important implementation notes

- TypeScript is mandatory for new rewrite work.
- `package.json` and Node-based tooling are now expected.
- `scripts/run.ps1` remains the primary orchestration surface.
- On current k6, async browser callbacks cannot be wrapped with `k6/group()`. The harness transaction helpers therefore emit tagged Trend metrics without async group nesting. Do not reintroduce async `group()` wrappers for browser flows.
- Keep project-specific assets in the project directory. If something is genuinely shared across projects, move it into the harness.
- Real credentials should not be committed. `projects/template-project/data/users.csv` is dummy sample data only.

## Discovering valid run parameters

Use these shell one-liners to find what each flag accepts before constructing a run command.

```bash
# Valid -Project values
ls projects/

# Valid -Scenario values for a given project (strip the .ts extension)
ls projects/<project>/scenarios/*.ts

# Valid -Environment values for a given project
jq '.environments | keys' projects/<project>/project.config.json

# Valid -Profile values for a given project (strip the .json extension)
ls projects/<project>/profiles/*.json

# Valid -DataFile values for a given project
ls projects/<project>/data/*.csv
```

Zero-setup validation path (no real credentials or application required):

```powershell
./scripts/run.ps1 -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke
```

Same path without PowerShell (Linux/macOS):

```bash
./scripts/run.sh -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke
```

Dry-run to verify a parameter combination resolves correctly without invoking k6:

```powershell
./scripts/run.ps1 -Validate -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke
```

## Historical planning docs

Some files under `docs/plans/` still describe the pre-removal layout as part of rewrite history. Treat those references as archival context, not as implementation targets. New implementation work should target `harness/` and `projects/`.

`docs/plans/archive/` is archival-only. Ignore it during normal agent work unless the user explicitly asks for historical plan research.
