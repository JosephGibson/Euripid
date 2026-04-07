# Euripid

**v1.0.5** — k6 + `k6/browser` performance testing template with a Page Object Model layout, JSON-driven config, CSV-driven VU data, and a PowerShell orchestrator that packages every run into a timestamped zip.

> **Humans:** start at [`docs/USAGE.md`](docs/USAGE.md) for the CLI tour and flag reference.
> **AI agents:** start at [`AGENTS.md`](AGENTS.md). Extension recipes live in [`docs/RECIPES.md`](docs/RECIPES.md). Each top-level directory has a one-paragraph `README.md` for orientation.

## Status

v1.0 is **Windows-first**. `scripts/run.ps1` is written in cross-OS pwsh and runs on Linux/macOS, but no `run.sh` ships in v1.0. See [`CHANGELOG.md`](CHANGELOG.md) for the full v1.0 scope and known limitations.

## Why k6/browser instead of Playwright

Real Playwright cannot run inside a k6 VU — k6 executes JS on its own Goja runtime, not Node. `k6/browser` is a Chromium automation module with a Playwright-shaped API that runs as a first-class k6 protocol, so browser timings (LCP, FCP, etc.) flow into the same metrics stream as your checks and thresholds. Tradeoff: Chromium-only, API lags real Playwright. If you ever need true Playwright (functional regression, cross-browser, traces), run it as a separate sibling suite.

## Layout

```
config/         JSON: environments + load profiles
data/           CSV: per-VU fan-out data (users, payloads)
src/pages/      POM page classes (BasePage, LoginPage, ...)
src/flows/      Composed user journeys built from POM
src/lib/        config loader, CSV/SharedArray loader, custom metrics, summary writer
src/scenarios/  k6 entry points (one scenario per run)
scripts/        run.ps1 orchestrator
results/        per-run zips + loose run dirs (gitignored)
bin/            bundled k6.exe on Windows (gitignored on *nix)
docs/           RECIPES.md and other agent/human docs
```

## Using this template

Euripid is consumed as a **clone-and-modify template**, not a dependency.

1. Clone or fork the repo into your project workspace.
2. Drop `k6.exe` into `bin/` (Windows) or install k6 on PATH.
3. Verify the toolchain end-to-end with no setup:
   ```powershell
   ./scripts/run.ps1 -Scenario self-test -Environment self-test -Profile smoke
   ```
   This runs against `quickpizza.grafana.com` (k6's public demo target). If the zip lands in `results/`, you're good.
4. Walk through your **first scripted test** (dummy "Acme Pizza Co." project, heavily commented):
   ```powershell
   ./scripts/run.ps1 -Scenario first-test-tutorial -Environment example-tutorial -Profile smoke
   ```
   Open `src/scenarios/first-test-tutorial.js` and read it top-to-bottom — it explains imports, options, transactions, checks, and what to change for a real app.
5. Add your environments under `config/environments/` and load profiles under `config/profiles/`.
6. Add page objects in `src/pages/` and compose them into flows in `src/flows/`.
7. Add a scenario file in `src/scenarios/` that wires it together (or copy `first-test-tutorial.js`).

Recipes for each step live in [`docs/RECIPES.md`](docs/RECIPES.md).

## Running

```powershell
./scripts/run.ps1 -Scenario browser-login -Environment staging -Profile load
```

Optional `-DataFile users.csv` and `-RunName release-123`.

The orchestrator:
1. Resolves k6 from `bin/k6.exe` on Windows or PATH on Linux/macOS.
2. Creates `results/<runId>/` and snapshots the resolved env JSON, profile JSON, and data CSV into it.
3. Invokes k6 with `RUN_OUTPUT_DIR` set so the scenario's `handleSummary` and `BasePage.screenshot` write directly into the per-run dir — parallel runs are race-free.
4. Streams raw events to `<runId>/k6-stream.json`.
5. Packages everything into `results/<runId>.zip`.

## Auth

`LoginPage` is intentionally generic form-login. Override `LoginPage.SELECTORS` or subclass per project. For OIDC/SSO/token flows, replace the page object with a one-time setup hook that mints a token and seeds storage state.

## License

MIT. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE) (the latter covers the bundled k6 binary if you redistribute the repo with `bin/k6.exe` populated).
