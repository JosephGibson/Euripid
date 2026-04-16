# Euripid

TypeScript-first k6 + `k6/browser` performance framework with a shared harness and copyable project directories.

> Humans: start at [`docs/USAGE.md`](docs/USAGE.md).
> AI agents: start at [`AGENTS.md`](AGENTS.md).

## Status

`0.1.0` is the initial alpha release of the new TypeScript-first `harness/` + `projects/` model. The old top-level `config/`, `data/`, and `src/` trees remain in the repo only as transition/reference material until retirement.

## Why k6/browser instead of Playwright

Real Playwright cannot run inside a k6 VU. k6 executes JavaScript on its own runtime, not Node, so browser automation here still happens through `k6/browser`. That keeps browser timings, checks, thresholds, and Web Vitals in the same k6 run instead of splitting them across multiple tools.

## New Layout

```text
harness/                    shared TypeScript runtime, reporting, types, vendor helpers
projects/
  template-project/         canonical bootstrap project and committed validation target
scripts/run.ps1             project-aware orchestrator
docs/                       usage, recipes, and planning docs

legacy reference only:
config/ data/ src/
```

## Quick Start

1. Install Node dependencies:
   ```bash
   npm install
   ```
2. Make k6 available:
   - Windows: `scripts/run.ps1` will download the latest Grafana `k6.exe` into `bin/` if it is missing.
   - Linux/macOS: install `k6` on PATH or place a `k6` binary at `bin/k6`, and use PowerShell 7 (`pwsh`) to run the orchestrator.
3. Run the committed end-to-end validation project:
   ```powershell
   ./scripts/run.ps1 -Project template-project -Scenario self-test -Environment self-test -Profile smoke
   ```
4. Read the tutorial scenario:
   [projects/template-project/scenarios/first-test-tutorial.ts](/home/joker/Projects/Euripid/projects/template-project/scenarios/first-test-tutorial.ts)

Out of the box, the committed runnable paths are `self-test` and `first-test-tutorial`, which target Grafana's public QuickPizza demo. The `browser-login` sample is a template for copied projects and still expects a real application-specific environment.

## Working Model

- Shared framework code lives in `harness/`.
- App-specific code lives inside one project directory under `projects/`.
- Projects may import only the stable harness entrypoints:
  `harness/index.ts`, `harness/data.ts`, and `harness/types.ts`.
- Projects must not import from sibling projects.
- `project.config.json` owns project metadata and named environment variants.
- `profiles/` remains project-local JSON for load shapes and thresholds.
- `RUN_OUTPUT_DIR` still governs artifact placement, but outputs now live under `projects/<project>/results/`.

## Notes On Transactions

The transaction helpers (`withTransaction`, `withNavigation`, `withUserAction`, `withPageLoad`) still provide named timing boundaries and tagged Trend metrics. On current k6, async browser callbacks cannot be wrapped with `k6/group()`, so these helpers intentionally record metric rows instead of relying on async group nesting.

## Legacy Tree

The legacy top-level `config/`, `data/`, and `src/` directories are still present so the rewrite can be compared against the previous baseline. New work should go into `harness/` and `projects/` unless you are explicitly maintaining the old reference implementation.

## License

MIT. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
