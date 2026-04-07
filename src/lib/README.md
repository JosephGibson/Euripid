# lib/

Shared init-context infrastructure.

- `config.js` reads environment + profile JSON, validates them against required-field schemas, and builds the k6 `options` object via `buildOptions()`.
- `data.js` loads CSV via `SharedArray` (read once, shared across all VUs) and exposes `rowForVU()`.
- `metrics.js` defines custom Trends and Counters used by flows (`transaction_duration`, `scenario_errors`, etc.).
- `transactions.js` provides `withTransaction(name, fn)` — wraps k6 `group()` and records tagged `transaction_duration` for HTML/summary reports.
- `assertions.js` provides `assertVisible`, `assertHidden`, `assertText`, `assertElement` — wait for element state with a three-level timeout hierarchy (per-call > `env.timeouts.assertion` > 10 s), record k6 `check()`, optionally throw on failure (`failFast`).
- `logging.js` resolves optional `environment.logging` + `EURIPID_*` env overrides and emits structured `EURIPID_ERROR` lines for failures.
- `summary.js` exports a shared `handleSummary` that writes to `__ENV.RUN_OUTPUT_DIR` (set by the orchestrator), defaulting to `results/` for direct k6 invocations. Every scenario should re-export this rather than rolling its own — otherwise parallel runs race on output paths.

These modules are init-context-sensitive — import them at the top of scenario files, never lazily.
