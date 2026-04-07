# Changelog

All notable changes to Euripid. Format loosely follows Keep a Changelog.

## [1.0.5] - 2026-04-07

### Added
- **Assertion helpers** (`src/lib/assertions.js`): `assertVisible`, `assertHidden`, `assertText`, `assertElement` — wait for an element state with a configurable timeout, record k6 `check()`, optionally `failFast` (throw). Timeout hierarchy: per-call `opts.timeout` > `env.timeouts.assertion` > 10 000 ms fallback.
- **`timeouts.assertion`** field in all environment JSONs. Validated by `config.js` (must be positive number). Drives element-wait assertions globally; individual calls can override.
- **`BasePage.resolveTimeout(kind, override)`** — three-level timeout resolution used by all page object methods.
- **Root `.gitignore`** — ignores `results/*/`, `results/*.zip`, `bin/k6*`, and OS/editor junk.

### Changed
- **Pinned `k6-reporter`** import to **`3.0.4`** tag (was `main` — a moving target). `papaparse` and `k6-summary` were already version-pinned.
- **`BasePage.waitForReady()`** now accepts `opts` (`{ timeout, state }`) and uses `assertion` timeout by default.
- **`LoginPage.loginAs()`** waits for the username field before typing (assertion timeout); prevents silent failures on slow-rendering forms.
- **`LoginPage.isLoggedIn()`** and `DashboardPage.waitForLoad()` accept `opts.timeout` overrides.
- **`login-flow verify_session`** uses `assertVisible` with `failFast` instead of manual `check()` + `throw`.
- **Tutorial** (`first-test-tutorial.js`) demonstrates `assertVisible`, `assertText`, per-call timeout override, and `failFast` pattern.

### Removed (from known-limitations)
- "External imports unpinned" limitation is now resolved for `k6-reporter`.

## [1.0.4] - 2026-04-07

### Fixed
- `login-flow`: after `check()` on login state, throw if the check failed so the iteration fails fast with a clear error instead of often failing later in `dashboard_ready` with a timeout.
- `first-test-tutorial`: assert on document title only for the “pizza” demo check (no `body` + `innerText()`), improving compatibility and keeping smoke `checks` thresholds predictable.

## [1.0.3] - 2026-04-07

### Added
- **`first-test-tutorial` scenario** (`src/scenarios/first-test-tutorial.js`): heavily commented walkthrough for creating a first browser test, using a dummy **example-tutorial** environment (`config/environments/example-tutorial.json`) against the public QuickPizza demo.
- Docs updates (`README.md`, `docs/USAGE.md`, `docs/RECIPES.md`, scenario/config READMEs) pointing beginners to the tutorial before `self-test`-only flows.

## [1.0.2] - 2026-04-07

### Added
- **Transaction timing:** `src/lib/transactions.js` with `withTransaction()` combines k6 `group()` (nested timings in summary/HTML) and a tagged `transaction_duration` Trend. Example flows (`login-flow`, `self-test`) wrap user journeys and steps.
- **Error logging:** `src/lib/logging.js` with `logScenarioError()` — increments `scenario_errors` (tagged `phase`, `scenario`) and prints one-line `EURIPID_ERROR` JSON to stderr (captured in `k6-console.log`). Controlled by optional `logging` in environment JSON and orchestrator flags `-LogLevel`, `-DisableScenarioErrorLog`, `-IncludeUserContextInLogs`, or `EURIPID_*` env vars when invoking k6 directly.

## [1.0.1] - 2026-04-07

### Fixed
- `scripts/run.ps1` now runs on Windows PowerShell 5.1 (the default on most corporate Windows installs). The previous build referenced `$IsWindows`, which is a PowerShell 7+ automatic variable; under `Set-StrictMode -Version Latest` on 5.1 it threw before reaching the k6 invocation. Detection now goes through `$PSVersionTable.PSVersion.Major` first and short-circuits the `$IsWindows` lookup so PS7 paths still work.

## [1.0.0] - 2026-04-07

Initial release.

### Added
- k6 + `k6/browser` library scaffold with Page Object Model layout.
- JSON-driven environment + profile config (`config/environments/`, `config/profiles/`).
- CSV-driven per-VU data fan-out via `SharedArray` (`src/lib/data.js`).
- Generic form-login `LoginPage` plus `BasePage` and `DashboardPage` examples.
- `browser-login` flow scenario and `self-test` scenario (against `quickpizza.grafana.com`, no setup required).
- PowerShell orchestrator (`scripts/run.ps1`) that snapshots config, runs k6, and packages every run into a timestamped zip.
- Per-run output isolation via `RUN_OUTPUT_DIR` env var — parallel runs no longer race on `results/summary.html` or screenshot paths.
- Profile schema validation in `buildOptions()` — typos fail fast with a useful message instead of producing cryptic k6 errors.
- Agent-friendly docs: `AGENTS.md`, `docs/RECIPES.md`, per-directory READMEs.
- MIT license, NOTICE for bundled k6 binary.

### Known limitations (deferred to future versions)
- **External imports unpinned.** `k6-reporter`, `papaparse`, and `k6-summary` are loaded from upstream URLs at runtime without commit pinning. If those upstreams change or disappear, runs break. Vendoring or SHA pinning is planned for v1.1.
- **Windows-first.** `run.ps1` is written in cross-OS pwsh and works on Linux/macOS, but a sibling `run.sh` is not yet shipped. Planned for v1.1.
- **Single scenario per run.** Multi-scenario composition is intentionally out of scope; revisit if needed.
- **No CI workflow.** GitHub Actions or similar should be added when the consuming team has a target.
