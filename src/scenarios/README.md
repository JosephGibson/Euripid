# scenarios/

k6 entry points. One scenario per file, one scenario per run. Each file imports `config.js` at init context (and `data.js` when the flow uses CSV), exports `options` from `buildOptions()`, runs a flow inside `default`, and re-exports `handleSummary` so the orchestrator captures HTML + JSON artifacts. Filename (without `.js`) is what `-Scenario` takes in `run.ps1`. See [`docs/RECIPES.md`](../../docs/RECIPES.md#add-a-new-scenario).

**New to Euripid?** Start with **`first-test-tutorial.js`** — a dummy "Acme Pizza Co." walkthrough with extensive in-file documentation (`-Environment example-tutorial -Profile smoke`).
