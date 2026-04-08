# AGENTS.md

Entry point for AI/LLM agents working on Euripid. Read this first; it links out to deeper docs only when needed.

## What this repo is

**Euripid v1.2** — a k6 + `k6/browser` performance testing template. Browser-level perf flows are written as Page Objects, composed into flows, exposed as k6 scenario entry points, and orchestrated by a PowerShell script that packages every run into a timestamped zip. Consumed as a clone-and-modify template, not a dependency.

**Not Playwright.** k6 runs JS on Goja, not Node — the npm `playwright` package cannot be imported. `k6/browser` is a Chromium automation API with Playwright-shaped semantics. When in doubt, prefer k6 docs over Playwright docs.

**Status:** v1.2 released. Adds local vendored runtime helpers, stricter validation, safer summary handling, and more reliable browser-flow behavior. See `CHANGELOG.md` for the full scope.

## Mental model (read this once)

```
config/   →  static-per-run JSON (environments, load profiles)
data/     →  fanned-out-per-VU CSV (users, payloads)
src/lib/  →  init-context infrastructure
            ├ config.js      reads env+profile JSON, validates, builds k6 options
            ├ data.js        SharedArray-backed CSV loader, rowForVU()
            ├ metrics.js     custom Trends and Counters
            ├ transactions.js  withTransaction/Navigation/UserAction/PageLoad — tagged Trend timings (no k6 group(); async-safe)
            ├ assertions.js  assertVisible/Text/Hidden — configurable-timeout element checks
            ├ logging.js     structured EURIPID_ERROR lines + scenario_errors counter
            └ summary.js     shared handleSummary that respects RUN_OUTPUT_DIR
src/pages/      POM page classes. Each extends BasePage, holds locators + actions.
src/flows/      Composed user journeys. Import pages, record timings via metrics.js.
src/scenarios/  k6 entry points. ONE scenario per file. Re-export options + handleSummary.
scripts/run.ps1 Orchestrator. Resolves k6, runs scenario, zips results.
results/        Per-run dirs and zips. Gitignored.
```

The dataflow at runtime: `run.ps1` → creates `results/<runId>/` → sets `ENV_FILE` / `PROFILE_FILE` / `DATA_FILE` / `RUN_OUTPUT_DIR` env vars → invokes k6 on a scenario file → scenario imports `config.js` (reads + validates JSON at init) and `data.js` (reads CSV at init via SharedArray) → scenario's default function instantiates pages and runs the flow → `handleSummary` from `summary.js` writes HTML + JSON directly into `RUN_OUTPUT_DIR` → `run.ps1` zips the dir.

## Hard constraints (violating these breaks the build)

1. **k6 file IO is init-context only.** `open()` must be called at the top of a module, not inside `default` or any async function. `config.js` and `data.js` already follow this — preserve the pattern.
2. **CSV data must go through `SharedArray`.** Never `JSON.parse(open(...))` a per-VU dataset directly — every VU re-parses and memory explodes. Use `src/lib/data.js`.
3. **Browser scenarios need `options: { browser: { type: 'chromium' } }` on the scenario object.** `buildOptions()` in `config.js` adds this automatically. Don't bypass it.
4. **One scenario per file.** Mixing scenarios in a single run is supported by k6 but explicitly out of scope for this library — keeps reasoning simple. If asked to add multi-scenario, push back and confirm.
5. **No npm dependencies.** k6 imports work via URL. Don't introduce `package.json` or assume Node.
6. **Output paths must respect `RUN_OUTPUT_DIR`.** `summary.js` and `BasePage.screenshot()` already do. Anything new that writes files must too — otherwise parallel runs race.
7. **PowerShell stays `pwsh`-compatible.** Even though v1.0 is Windows-first, `run.ps1` should not regress on cross-OS compatibility. Branch on `$IsWindows` for OS-specific bits.

## How to add things

See [`docs/RECIPES.md`](docs/RECIPES.md). It has copy-paste templates for:
- New page object
- New flow
- New scenario
- New environment
- New profile
- New CSV dataset
- New custom metric

## How to run

```powershell
./scripts/run.ps1 -Scenario browser-login -Environment staging -Profile load
```

Optional: `-DataFile users.csv`, `-RunName release-123`. Output lands in `results/<runId>.zip`.

**Self-test (no setup, no target app required):**
```powershell
./scripts/run.ps1 -Scenario self-test -Environment self-test -Profile smoke
```
This hits `quickpizza.grafana.com` (k6's public demo) and verifies the entire toolchain — config loading, validation, browser startup, navigation, summary writing, and zip packaging — without needing any infrastructure.

## File naming conventions

- Page classes: `PascalCase.js`, class name matches filename (`LoginPage.js` → `class LoginPage`).
- Flows: `kebab-case.js`, exports a single async `run<n>Flow` function.
- Scenarios: `kebab-case.js`, one per k6 entry point. Filename (without `.js`) is what `-Scenario` takes.
- Config JSON: `kebab-case.json`. Filename (without `.json`) is what `-Environment` / `-Profile` take.
- CSV: `kebab-case.csv`, header row required.

## What NOT to do

- Don't import `playwright` — it doesn't work in k6.
- Don't add lazy `open()` calls inside flows or default functions.
- Don't read CSVs without `SharedArray`.
- Don't add `package.json`, `node_modules`, or any Node-specific tooling.
- Don't combine scenarios in one k6 run unless explicitly asked.
- Don't hardcode env-specific values into page objects or flows. Push them through `environment.json`.
- Don't put credentials in committed JSON. `data/users.csv` is committed with dummy sample data; real credential CSVs should not be committed — add them to `.gitignore` or keep them local-only.
- Don't write output files to hardcoded paths. Always honor `__ENV.RUN_OUTPUT_DIR` (defaulting to `results/` when unset).
- Don't bypass the schema validation in `config.js` — if it rejects a profile, fix the profile, don't disable the check.

## Known limitations

- No `run.sh`. Bash orchestrator is planned for a future release.
- No CI workflow. Add when the consuming team has a target.
- No multi-scenario runs.

## Per-directory orientation

Each top-level directory has a one-paragraph `README.md` for agents that land in that folder cold. They are pointers, not duplicates of this file.

## When iterating

When asked to extend or modify this library:
1. Confirm which constraint(s) above the change touches before writing code.
2. Read the relevant per-directory README and `docs/RECIPES.md` section.
3. Keep the existing patterns — new pages look like `LoginPage`, new scenarios look like `browser-login.js`, etc. Consistency is the point.
4. If a request would break a constraint or a known limitation listed above, surface the conflict before complying.
