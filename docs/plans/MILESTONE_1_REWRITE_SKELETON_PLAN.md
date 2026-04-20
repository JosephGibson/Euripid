---
name: M1 — Rewrite Skeleton
source: docs/plans/EURIPID_PLAN.md §11
depends_on: M0 (complete — docs/plans/archive/MILESTONE_0_CORE_ARCHITECTURE_LOCK_PLAN.md)
blocks: M2 (Shared Harness Runtime), M3 (Template Project Stub)
exit_criterion: "A new user can locate harness code vs project code without explanation."
---

# M1 — Rewrite Skeleton

## 1. Scope

Stand up toolchain, harness skeleton, template-project skeleton, orchestrator, and Windows k6 binary resolution. No runtime bodies; M2 fills those in.

**In scope:** directory shapes, typed public surface, stable lint boundary, orchestrator parameter contract, `project.config.json` schema, Windows `k6.exe` auto-download.
**Out of scope:** working assertions/transactions/metrics/logging bodies, real reporting output, multi-project orchestration, onboarding docs beyond `README.md` stubs.

## 2. Hard constraints (enforced)

| # | Rule | Enforcement mechanism |
|---|---|---|
| C1 | TypeScript only for harness + project code | `tsconfig.include`, `npm run typecheck` |
| C2 | No Node APIs in scenario / page / flow / harness runtime code | ESLint `no-restricted-imports` on `^node:`, `fs`, `path`, `os`, `child_process`, `http`, `https`, `stream`, `process`, `playwright` |
| C3 | One scenario per file | Review gate; not lint-enforceable at M1 |
| C4 | `open()` + `SharedArray` at module top-level only | Review gate |
| C5 | Artifact writes honor `RUN_OUTPUT_DIR` | Orchestrator sets env; harness writes relative to it |
| C6 | `project → harness` only; no `project A → project B`; no `harness → project` | ESLint path restrictions |
| C7 | Project public surface = `harness/index.ts`, `harness/data.ts`, `harness/types.ts` | ESLint ban on `harness/runtime/**`, `harness/vendor/**`, `harness/reporting/**`, `harness/types/**` from `projects/**` |

## 3. Target layout

```text
/.gitignore                  # ignores bin/k6, bin/k6.exe, node_modules/, projects/*/results/*/
/package.json                # type=module, devDeps only
/tsconfig.json
/eslint.config.js            # flat config
/.prettierrc(.json)?
/bin/                        # gitignored contents
  k6                         # posix, user-supplied
  k6.exe                     # windows, auto-downloaded
/harness/
  index.ts                   # runtime + reporting public re-exports
  data.ts                    # SharedArray loader public re-export
  types.ts                   # type-only re-export
  runtime/
    config.ts                # project config + profile load/validate
    data.ts                  # SharedArray CSV loader
    assertions.ts            # M2 stub
    transactions.ts          # M2 stub
    metrics.ts               # M2 stub
    logging.ts               # M2 stub
    page-core/BasePage.ts    # M2 stub
  reporting/summary.ts       # handleSummary stub returning {}
  vendor/                    # vendored k6-safe helpers (lint-ignored)
  types/
    index.ts
    project-config.ts
    browser.ts
/projects/
  template-project/
    project.config.json      # dev, staging, self-test minimum
    profiles/smoke.json
    pages/.gitkeep
    flows/.gitkeep
    scenarios/Sc01_self_test.ts
    data/users.csv           # dummy data only
    results/.gitkeep
    metrics.ts               # `export {};`
    README.md
/scripts/
  run.ps1                    # primary orchestrator
  run.sh                     # posix wrapper
/docs/
  plans/EURIPID_PLAN.md
```

## 4. Tasks

### T1 — `package.json`

```json
{
  "type": "module",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint harness/ projects/",
    "lint:fix": "eslint harness/ projects/ --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "typescript": "^6",
    "@types/k6": "^1.7",
    "eslint": "^9",
    "typescript-eslint": "^8",
    "eslint-config-prettier": "^9",
    "prettier": "^3"
  }
}
```

No runtime `dependencies`. k6 is the runtime.

**Verify:** `npm install` exits 0.

