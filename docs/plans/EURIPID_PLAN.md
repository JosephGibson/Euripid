# Euripid - Core Rewrite Plan

> **Document status:** Historical planning record
> **Document purpose:** Archived rewrite plan describing how Euripid moved from the legacy v0.1 layout into the current TypeScript-first, template-project-based k6/browser framework.
> **Audience:** Implementation agents and the project lead.
> **Scope:** Product direction, locked architectural decisions, constraints, target structure, and milestone sequencing during the rewrite period.
> **Note:** References below to top-level `config/`, `data/`, `src/`, and `results/` describe the legacy baseline that has since been removed from the repo.

---

## 1. Executive Direction

The plan is now explicitly a **full rewrite**, not an incremental hardening pass.

These decisions are now locked:

1. **Rewrite from the start**
   - The current v0.1 repo is reference material, not a compatibility contract.
   - We are allowed to replace the current structure wholesale once the new structure is ready.

2. **TypeScript is mandatory**
   - Euripid will be authored in TypeScript.
   - JavaScript is no longer the target authoring language for the rewritten framework.

3. **Shared harness + isolated project directories**
   - Repo-level harness code remains shared.
   - Every testing project lives in its own self-contained directory and must not depend on any sibling project.

4. **Template-project onboarding**
   - A new user should clone the repo, copy one template project folder, rename it, and begin authoring.

5. **k6/browser remains the execution model**
   - This is still a k6/browser framework, not Playwright, not Node browser automation, and not a general-purpose test runner.

This document supersedes the earlier incremental-plan framing.

---

## 2. Current Baseline

The current v0.1 alpha repo is still useful, but now mainly as input to the rewrite.

### 2.1 What Exists Today

- top-level `config/`, `data/`, and `src/` directories
- shared runtime helpers in `src/lib/`
- page objects in `src/pages/`
- flows in `src/flows/`
- scenarios in `src/scenarios/`
- shared vendored runtime helpers in `src/vendor/`
- PowerShell orchestration in `scripts/run.ps1`
- sample/tutorial scenarios such as `self-test`, `first-test-tutorial`, `browser-login`, and `google-example`

### 2.2 What We Intend to Preserve

We want to preserve the useful ideas, not necessarily the file layout:

- k6 init-context discipline
- `SharedArray` data-loading discipline
- `RUN_OUTPUT_DIR` output isolation
- shared reporting hooks
- browser performance focus
- page-object-oriented authoring
- low-friction onboarding

### 2.3 What We Are No Longer Preserving

The rewrite does **not** promise compatibility with:

- the current top-level `config/` layout
- the current top-level `data/` layout
- the current top-level `src/pages`, `src/flows`, and `src/scenarios` layout
- the current JavaScript-first authoring model
- the current “everything lives under one shared `src/` tree” structure

---

## 3. Locked Product Model

### 3.1 What Euripid Will Be

Euripid will be a repository containing:

1. a **shared harness**
   - runtime primitives
   - orchestration
   - reporting
   - shared tooling

2. one or more **self-contained testing-project directories**
   - each project owns its own pages, scenarios, data, profiles, results, and project config

3. a **template project folder**
   - the canonical bootstrap starting point for new users
   - it is also the initial committed validation project during the rewrite

### 3.2 What “Self-Contained Project” Means

A project directory may depend on:

- its own files
- approved shared harness entrypoints

A project directory may **not** depend on:

- files from another project directory
- ad hoc parent-level feature code outside the shared harness
- shared app-specific test assets stored in random top-level directories

In short:

- **project -> harness** is allowed
- **project A -> project B** is forbidden
- **harness -> specific project** is forbidden

### 3.3 New-User Workflow

The intended user journey is:

1. clone the repo
2. copy `projects/template-project/` to `projects/<new-project-name>/`
3. edit the copied project's pages, scenarios, data, profiles, and `project.config.json`
4. choose an environment variant defined inside `project.config.json`
5. run the harness against that project

If that workflow is not smooth, the rewrite has missed its main goal.

---

## 4. Locked Technical Direction

### 4.1 Language and Tooling

These are now locked:

- **Language:** TypeScript
- **k6 runtime:** `k6` + `k6/browser`
- **Windows k6 distribution:** a downloaded `k6.exe` binary sourced from the latest Grafana k6 GitHub release
- **Browser:** Chromium-based browser
- **Authoring support:** TypeScript-aware editor/tooling
- **Dev-time toolchain:** Node-based tooling is now acceptable and expected

