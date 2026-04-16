# M0 - Core Architecture Lock Plan

- Status: Completed (Archived)
- Original scope: `M0 - Core Architecture Lock` only
- Source of truth at close-out: `docs/plans/EURIPID_PLAN.md`
- Out of scope: `M1 - Rewrite Skeleton`, `M2 - Shared Harness Runtime`, `M3 - Template Project Stub`, `M4 - Orchestration and Reporting`, `M5 - Documentation and Release Packaging`
- Chosen defaults carried into implementation:
  - Harness imports use explicit relative paths first.
  - `scripts/run.ps1` remains the primary orchestration surface through the rewrite.

<a id="baseline-inputs"></a>
## Baseline Inputs

- Current baseline directories: `config/`, `data/`, `src/`, `results/`, `scripts/`, `docs/`
- Current shared implementation areas: `src/lib/`, `src/pages/`, `src/flows/`, `src/scenarios/`, `src/vendor/`
- Current orchestration entrypoint: `scripts/run.ps1`
- Current sample/tutorial scenarios named in the source plan: `self-test`, `first-test-tutorial`, `browser-login`, `google-example`
- Governing source sections in `docs/plans/EURIPID_PLAN.md`: `1. Executive Direction`, `3. Locked Product Model`, `4. Locked Technical Direction`, `5. Non-Negotiable k6 Constraints`, `6. Target Repository Shape`, `7. Project Directory Contract`, `8. Runtime and Orchestration Model`, `9. TypeScript Implementation Strategy`, `11. Milestones`, `12. Cross-Milestone Acceptance Gates`, `13. Risks and Mitigations`, `14. Resolved Implementation Defaults`

<a id="m0-objective"></a>
## M0 Objective

- Purpose:
  - finalize the rewrite decisions
  - lock the target structure
  - stop debating JavaScript vs TypeScript
  - stop debating shared-harness vs isolated-project architecture
- Deliverables:
  - this plan accepted
  - target repo structure accepted
  - project directory contract accepted
  - TypeScript/tooling direction accepted
  - run-command direction accepted
- Exit criteria:
  - there is no remaining ambiguity about the intended end-state architecture

<a id="work-index"></a>
## Work Index

