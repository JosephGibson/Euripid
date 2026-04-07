# Euripid User Guide

A 5-minute tour of running and extending Euripid from the command line.

## Prerequisites

- **Windows:** drop `k6.exe` into `bin/`. Get it from https://github.com/grafana/k6/releases.
- **Linux/macOS (best-effort, v1.0):** install k6 on PATH (`brew install k6`, `apt install k6`, etc.) and use `pwsh` (PowerShell 7+).

Verify:
```powershell
./scripts/run.ps1 -Scenario self-test -Environment self-test -Profile smoke
```
This hits k6's public demo (`quickpizza.grafana.com`) and exercises the full pipeline. If a zip lands in `results/`, you're good.

## Your first test (tutorial scenario)

The repo includes a **dummy example project** ("Acme Pizza Co.") so you can learn the file layout without wiring your own app yet.

1. Run:
   ```powershell
   ./scripts/run.ps1 -Scenario first-test-tutorial -Environment example-tutorial -Profile smoke
   ```
2. Open **`src/scenarios/first-test-tutorial.js`** — it is a line-by-line walkthrough: what to import, how `buildOptions` ties to `config/profiles`, how `default` maps to one browser iteration, how `withTransaction` feeds the HTML report, and how `handleSummary` writes into `results/<runId>/`.
3. Copy that scenario file as a starting point for a real flow; point a new environment JSON at your `baseUrl` (see `config/environments/example-tutorial.json` as a template).

The **`self-test`** scenario stays a minimal health check; **`first-test-tutorial`** is the teaching script.

## Command-line reference

```
./scripts/run.ps1 -Scenario <name> -Environment <name> -Profile <name> [options]
```

### Required flags

| Flag           | Description                                                       |
|----------------|-------------------------------------------------------------------|
| `-Scenario`    | Scenario file under `src/scenarios/` (without `.js`).             |
| `-Environment` | Environment JSON under `config/environments/` (without `.json`).  |
| `-Profile`     | Profile JSON under `config/profiles/` (without `.json`).          |

### Optional flags

| Flag           | Description                                                       |
|----------------|-------------------------------------------------------------------|
| `-DataFile`    | CSV file under `data/`. Default: `users.csv`.                     |
| `-RunName`     | Friendly tag baked into the run ID and zip filename.              |
| `-NoBanner`    | Suppress the ASCII startup banner.                                |
| `-NoZip`       | Keep the loose run directory but skip zip packaging.              |
| `-Quiet`       | Suppress console output (errors still print). Log file is full.   |
| `-Verbose`     | Print `[DEBUG]` lines (built-in PowerShell common parameter).     |
| `-LogLevel`    | Override `logging.level` for k6 (`EURIPID_LOG_LEVEL`: error/warn/info/debug). |
| `-DisableScenarioErrorLog` | Suppress structured `EURIPID_ERROR` JSON lines in k6 output (captured in `k6-console.log`). |
| `-IncludeUserContextInLogs` | Allow username/role hints in error lines (`EURIPID_INCLUDE_USER_CONTEXT`). Passwords are never logged. |

### Built-in PowerShell help

```powershell
Get-Help ./scripts/run.ps1 -Full
Get-Help ./scripts/run.ps1 -Examples
```

## Examples

**Smoke test against staging:**
```powershell
./scripts/run.ps1 -Scenario browser-login -Environment staging -Profile smoke
```

**Full load test, tagged for a release:**
```powershell
./scripts/run.ps1 -Scenario browser-login -Environment staging -Profile load -RunName release-123
```

**Quiet CI run, no banner, no zip (let CI archive the dir directly):**
```powershell
./scripts/run.ps1 -Scenario browser-login -Environment staging -Profile load -NoBanner -NoZip -Quiet
```

**Verbose debug:**
```powershell
./scripts/run.ps1 -Scenario self-test -Environment self-test -Profile smoke -Verbose
```

## Output

Each run produces `results/<runId>/` containing:

```
environment.json     snapshot of the env config used
profile.json         snapshot of the load profile used
data.csv             snapshot of the CSV used
k6-stream.json       raw k6 event stream (every metric, every check)
k6-console.log       captured k6 console output (includes `EURIPID_ERROR` JSON when enabled)
euripid.log          structured orchestrator log (timestamped, tagged)
summary.html         k6-reporter HTML report
summary.json         k6 summary as JSON
screenshots/         screenshots from BasePage.screenshot() calls
```

Unless `-NoZip` is set, the directory is also zipped to `results/<runId>.zip`.

The `runId` format is `<runName>-<scenario>-<environment>-<profile>-<timestamp>`, so runs sort and grep cleanly.

## Logging tags

Console output uses tagged, color-coded prefixes that mirror the entries in `euripid.log`:

| Tag       | Color    | Meaning                                              |
|-----------|----------|------------------------------------------------------|
| `[LOG]`   | Blue     | Routine progress message                             |
| `[STEP]`  | Magenta  | Major phase boundary (resolved k6, invoking k6, etc.)|
| `[OK]`    | Green    | Success                                              |
| `[WARN]`  | Yellow   | Non-fatal issue (k6 exited non-zero, etc.)           |
| `[ERROR]` | Red      | Fatal error. Always printed even with `-Quiet`.      |
| `[DEBUG]` | Dark gray| Only with `-Verbose`. Internal details.              |

The log file (`euripid.log`) records every line in plain text with ISO timestamps, regardless of console verbosity.

## Adding new scenarios, pages, profiles, environments

See [`docs/RECIPES.md`](RECIPES.md). Each recipe is copy-paste and self-contained.

## Exit codes

| Code | Meaning                                                       |
|------|---------------------------------------------------------------|
| 0    | Success                                                       |
| 1    | k6 ran but exited non-zero (thresholds failed or runtime err) |
| 2    | Pre-flight failure (missing input, k6 binary not found)       |
| 3    | k6 succeeded but zip packaging failed                         |