This is a meaningful change from the current repo constraints. The rewrite assumes a TypeScript-capable dev toolchain rather than a JS-only, no-package authoring model.

Operational implication:

- the Windows execution path should call a downloaded `k6.exe`
- the plan does not assume `k6` is globally installed via a package manager
- the default source of truth for the binary is the latest upstream Grafana k6 GitHub release

### 4.2 Why TypeScript Is Locked

TypeScript is no longer optional because the rewrite wants:

- stronger contracts at project/harness boundaries
- clearer interfaces for pages, scenarios, locators, and config
- safer refactors during the rewrite
- better onboarding for users working inside a template project

### 4.3 Practical TypeScript Constraint

k6 can run `.ts` files directly, but official k6 docs also state that TypeScript support is **partial**: k6 transpiles `.ts` files with esbuild and strips type information rather than providing full type safety.

Implication for Euripid:

- TypeScript authoring is locked
- a **real type-check step** must exist in the dev toolchain
- “k6 can run `.ts`” is not enough by itself to satisfy the TypeScript goal

The rewrite therefore assumes a TypeScript toolchain that includes type checking, not just transpilation.

### 4.4 Shared Harness Boundary

The shared harness will contain:

- base runtime primitives
- page-core primitives such as `BasePage`, locator/page contracts, and other non-app-specific abstractions
- assertions
- metrics
- transaction helpers
- config loading conventions
- reporting
- orchestration
- vendored k6-safe helper code

Project directories will contain:

- project config
- profiles
- concrete app-specific pages
- scenarios
- project data
- project-local results

Concrete rule:

- the harness may define **page primitives**
- projects define **concrete page objects**
- no app-specific page objects belong in the harness

### 4.5 Rewrite Supersession Rule

The current v0.1 repo instructions still describe a no-`package.json`, no-npm, JavaScript-first world.

For rewrite work, this plan supersedes those legacy constraints from **M1 onward**.

That means:

- adding `package.json` is expected during the rewrite
- Node-based dev tooling is expected during the rewrite
- TypeScript-first authoring is authoritative for the rewrite

Those older constraints remain relevant only when maintaining the legacy v0.1 layout during the transition window.

---

## 5. Non-Negotiable k6 Constraints

These remain hard constraints even under the rewrite.

| Constraint | Implication |
|---|---|
| **Not Playwright** | Do not import the npm `playwright` package into runtime code. Browser automation still happens through `k6/browser`. |
| **Init-context file IO rules still apply** | `open()` remains init-context-only; project layout must respect this. |
| **Shared datasets still use `SharedArray`** | Self-contained projects do not change the need to avoid per-VU reparsing. |
| **Browser scenarios still need Chromium config** | The harness must continue to emit k6 browser scenario options correctly. |
| **k6 runtime code is not Node runtime code** | TypeScript does not make Node APIs available inside scenario/page runtime code. |
| **Output paths must remain run-isolated** | New project layout must still honor per-run output directories. |
| **Metric cardinality must remain bounded** | Per-project isolation must not turn into tag explosion. |
| **Browser scale must be benchmarked, not assumed** | Rewriting the framework does not remove browser resource cost. |

---

## 6. Target Repository Shape

The rewrite target is a repo that looks conceptually like this:

```text
/docs/
/scripts/
  run.ps1
  report.ps1                # optional
/harness/
  /runtime/
    assertions/
    config/
    data/
    logging/
    metrics/
    page-core/
    transactions/
  /reporting/
  /vendor/
  /types/
  /tooling/
/projects/
  /template-project/
    project.config.json
    /profiles/
    /pages/
    /scenarios/
    /data/
    /results/
/package.json
/tsconfig.json
```

### 6.1 Structure Principles

- `harness/` is the only shared implementation area
- `projects/` contains isolated test projects
- `template-project/` is the bootstrap source for new users
- `template-project/` is also the initial committed harness-validation project
- each project has its own `project.config.json`, `profiles/`, `pages/`, `scenarios/`, `data/`, and `results/`
- project-level results live with the project, not in a global mixed pool
- only `template-project/` needs to be committed initially; future user projects are copies of that template

### 6.2 What Disappears From the Current Shape

The rewrite should plan for removal or relocation of:

- top-level `config/`
- top-level `data/`
- top-level project-specific `src/pages`
- top-level project-specific `src/scenarios`

Those responsibilities move into project directories.

---

## 7. Project Directory Contract

Every project directory must be understandable on its own.

### 7.1 Required Contents

Each project should include, at minimum:

- `project.config.json`
- `profiles/`
- `pages/`
- `scenarios/`
- `data/`
- `results/`