| ID | Work item | Depends on |
|---|---|---|
| `M0-01` | [Rewrite Supersession Decision](#m0-01-rewrite-supersession-decision) | None |
| `M0-02` | [Shared Harness + Isolated Project Architecture Lock](#m0-02-shared-harness--isolated-project-architecture-lock) | `M0-01` |
| `M0-03` | [Target Repository Shape Lock](#m0-03-target-repository-shape-lock) | `M0-02` |
| `M0-04` | [Project Directory Contract Lock](#m0-04-project-directory-contract-lock) | `M0-02`, `M0-03` |
| `M0-05` | [TypeScript and Tooling Direction Lock](#m0-05-typescript-and-tooling-direction-lock) | `M0-01` |
| `M0-06` | [Run-Command and Orchestration Direction Lock](#m0-06-run-command-and-orchestration-direction-lock) | `M0-03`, `M0-04`, `M0-05` |
| `M0-07` | [Non-Negotiable k6 Constraints and Acceptance Gates Lock](#m0-07-non-negotiable-k6-constraints-and-acceptance-gates-lock) | `M0-02`, `M0-05`, `M0-06` |
| `M0-08` | [Open Questions and Handoff Register](#m0-08-open-questions-and-handoff-register) | `M0-05`, `M0-06` |
| `M0-09` | [Milestone Exit Review](#m0-09-milestone-exit-review) | `M0-01` through `M0-08` |

<a id="m0-01-rewrite-supersession-decision"></a>
## M0-01 Rewrite Supersession Decision

Inputs:
- `docs/plans/EURIPID_PLAN.md` sections `1`, `4.5`, `10`, `11`
- Current baseline shape: `config/`, `data/`, `src/`, `scripts/run.ps1`

Outputs:
- Approved statement that this is a **full rewrite**
- Approved statement that the current v0.1 repo is reference material, not a compatibility contract
- Approved statement that rewrite work supersedes legacy v0.1 constraints from **M1 onward**

Dependencies:
- None

Work:
1. Confirm that the rewrite is the authoritative planning direction.
2. Confirm that legacy v0.1 layout compatibility is not a Milestone 0 requirement.
3. Confirm that the current baseline remains input to the rewrite, not the structure to preserve.

Acceptance criteria:
- The approved Milestone 0 decision set includes `full rewrite`.
- The approved Milestone 0 decision set includes `reference material, not a compatibility contract`.
- The approved Milestone 0 decision set includes `For rewrite work, this plan supersedes those legacy constraints from M1 onward`.
- No Milestone 0 artifact requires compatibility with the current top-level `config/`, `data/`, or shared `src/` tree.

<a id="m0-02-shared-harness--isolated-project-architecture-lock"></a>
## M0-02 Shared Harness + Isolated Project Architecture Lock

Inputs:
- `docs/plans/EURIPID_PLAN.md` sections `3`, `4.4`, `6.1`, `7.3`, `8.1`, `8.2`, `12`, `13`

Outputs:
- Accepted architecture boundary between `harness/` and `projects/`
- Accepted statement that `template-project/` is the canonical bootstrap starting point
- Accepted rule set for `project -> harness`, `project A -> project B`, and `harness -> specific project`

Dependencies:
- `M0-01`

Work:
1. Lock the shared harness as the only shared implementation area.
2. Lock self-contained testing-project directories under `projects/`.
3. Lock `template-project/` as both the canonical bootstrap starting point and the initial committed validation project during the rewrite.
4. Lock the project/harness dependency boundary.

Acceptance criteria:
- The architecture explicitly states: `project -> harness` is allowed.
- The architecture explicitly states: `project A -> project B` is forbidden.
- The architecture explicitly states: `harness -> specific project` is forbidden.
- The architecture explicitly states that concrete app-specific page objects belong in projects, not in the harness.
- The `template-project/` bootstrap workflow remains central.

<a id="m0-03-target-repository-shape-lock"></a>
## M0-03 Target Repository Shape Lock

Inputs:
- `docs/plans/EURIPID_PLAN.md` section `6`
- Current top-level repo shape from `find . -maxdepth 2 -type d`

Outputs:
- Accepted target repo structure rooted at `/docs/`, `/scripts/`, `/harness/`, `/projects/`, `/package.json`, `/tsconfig.json`
- Accepted list of current top-level responsibilities to remove or relocate

Dependencies:
- `M0-02`

Work:
1. Approve the conceptual target tree under `/harness/` and `/projects/`.
2. Approve that `template-project/` is the only project that needs to be committed initially.
3. Approve removal or relocation of top-level `config/`, top-level `data/`, top-level project-specific `src/pages`, and top-level project-specific `src/scenarios`.

Acceptance criteria:
- The accepted target shape includes `/harness/` and `/projects/`.
- The accepted target shape includes `projects/template-project/`.
- The accepted target shape includes `/package.json` and `/tsconfig.json` as rewrite-era artifacts.
- The accepted target shape does not preserve the current top-level `config/` and `data/` layout as the end state.

<a id="m0-04-project-directory-contract-lock"></a>
## M0-04 Project Directory Contract Lock

Inputs:
- `docs/plans/EURIPID_PLAN.md` sections `3.2`, `3.3`, `7`, `8.2`

Outputs:
- Accepted required contents for every project directory
- Accepted `project.config.json` ownership model
- Accepted project isolation rules and harness import policy

Dependencies:
- `M0-02`
- `M0-03`

Work:
1. Lock the required contents for each project directory: `project.config.json`, `profiles/`, `pages/`, `scenarios/`, `data/`, `results/`.
2. Lock that projects do not get a separate `environments/` directory.
3. Lock that named environment variants live inside `project.config.json`.
4. Lock that profiles stay in `profiles/`.
5. Lock that projects consume shared functionality through stable harness entrypoints.

Acceptance criteria:
- Every project contract artifact lists `project.config.json`, `profiles/`, `pages/`, `scenarios/`, `data/`, and `results/`.
- The project contract explicitly states that environment definitions live inside `project.config.json`.
- The project contract explicitly states `No imports from sibling projects`.
- The project contract explicitly states `If a utility is genuinely shared, move it into the harness`.
- The intended user journey remains: clone the repo, copy `projects/template-project/` to `projects/<new-project-name>/`, edit the copied project's pages, scenarios, data, profiles, and `project.config.json`, choose an environment variant defined inside `project.config.json`, run the harness against that project.

<a id="m0-05-typescript-and-tooling-direction-lock"></a>
## M0-05 TypeScript and Tooling Direction Lock

Inputs:
- `docs/plans/EURIPID_PLAN.md` sections `4.1`, `4.2`, `4.3`, `9`, `11`

Outputs:
- Accepted statement that TypeScript is mandatory
- Accepted statement that Node-based tooling is acceptable and expected for development
- Accepted requirement for a real type-check step in the dev toolchain

Dependencies:
- `M0-01`

Work:
1. Lock TypeScript-first authoring for the rewrite.
2. Lock that `k6` can run `.ts` files directly but partial TypeScript support is not sufficient by itself.
3. Lock that the dev-time toolchain must include explicit type checking.
4. Lock that `package.json` and `tsconfig.json` belong to the rewrite path beginning in `M1`.

Acceptance criteria:
- The approved Milestone 0 decision set includes `TypeScript is mandatory`.
- The approved Milestone 0 decision set includes `Node-based tooling is now acceptable and expected`.
- The approved Milestone 0 decision set includes `a real type-check step must exist in the dev toolchain`.
- No Milestone 0 artifact treats TypeScript as optional or JavaScript-first authoring as the target model.

<a id="m0-06-run-command-and-orchestration-direction-lock"></a>
## M0-06 Run-Command and Orchestration Direction Lock

Inputs:
- `docs/plans/EURIPID_PLAN.md` sections `4.1`, `8.3`, `8.4`, `11`
- Current orchestration entrypoint: `scripts/run.ps1`

Outputs:
- Accepted project-aware run command direction
- Accepted Windows `k6.exe` acquisition/resolution direction
- Accepted reporting and artifact ownership boundary for the harness

Dependencies:
- `M0-03`
- `M0-04`
- `M0-05`

Work:
1. Lock the planning target for a project-aware run command such as `./scripts/run.ps1 -Project project01 -Scenario login -Environment staging -Profile smoke`.
2. Lock that the Windows execution path should call a downloaded `k6.exe` binary.
3. Lock that the default source of truth for that binary is the latest Grafana k6 GitHub release unless later pinned by the project lead.
4. Lock that the harness remains responsible for reporting and output packaging.

Acceptance criteria:
- The run-command direction is accepted without requiring the current CLI shape to be preserved.
- The Windows binary strategy explicitly references a downloaded `k6.exe`.
- Reporting ownership remains with the harness for summary generation, artifact packaging, screenshot placement rules, and run directory conventions.
- No Milestone 0 artifact assumes a globally installed `k6` as the only supported Windows path.

<a id="m0-07-non-negotiable-k6-constraints-and-acceptance-gates-lock"></a>
## M0-07 Non-Negotiable k6 Constraints and Acceptance Gates Lock

Inputs:
- `docs/plans/EURIPID_PLAN.md` sections `5`, `12`, `13`

Outputs:
- Accepted guardrail checklist for rewrite work
- Accepted cross-milestone acceptance gate checklist

Dependencies:
- `M0-02`
- `M0-05`
- `M0-06`

Work:
1. Lock the runtime guardrails that remain hard constraints under the rewrite.
2. Lock the cross-milestone acceptance gates as architecture-level checks.
3. Confirm that M0 decisions do not weaken output isolation, project isolation, or k6 runtime safety.

Acceptance criteria:
- The accepted guardrail checklist includes `Not Playwright`.
- The accepted guardrail checklist includes `Init-context file IO rules still apply`.
- The accepted guardrail checklist includes `Shared datasets still use SharedArray`.
- The accepted guardrail checklist includes `Browser scenarios still need Chromium config`.
- The accepted guardrail checklist includes `k6 runtime code is not Node runtime code`.
- The accepted guardrail checklist includes `Output paths must remain run-isolated`.
- The accepted guardrail checklist includes `Metric cardinality must remain bounded`.
- The accepted guardrail checklist includes `Browser scale must be benchmarked, not assumed`.
- The accepted cross-milestone gate checklist includes all eight rules from section `12` verbatim.

<a id="m0-08-open-questions-and-handoff-register"></a>
## M0-08 Open Questions and Handoff Register

Inputs:
- `docs/plans/EURIPID_PLAN.md` section `14`

Outputs:
- Recorded open-question register carried forward unchanged
- Explicit note that the open questions are narrower and do not reopen Milestone 0 architecture decisions

Dependencies:
- `M0-05`
- `M0-06`

Work:
1. Record whether harness imports should use explicit relative paths first, or stable alias-based imports.
2. Record whether the rewrite wants a Node-based report/build helper layer beyond `run.ps1`, or whether PowerShell remains the primary orchestration surface.
3. Preserve the `Blocks` milestone assignments and `Owner` exactly as stated in the source plan.

Acceptance criteria:
- Open question `1` is preserved with `Blocks: M1 / M2` and `Owner: Project lead`.
- Open question `2` is preserved with `Blocks: M1 / M4` and `Owner: Project lead`.
- No Milestone 0 artifact claims those questions are already resolved.
- Those questions are documented as handoff inputs to later milestones, not as reasons to reopen M0 scope.

<a id="m0-09-milestone-exit-review"></a>
## M0-09 Milestone Exit Review

Inputs:
- Outputs of `M0-01` through `M0-08`
- `docs/plans/EURIPID_PLAN.md` section `11`

Outputs:
- Milestone 0 sign-off record
- Verified checklist of Milestone 0 deliverables and exit criteria

Dependencies:
- `M0-01`
- `M0-02`
- `M0-03`
- `M0-04`
- `M0-05`
- `M0-06`
- `M0-07`
- `M0-08`

Work:
1. Verify that this plan is accepted.
2. Verify that the target repo structure is accepted.
3. Verify that the project directory contract is accepted.
4. Verify that the TypeScript/tooling direction is accepted.
5. Verify that the run-command direction is accepted.
6. Verify that there is no remaining ambiguity about the intended end-state architecture.

Acceptance criteria:
- All five Milestone 0 deliverables are explicitly marked accepted.
- The Milestone 0 sign-off record includes the Milestone 0 exit criteria verbatim.
- No unresolved item in the sign-off record contradicts the locked architecture, project model, or tooling direction.

<a id="m0-ready-checklist"></a>
## M0 Ready Checklist

- `M0-01` through `M0-09` are each marked complete or accepted.
- The approved Milestone 0 package preserves the source terms `harness/`, `projects/`, `projects/template-project/`, `project.config.json`, `k6`, `k6/browser`, `k6.exe`, `scripts/run.ps1`, `SharedArray`, and `RUN_OUTPUT_DIR`.
- No Milestone 0 decision leaks work from `M1` through `M5` into the milestone exit gate.
