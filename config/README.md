# config/

Static-per-run JSON. `environments/` holds URLs, auth endpoints, timeouts — one file per target environment, identical schema across files. `profiles/` holds k6 load shapes — VUs, stages, thresholds. Filenames (without `.json`) are what `-Environment` and `-Profile` take in `run.ps1`. Schemas: see [`docs/RECIPES.md`](../docs/RECIPES.md#add-a-new-environment).

**Tutorial:** `environments/example-tutorial.json` is a copy-paste-friendly dummy project (QuickPizza demo URL) paired with [`src/scenarios/first-test-tutorial.js`](../src/scenarios/first-test-tutorial.js).