`project.config.json` is now the canonical home for project-scoped configuration, including named environment variants, environment variables, target URLs, and other project-level settings that used to be spread across separate config folders.

### 7.2 Environment Model

Projects do **not** get a separate `environments/` directory.

Instead, each `project.config.json` must contain a named environment map, for example:

- `dev`
- `staging`
- `prod`
- `self-test`

Implications:

- environment selection still exists as a first-class runtime concept
- environment definitions live inside `project.config.json`
- profiles stay in `profiles/`
- project structure stays as small as possible

Recommended rule:

- `project.config.json` owns target/system-specific configuration
- `profiles/` owns load-shape/execution configuration

### 7.3 Project Isolation Rules

- No imports from sibling projects
- No shared project data outside the project directory
- No shared project pages/scenarios outside the project directory
- If a utility is genuinely shared, move it into the harness

### 7.4 Harness Import Policy

Projects must consume shared functionality through stable harness entrypoints.

The exact import-resolution mechanism may be:

- stable relative imports into the harness, or
- approved TypeScript/build aliases

But whichever mechanism we choose, it must make the boundary obvious and stable.

The important lock is architectural, not syntactic:

- projects can use the harness
- projects cannot reach through arbitrary internal repo paths

---

## 8. Runtime and Orchestration Model

### 8.1 Shared Harness Responsibilities

The harness owns:

- TypeScript type contracts
- runtime-safe helpers
- config parsing conventions
- CSV/data loading conventions
- metrics and transactions
- summary/report generation
- orchestration entrypoints
- project discovery and execution
- acquisition/resolution rules for the downloaded `k6.exe` binary on Windows

### 8.2 Project Responsibilities

Each project owns:

- app-specific pages
- runnable scenarios
- profiles
- project-scoped configuration in `project.config.json`, including named environments
- project data
- project-local results

### 8.3 Proposed Run Interface

The shared harness should move toward a project-aware run command such as:

```powershell
./scripts/run.ps1 -Project project01 -Scenario login -Environment staging -Profile smoke
```

This is a planning target, not a requirement to preserve the current CLI shape.

Execution assumption:

- on Windows, the harness should call the downloaded `k6.exe` binary rather than assuming a system-installed `k6`
- that binary should track the latest Grafana k6 GitHub release unless the project lead later chooses to pin a specific version

### 8.4 Reporting

The harness remains responsible for reporting and output packaging.

Per-project isolation changes **where source files live**, not who owns:

- summary generation
- artifact packaging
- screenshot placement rules
- run directory conventions

During the rewrite, the committed harness-validation path should live inside `template-project/`, not in a separate example project.

---

## 9. TypeScript Implementation Strategy

### 9.1 Authoring Strategy

The rewrite should assume:

- `.ts` source files throughout the harness and projects
- shared TypeScript configuration
- editor/type-definition support for k6 APIs
- explicit type-checking in CI/dev workflows

### 9.2 Runtime Strategy

k6 remains the runtime for scenario execution.

That means:

- runtime code still obeys k6 module/runtime limitations
- TypeScript does not imply Node compatibility
- browser code still uses `k6/browser`

### 9.3 Tooling Strategy

The rewrite may introduce:

- `package.json`
- `tsconfig.json`
- `@types/k6`
- linting and formatting config
- type-check scripts
- build or preflight steps if needed for import resolution or packaging

This is now acceptable because TypeScript is a locked decision, not an optional future lane.

---

## 10. Rewrite Strategy

### 10.1 This Is a Big Rewrite

The project is no longer optimizing for backward compatibility with the current JS layout.

Instead, it is optimizing for a cleaner long-term foundation.

### 10.2 What “Rewrite” Means Here

It means we are willing to:

- replace the file layout
- replace the authoring model
- replace the project organization model
- replace the current import boundaries
- replace the current execution interface

It does **not** mean we ignore k6 constraints or discard useful lessons from the current baseline.

### 10.3 Transitional Rule

During the rewrite, the current repo may temporarily contain both:

- legacy v0.1 structures, and
- new rewrite structures

But the end goal is not dual-support. The end goal is for the rewrite structure to become the only supported structure.

---

## 11. Milestones

### M0 - Core Architecture Lock

Status:

- Completed
- Archived record: `docs/plans/archive/MILESTONE_0_CORE_ARCHITECTURE_LOCK_PLAN.md`

Purpose:

- finalize the rewrite decisions
- lock the target structure
- stop debating JavaScript vs TypeScript
- stop debating shared-harness vs isolated-project architecture

