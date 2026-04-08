# lib/

Shared init-context infrastructure.

- `config.js` reads environment + profile JSON, validates them against required-field schemas, and builds the k6 `options` object via `buildOptions()`.
- `data.js` loads CSV via `SharedArray` (read once, shared across all VUs) and exposes `rowForVU()`. CSV parsing now uses a vendored local helper instead of a remote runtime import.
- `metrics.js` defines custom Trends and Counters used by flows. Includes `transaction_duration` for outer journey wrappers, typed Trends (`navigation_duration`, `user_action_duration`, `page_load_duration`), and error counters (`scenario_errors`, `flow_errors`, `data_errors`).
- `transactions.js` provides four helpers that wrap k6 `group()` and record tagged Trends: `withTransaction` (outer journey wrapper), `withNavigation` (page loads), `withUserAction` (clicks/typing/submits), `withPageLoad` (post-action settling). Typed helpers record only their own Trend so nested steps are not double-counted in `transaction_duration`. See `docs/RECIPES.md` for when to use each.
- `assertions.js` provides `assertVisible`, `assertHidden`, `assertText`, `assertElement` — wait for element state with a three-level timeout hierarchy (per-call > `env.timeouts.assertion` > 10 s), record k6 `check()`, optionally throw on failure (`failFast`).
- `logging.js` resolves optional `environment.logging` + `EURIPID_*` env overrides and emits structured `EURIPID_ERROR` lines for failures.
- `summary.js` exports a shared `handleSummary` that writes to `__ENV.RUN_OUTPUT_DIR` (set by the orchestrator), defaulting to `results/` for direct k6 invocations. Summary rendering now uses vendored local helpers and persists a slim `summary.json` by default; set `EURIPID_WRITE_FULL_SUMMARY=true` to restore the full raw k6 object when needed.

These modules are init-context-sensitive — import them at the top of scenario files, never lazily.
