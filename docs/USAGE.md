# Euripid User Guide

The new Euripid workflow is project-aware: you run a named scenario inside a named project, select an environment variant from that project's `project.config.json`, and choose a project-local load profile.

## Prerequisites

1. Install repo tooling:
   ```bash
   npm install
   ```
2. Make k6 available:
   - Windows: `./scripts/run.ps1` will download the latest Grafana `k6.exe` into `bin/` if needed.
   - Linux/macOS: install `k6` on PATH or place it at `bin/k6`, and use PowerShell 7 (`pwsh`) to run `run.ps1`.

## First run

```powershell
./scripts/run.ps1 -Project template-project -Scenario self-test -Environment self-test -Profile smoke
```

This hits `quickpizza.grafana.com` and validates the rewritten harness path: project config loading, profile validation, browser startup, summary generation, and project-local artifact writing.

## Tutorial path

```powershell
./scripts/run.ps1 -Project template-project -Scenario first-test-tutorial -Environment example-tutorial -Profile smoke
```

Then open [projects/template-project/scenarios/first-test-tutorial.ts](/home/joker/Projects/Euripid/projects/template-project/scenarios/first-test-tutorial.ts). It is the committed onboarding scenario for the new architecture.

## Command-line reference

```text
./scripts/run.ps1 -Project <project> -Scenario <scenario> -Environment <env-key> -Profile <profile> [options]
```

### Required flags

| Flag | Meaning |
|---|---|
| `-Project` | Project directory under `projects/` |
| `-Scenario` | Scenario file under `projects/<project>/scenarios/` without `.ts` |
| `-Environment` | Named environment variant inside `projects/<project>/project.config.json` |
| `-Profile` | Profile JSON under `projects/<project>/profiles/` without `.json` |

### Optional flags

| Flag | Meaning |
|---|---|
| `-DataFile` | CSV filename under `projects/<project>/data/`; if omitted, the runner uses `project.defaultDataFile` when present |
| `-RunName` | Friendly tag prefixed into the run ID |
| `-NoBanner` | Suppress the ASCII startup banner |
| `-NoZip` | Keep the loose run directory but skip zip packaging |
| `-Quiet` | Suppress non-error console output |
| `-Verbose` | Built-in PowerShell switch for `[DEBUG]` logging |
| `-LogLevel` | Override `EURIPID_LOG_LEVEL` |
| `-DisableScenarioErrorLog` | Suppress structured `EURIPID_ERROR` lines in k6 output |
| `-IncludeUserContextInLogs` | Allow username/role hints in structured error lines |

### Examples

Smoke self-test:

```powershell
./scripts/run.ps1 -Project template-project -Scenario self-test -Environment self-test -Profile smoke
```

Tutorial walkthrough:

```powershell
./scripts/run.ps1 -Project template-project -Scenario first-test-tutorial -Environment example-tutorial -Profile smoke
```

Login sample under ramped load:

```powershell
./scripts/run.ps1 -Project template-project -Scenario browser-login -Environment staging -Profile load -RunName release-123
```

## Project config model

Each project owns a `project.config.json` with two responsibilities:

1. `project` metadata such as `key`, `name`, and optional `defaultDataFile`
2. an `environments` map keyed by runtime environment name

Example:

```json
{
  "project": {
    "key": "template-project",
    "name": "Template Project",
    "defaultDataFile": "users.csv"
  },
  "environments": {
    "staging": {
      "name": "staging",
      "baseUrl": "https://staging.example.com",
      "authUrl": "https://staging.example.com/login",
      "timeouts": {
        "navigation": 30000,
        "action": 15000,
        "assertion": 10000
      }
    }
  }
}
```

There is no separate `environments/` folder in the new layout.

## Output

Each orchestrated run writes to:

```text
projects/<project>/results/<runId>/
```

Typical contents:

```text
project.config.json   snapshot of the full project config
environment.json      resolved environment variant used for the run
profile.json          snapshot of the selected profile
data.csv              resolved CSV snapshot when data was supplied
k6-stream.json        raw k6 event stream
k6-console.log        captured k6 console output
euripid.log           orchestrator log
summary.html          shared HTML report
summary.json          slim machine-readable summary
screenshots/          screenshots from BasePage.screenshot()
```

Unless `-NoZip` is set, the runner also creates:

```text
projects/<project>/results/<runId>.zip
```

## Reports

`handleSummary()` from [`harness/reporting/summary.ts`](/home/joker/Projects/Euripid/harness/reporting/summary.ts) writes the shared report set. Scenarios should re-export it instead of rolling their own.

### What to expect in the report

- Checks and thresholds
- Custom metrics such as `transaction_duration`, `navigation_duration`, `user_action_duration`, and `page_load_duration`
- Built-in browser metrics such as `browser_web_vital_lcp`, `browser_web_vital_fcp`, and HTTP timing rows

### Important note about transaction helpers

Current k6 rejects async `group()` callbacks in browser scenarios. Because of that, Euripid's transaction helpers now record tagged Trend metrics instead of trying to preserve async group nesting. The main structural signal in reports is the named metric rows and their transaction tags, not a nested browser-group tree.

## Direct k6 validation

If you already have a working k6 binary and want to validate a scenario without the PowerShell runner, you can run it directly:

```bash
mkdir -p projects/template-project/results/direct-self-test
bin/k6 run \
  -e PROJECT=template-project \
  -e ENVIRONMENT=self-test \
  -e PROJECT_CONFIG_FILE=projects/template-project/project.config.json \
  -e PROFILE_FILE=projects/template-project/profiles/smoke.json \
  -e RUN_OUTPUT_DIR=projects/template-project/results/direct-self-test \
  projects/template-project/scenarios/self-test.ts
```

`RUN_OUTPUT_DIR` must already exist before `k6` writes `summary.html` and `summary.json`, which is why the example creates the directory first. That direct path is useful for harness debugging, but the supported day-to-day interface remains `scripts/run.ps1`.