Deliverables:

- this plan accepted
- target repo structure accepted
- project directory contract accepted
- TypeScript/tooling direction accepted
- run-command direction accepted

Exit criteria:

- there is no remaining ambiguity about the intended end-state architecture

### M1 - Rewrite Skeleton

Purpose:

- create the new repo skeleton
- establish `harness/` and `projects/`
- create `projects/template-project/`
- create the TypeScript toolchain scaffolding

Deliverables:

- `package.json`
- `tsconfig.json`
- initial harness directory structure
- initial template-project directory structure
- initial project-aware run command design
- explicit schema shape for `project.config.json`, including named environments
- binary resolution strategy for the downloaded `k6.exe` on Windows

Exit criteria:

- a new user can see where harness code lives and where project code lives without explanation

### M2 - Shared Harness Runtime

Purpose:

- rebuild the shared runtime layer in TypeScript

Deliverables:

- config primitives
- data primitives
- assertions
- transactions
- metrics
- logging
- shared reporting hooks
- vendored helper strategy for TS rewrite

Exit criteria:

- harness runtime is usable by a project without reaching into legacy JS code

### M3 - Template Project Stub

Purpose:

- prove the new structure is teachable before the full systems are rebuilt

Deliverables:

- `projects/template-project/`
- basic example pages stubbed inside `template-project/`
- basic example scenarios stubbed inside `template-project/`
- one minimal runnable sanity scenario inside `template-project/` for harness validation
- project-local pages/scenarios/config/data shape finalized
- explicit notes marking those examples as temporary stubs until the real systems are remade

Exit criteria:

- a user can copy the template project and understand where to author their own test assets, even if the example internals are still stubbed
- the harness has one committed end-to-end validation target during the rewrite

### M4 - Orchestration and Reporting

Purpose:

- make the shared harness run and report across project directories cleanly

Deliverables:

- project-aware orchestration
- project-aware output packaging
- reporting from the new project structure
- screenshot and artifact rules aligned to projects

Exit criteria:

- the new structure runs end-to-end through the shared harness

### M5 - Documentation and Release Packaging

Purpose:

- make the rewritten repo teachable and distributable

Deliverables:

- onboarding docs for the template-project workflow
- rewrite of usage/recipes docs
- release packaging/strip-ai plan aligned to the new structure
- retirement plan for legacy layout/docs

Exit criteria:

- a new user can clone, copy the template project, and start authoring without reading old-layout docs

---

## 12. Cross-Milestone Acceptance Gates

These rules apply throughout the rewrite:

1. TypeScript remains the authoritative authoring language.
2. Every runnable test asset belongs to exactly one project directory.
3. No project imports from another project.
4. Shared functionality moves into the harness, not into ad hoc top-level folders.
5. k6 runtime code remains free of Node-only assumptions.
6. Output isolation remains intact.
7. The template-project bootstrap workflow stays central.
8. If a design choice makes project copying harder, it is probably the wrong choice.

---

## 13. Risks and Mitigations

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Boundary leakage between projects and harness** | The main architectural goal would be defeated | Enforce project/harness import rules early |
| **TypeScript without real type checking** | Would create the illusion of safety without delivering it | Include an explicit type-check step in the toolchain |
| **Overcomplicated import resolution** | Could make the template-project workflow harder, not easier | Keep boundary rules simple and prove them in the template first |
| **Leaving legacy and rewrite layouts alive too long** | Creates confusion and doubles maintenance cost | Treat legacy layout as transitional only |
| **Breaking k6 runtime constraints during the rewrite** | TypeScript/tooling changes can tempt Node-style mistakes | Keep k6 runtime boundaries explicit in the harness design |
| **Project directories that are only “mostly” self-contained** | New users will still have to learn hidden global structure | Put all app-specific assets in the project directory |

---

## 14. Resolved Implementation Defaults

The rewrite now proceeds with these defaults:

| # | Decision | Applied in |
|---|---|---|
| 1 | Harness imports use explicit relative paths first. | M1 / M2 |
| 2 | `scripts/run.ps1` remains the primary orchestration surface. | M1 / M4 |

---

## 15. Final Planning Stance

Euripid is now planning toward this end state:

1. a **TypeScript-first** k6/browser framework
2. a **shared repo-level harness**
3. **self-contained project directories** under a common projects root
4. a **template project** that users copy to bootstrap their own work
5. a **full rewrite** that uses the current alpha as reference input, not as a structure to preserve

That is the new center of gravity for all future planning.
