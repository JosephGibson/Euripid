# Changelog

All notable changes to Euripid.

Versioning has been reset to **0.1.x** for alpha, milestone-driven development. Earlier internal iteration numbers have been retired from the public project history so the repo now reflects its current maturity more honestly.

## [Unreleased]

### Changed
- Removed the retired top-level `config/`, `data/`, `src/`, and `results/` trees.
- Updated current-facing docs and agent guidance to treat `harness/` plus `projects/` as the only active architecture.

## [0.1.0] - 2026-04-15

### Status
- Initial alpha release of the TypeScript-first `harness/` + `projects/` architecture.
- Euripid should be treated as an evolving template that will continue to change through milestone-driven work, not as a stable 1.x framework.

### Included
- Shared runtime and reporting harness under `harness/` with stable public entrypoints via `harness/index.ts`, `harness/data.ts`, and `harness/types.ts`.
- Committed `projects/template-project/` bootstrap with project-local config, profiles, CSV data, pages, flows, scenarios, metrics, and results.
- JSON-driven environment variants in `projects/<project>/project.config.json` and project-local load profiles under `projects/<project>/profiles/`.
- CSV-driven per-VU data fan-out via `SharedArray` through `harness/data.ts`.
- Shared init-context helpers for config loading, summary writing, logging, assertions, metrics, transactions, and page objects.
- Vendored runtime-safe helpers in `harness/vendor/` for CSV parsing and report rendering.
- PowerShell orchestrator (`scripts/run.ps1`) that resolves project/scenario/profile/environment inputs, snapshots run inputs, runs k6, and packages each run into a timestamped zip.
- Per-run output isolation via `RUN_OUTPUT_DIR` so summaries and screenshots land in the correct project-local results directory.
- Committed validation scenarios including `self-test`, `first-test-tutorial`, and `browser-login`.
- Agent- and human-facing docs including `AGENTS.md`, `README.md`, `docs/USAGE.md`, `docs/RECIPES.md`, and the overhaul plans in `docs/plans/`.

### Current Baseline Characteristics
- Stricter environment/profile validation with clearer failure messages.
- Typed transaction helpers and metrics for navigation, user actions, page loads, and outer journey timing.
- Assertion helpers with configurable timeouts and optional fail-fast behavior.
- Structured `EURIPID_ERROR` logging and scenario/data error counters.
- Summary persistence using vendored local helpers and a slim `summary.json` by default.
- Cross-OS `pwsh` compatibility for the orchestrator, with Windows auto-download support for `bin/k6.exe`.

### Known Limitations
- No `run.sh` companion script yet.
- No CI workflow yet.
- Single-scenario runs only.
- Linux/macOS still require a local `k6` binary plus PowerShell 7 (`pwsh`) to use the supported runner path.
