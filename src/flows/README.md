# flows/

Composed user journeys. A flow imports page objects, runs them in sequence, wraps steps with `withTransaction()` from `src/lib/transactions.js` (group + `transaction_duration` metrics), records legacy timings via `src/lib/metrics.js`, logs failures with `logScenarioError()` from `src/lib/logging.js`, and screenshots on failure. Flows are pure functions of `(page, env, ...inputs)` — they don't know about k6 scenarios or VU IDs. See [`docs/RECIPES.md`](../../docs/RECIPES.md#add-a-new-flow).
