# Changelog

All notable changes to Euripid.

Versioning has been reset to **0.1.x** for alpha, milestone-driven development. Earlier internal iteration numbers have been retired from the public project history so the repo now reflects its current maturity more honestly.

## [0.1.0] - 2026-04-15

### Status
- Alpha baseline reset from the prior pre-1.0 internal iteration history.
- Euripid should be treated as an evolving template that will change through milestone-driven work, not as a stable 1.x framework.

### Included
- k6 + `k6/browser` template scaffold with Page Object Model layout.
- JSON-driven environment and load-profile config under `config/`.
- CSV-driven per-VU data fan-out via `SharedArray` in `src/lib/data.js`.
- Shared init-context helpers for config loading, summary writing, logging, assertions, metrics, and transactions.
- Vendored runtime-safe helpers in `src/vendor/` for CSV parsing and report rendering.
- PowerShell orchestrator (`scripts/run.ps1`) that snapshots inputs, runs k6, and packages each run into a timestamped zip.
- Per-run output isolation via `RUN_OUTPUT_DIR` so summaries and screenshots land in the correct run directory.
- Tutorial and demo scenarios including `self-test`, `first-test-tutorial`, `browser-login`, and `google-example`.
- Agent- and human-facing docs including `AGENTS.md`, `docs/USAGE.md`, `docs/RECIPES.md`, and the overhaul plans in `docs/plans/`.

### Current Baseline Characteristics
- Stricter environment/profile validation with clearer failure messages.
- Typed transaction helpers and metrics for navigation, user actions, page loads, and outer journey timing.
- Assertion helpers with configurable timeouts and optional fail-fast behavior.
- Structured `EURIPID_ERROR` logging and scenario/data error counters.
- Summary persistence using vendored local helpers and a slim `summary.json` by default.
- Cross-OS `pwsh` compatibility for the orchestrator.

### Known Limitations
- No `run.sh` companion script yet.
- No CI workflow yet.
- Single-scenario runs only.
- Windows-first execution model, even though `run.ps1` is written in cross-OS `pwsh`.