### T2 — `tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2021"],
    "types": ["k6"],
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": ["harness/**/*", "projects/**/*"]
}
```

**Verify:** `npm run typecheck` → 0 errors.

### T3 — `eslint.config.js` (flat)

Base: `typescript-eslint` recommended + `eslint-config-prettier`. Ignore `harness/vendor/**`, `node_modules/**`, `projects/*/results/**`.

Rules required for M1:

| Scope | Rule | Enforces |
|---|---|---|
| All | `no-restricted-imports` banning `playwright`, `/^node:/`, `fs`, `path`, `os`, `child_process`, `http`, `https`, `stream`, `process` | C2 |
| `projects/**/*.ts` | `no-restricted-imports` banning `harness/runtime/**`, `harness/vendor/**`, `harness/reporting/**`, `harness/types/**` | C6, C7 |
| `projects/*/**/*.ts` | `no-restricted-imports` banning `projects/!(self)/**` (cross-project) | C6 |
| All | `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'` | Cleanliness |

**Verify:**

```bash
npm run lint                                        # 0 errors on clean tree
cat > projects/template-project/_bad.ts <<'EOF'
import '../../harness/runtime/config.ts';
EOF
npm run lint && echo FAIL || echo OK                # must print OK
rm projects/template-project/_bad.ts
```

### T4 — Harness skeleton

- `harness/types/project-config.ts` — define every type consumed by M2+ runtime (signatures stable, not bodies): `EuripidLogLevel`, `EuripidTimeouts`, `EuripidLoggingConfig`, `EuripidEnvironment`, `ProjectMetadata`, `ProjectConfig`, `ProfileExecutor` (union of k6 executor names), `ProfileStage`, `ProfileConfig`, `DatasetRow`, `SummaryMetric`, `SummaryDataShape`, `PageContext`, `ScenarioLogContext`, `FlowContext`.
- `harness/types/browser.ts` — `BrowserPageLike` used by `PageContext`.
- `harness/types/index.ts` — aggregate re-export.
- `harness/runtime/*.ts` — export named functions with signatures; body = `throw new Error('M2')`.
- `harness/runtime/page-core/BasePage.ts` — abstract class with `constructor(ctx: PageContext)` and `abstract ready(): Promise<void>`.
- `harness/reporting/summary.ts` — `export function handleSummary(_: SummaryDataShape) { return {}; }`.
- `harness/index.ts` — named re-exports from `runtime/*` and `reporting/summary.ts`.
- `harness/data.ts` — re-export `rowForVU` stub.
- `harness/types.ts` — `export type * from './types/index.ts';`.

**Verify:** `npm run typecheck && npm run lint` → 0 errors.

### T5 — `project.config.json` schema

Authoritative TypeScript source: `harness/types/project-config.ts`.

```ts
interface ProjectConfig {
  project: { key: string; name: string; description?: string; defaultDataFile?: string };
  environments: Record<string, EuripidEnvironment>;
}

interface EuripidEnvironment {
  name: string;                 // required; SHOULD equal the record key
  baseUrl: string;              // required
  timeouts: {
    navigation: number;         // ms, required
    action: number;             // ms, required
    assertion?: number;         // ms
  };
  description?: string;
  authUrl?: string;
  apiUrl?: string;
  tenantId?: string;
  logging?: EuripidLoggingConfig;
  [key: string]: unknown;       // project-specific passthrough
}
```

Runtime validator in `harness/runtime/config.ts` (M1 body acceptable):

- Reads `PROJECT_CONFIG_FILE` via `open()` at init.
- Fails fast when any of these are missing: `project.key`, non-empty `environments`, `environments[ENVIRONMENT]`, that env's `baseUrl`, `timeouts.navigation`, `timeouts.action`.
- Warns when `environments[k].name !== k`.

Reserved key: `self-test` MUST exist in `projects/template-project/project.config.json`.

### T6 — `projects/template-project/`

| File | Content |
|---|---|
| `project.config.json` | `project.key = "template-project"`, `defaultDataFile = "users.csv"`. `environments` includes at minimum `dev`, `staging`, `self-test`. `self-test.baseUrl` points at a zero-auth public target (e.g. `https://quickpizza.grafana.com`). |
| `profiles/smoke.json` | `{ "executor": "shared-iterations", "vus": 1, "iterations": 1, "maxDuration": "30s" }` |
| `data/users.csv` | Header + 2–3 rows; first line of file must mark it as dummy data. |
| `scenarios/Sc01_self_test.ts` | Imports only from `harness/index.ts` + `harness/types.ts`. Exports `options` (via harness `buildOptions`) and a default async iteration that navigates `environment.baseUrl`, runs one `check`, and exports `handleSummary`. |
| `metrics.ts` | `export {};` |
| `pages/.gitkeep`, `flows/.gitkeep`, `results/.gitkeep` | empty |
| `README.md` | One paragraph: copy this directory to `projects/<new>/` and edit. |

**Verify:** `npm run typecheck && npm run lint` → 0 errors.

### T7 — `scripts/run.ps1`

Parameter surface (authoritative; additional flags like `-RunName`, `-NoBanner`, `-NoZip`, `-Quiet`, `-LogLevel` are permitted but not required at M1):

| Flag | Type | Required | Resolves to |
|---|---|---|---|
| `-Project` | string | yes | `projects/<Project>/` directory |
| `-Scenario` | string | yes | `projects/<Project>/scenarios/<Scenario>.ts` |
| `-Environment` | string | yes | key in `project.config.json.environments` |
| `-Profile` | string | yes | `projects/<Project>/profiles/<Profile>.json` |
| `-DataFile` | string | no | `projects/<Project>/data/<DataFile>` (defaults to `project.defaultDataFile`) |
| `-Validate` | switch | no | resolve + emit JSON; skip k6 invocation |
| `-ForceDownloadK6` | switch | no | re-fetch Windows binary |

Env vars passed to k6 invocation:

- `PROJECT`, `ENVIRONMENT`
- `PROJECT_CONFIG_FILE`, `PROFILE_FILE` (absolute paths)
- `DATA_FILE` (absolute path, optional)
- `RUN_OUTPUT_DIR` — timestamped directory under `projects/<Project>/results/`

Binary resolution order:

| Platform | Order |
|---|---|
| Windows | `./bin/k6.exe` → `k6` on PATH → (T9 auto-download) |
| Posix | `./bin/k6` → `k6` on PATH |

`-Validate` output: JSON object with keys `project`, `scenario`, `environment`, `profile`, `projectConfigFile`, `profileFile`, `scenarioFile`, `dataFile`, `runOutputDir`, `k6Binary`. Every path absolute.

Fail before k6 invocation when: project dir missing, scenario file missing, profile file missing, environment key absent, binary unresolved.

### T8 — `scripts/run.sh`

- Accepts the same flag names as `run.ps1` (`-Project value` form).
- Binary resolution: `./bin/k6` → `k6` on PATH. No auto-download.
- Emits the same env vars as T7.
- Exits non-zero with actionable message on missing binary or path.

### T9 — Windows `k6.exe` auto-resolution (inside `run.ps1`)

Trigger: `$IsWindows` AND (`bin/k6.exe` missing OR `-ForceDownloadK6`).

Procedure:

1. `GET https://api.github.com/repos/grafana/k6/releases/latest`.
2. Select asset matching `*windows-<arch>.zip` where `<arch> = amd64` unless `$env:PROCESSOR_ARCHITECTURE -eq 'ARM64'` → `arm64`.
3. Download to `$env:TEMP`, `Expand-Archive`, move `k6.exe` into `bin/k6.exe`.
4. Reuse cached `bin/k6.exe` on subsequent runs.
5. `-Validate` surfaces the resolved path under `k6Binary`.

Failure handling (distinct messages, each pointing at manual `bin/k6.exe` placement):

| Condition | Message must mention |
|---|---|
| HTTP 403 / rate-limit | "GitHub rate-limited; place k6.exe at bin/k6.exe manually" |
| Network unreachable | "Offline; place k6.exe at bin/k6.exe manually" |
| Asset not found / archive malformed | "Unexpected release layout; place k6.exe at bin/k6.exe manually" |

`.gitignore` MUST list `bin/k6` and `bin/k6.exe`.

### T10 — Smoke validation

```bash
./scripts/run.ps1 -Validate -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke
./scripts/run.sh         -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke
./scripts/run.ps1        -Project template-project -Scenario Sc01_self_test -Environment self-test -Profile smoke  # on Windows
```

All exit 0. The two non-validate runs create `projects/template-project/results/<stamp>/` with ≥1 artifact.

## 5. Acceptance gates

| ID | Gate | Check |
|---|---|---|
| G1 | Typecheck clean | `npm run typecheck` → 0 errors |
| G2 | Lint clean | `npm run lint` → 0 errors |
| G3 | Import boundary enforced | Fixture test in T3 passes |
| G4 | Dry-run resolves | T7 `-Validate` JSON contains all required keys, all paths absolute |
| G5 | Posix smoke green | T10 `run.sh` → exit 0, artifact present |
| G6 | Windows smoke green | T10 `run.ps1` on clean Windows checkout → auto-downloads `bin/k6.exe`, runs end-to-end |
| G7 | Fail-fast on bad input | Missing `-Profile`, unknown scenario, unknown env key each error before k6 invocation |
| G8 | Layout discoverable | `AGENTS.md`, root `README.md`, `projects/template-project/README.md` each state: harness in `harness/`, project code in `projects/<name>/`, copy template to start |
| G9 | Legacy layout absent | `config/`, `data/`, `src/`, top-level `results/` do not exist |

## 6. Out of scope (deferred)

| Item | Deferred to |
|---|---|
| Real `assertions.ts`, `transactions.ts`, `metrics.ts`, `logging.ts`, `config.ts`, `data.ts`, `BasePage.ts` bodies | M2 |
| HTML/JSON report generation in `handleSummary` | M2 / M4 |
| Additional scenarios (`Sc02_*`, browser login, etc.) | M3 |
| Cross-project orchestration + report aggregation | M4 |
| Full `docs/RECIPES.md`, release packaging, CI | M5 |

## 7. Risk register

| Risk | Mitigation |
|---|---|
| `projects/**` deep-imports `harness/runtime/**` | T3 lint rule + G3 fixture test |
| `.ts` executes under k6 while typecheck fails silently | `npm run typecheck` gated in contributor flow; CI enforcement in M5 |
| `bin/k6.exe` auto-download flaky (GitHub API) | Manual fallback + distinct T9 error messages |
| Legacy `config/` / `data/` / `src/` linger | G9 blocks completion |
| `EuripidEnvironment` passthrough (`[k: string]: unknown`) drifts | Audit at M2 when first runtime consumer lands |
| ESLint rule set diverges from constraints in §2 | G3 fixture test + periodic re-check against the C1–C7 table |

## 8. Artifacts produced

- `package.json`, `tsconfig.json`, `eslint.config.js`, `.prettierrc*`, `.gitignore`
- `harness/` skeleton with stable public surface (`index.ts`, `data.ts`, `types.ts`) and M2 stubs
- `projects/template-project/` runnable against `self-test`
- `scripts/run.ps1`, `scripts/run.sh`
- `bin/k6` (posix, user-supplied, gitignored), `bin/k6.exe` (runtime-acquired, gitignored)
- `AGENTS.md`, root `README.md`, `projects/template-project/README.md` aligned with layout

## 9. Reference files in current repo

| Concern | File |
|---|---|
| Public harness surface | [`harness/index.ts`](../../harness/index.ts), [`harness/data.ts`](../../harness/data.ts), [`harness/types.ts`](../../harness/types.ts) |
| Schema | [`harness/types/project-config.ts`](../../harness/types/project-config.ts) |
| Template config | [`projects/template-project/project.config.json`](../../projects/template-project/project.config.json) |
| Template scenario | [`projects/template-project/scenarios/Sc01_self_test.ts`](../../projects/template-project/scenarios/Sc01_self_test.ts) |
| Orchestrator | [`scripts/run.ps1`](../../scripts/run.ps1), [`scripts/run.sh`](../../scripts/run.sh) |
| Agent contract | [`AGENTS.md`](../../AGENTS.md) |
