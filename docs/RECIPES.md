# Recipes

Copy-paste patterns for extending the rewritten Euripid layout.

## Stable imports

Project code should use only these stable harness entrypoints:

- `../../../harness/index.ts`
- `../../../harness/data.ts`
- `../../../harness/types.ts`

Do not deep-import internal harness folders from project code.

## Add a new page object

**Where:** `projects/<project>/pages/SearchPage.ts`

```ts
import { BasePage } from '../../../harness/index.ts';

export class SearchPage extends BasePage {
  static SELECTORS = {
    input: 'input[name=\"q\"]',
    submit: 'button[type=\"submit\"]',
    result: '[data-testid=\"result-row\"]',
  };

  async search(term: string, opts: { timeout?: number } = {}): Promise<void> {
    const selectors = SearchPage.SELECTORS;
    const fieldTimeout = this.resolveTimeout('assertion', opts.timeout);
    const actionTimeout = this.resolveTimeout('action', opts.timeout);

    await this.page.locator(selectors.input).waitFor({ state: 'visible', timeout: fieldTimeout });
    await this.page.locator(selectors.submit).waitFor({ state: 'visible', timeout: fieldTimeout });
    await this.page.locator(selectors.input).type(term, { timeout: actionTimeout });
    await this.page.locator(selectors.submit).click({ timeout: actionTimeout });
    await this.waitForReady(selectors.result, opts);
  }

  async resultCount(): Promise<number> {
    return await this.page.locator(SearchPage.SELECTORS.result).count();
  }
}
```

Rules:

- Extend `BasePage`.
- Keep selectors in a static `SELECTORS` map.
- Use `resolveTimeout()` instead of hardcoding waits.
- Do not reference `__ENV` or `__VU` inside pages.

## Add a new flow

**Where:** `projects/<project>/flows/search-flow.ts`

```ts
import { check } from 'k6';
import {
  assertVisible,
  logScenarioError,
  withNavigation,
  withPageLoad,
  withTransaction,
  withUserAction,
} from '../../../harness/index.ts';
import type {
  BrowserPageLike,
  DatasetRow,
  EuripidEnvironment,
  FlowContext,
} from '../../../harness/types.ts';
import { flowDuration, flowErrors } from '../metrics.ts';
import { LoginPage } from '../pages/LoginPage.ts';
import { SearchPage } from '../pages/SearchPage.ts';

export async function runSearchFlow(
  page: BrowserPageLike,
  env: EuripidEnvironment,
  user: DatasetRow,
  term: string,
  ctx: FlowContext = {},
): Promise<void> {
  const scenario = ctx.scenario || 'browser_search';
  const startedAt = Date.now();
  const login = new LoginPage(page, env);
  const search = new SearchPage(page, env);

  try {
    await withTransaction('journey_search', async () => {
      await withNavigation('open_login', async () => {
        await login.open();
      });

      await withUserAction('submit_credentials', async () => {
        await login.loginAs(user);
      });

      await withPageLoad('login_ready', async () => {
        await assertVisible(
          page,
          LoginPage.SELECTORS.loggedInMarker,
          'user is logged in',
          env,
          { failFast: true },
        );
      });

      await withPageLoad('results_ready', async () => {
        await search.search(term);
        const count = await search.resultCount();
        check(count, { 'has results': (value) => value > 0 });
      });
    });
  } catch (err) {
    flowErrors.add(1);
    logScenarioError(env, { scenario, phase: 'search_flow', err, user });
    try { await login.screenshot('search-failure'); } catch {}
    throw err;
  } finally {
    flowDuration.add(Date.now() - startedAt);
  }
}
```

Rules:

- Keep app-specific metrics in a project-local `metrics.ts`.
- Use the transaction helpers for timing boundaries.
- The helpers emit tagged Trend metrics; they do not rely on async `k6/group()`.
- Log failures with `logScenarioError()` and screenshot failures best-effort.

## Add a new scenario

**Where:** `projects/<project>/scenarios/browser-search.ts`

```ts
import { browser } from 'k6/browser';
import {
  buildOptions,
  environment,
  handleSummary as makeSummary,
} from '../../../harness/index.ts';
import { rowForVU } from '../../../harness/data.ts';
import { runSearchFlow } from '../flows/search-flow.ts';

export const options = buildOptions('browser_search');

export default async function (): Promise<void> {
  const page = await browser.newPage();
  try {
    const user = rowForVU();
    await runSearchFlow(page, environment, user, 'k6 performance');
  } finally {
    await page.close();
  }
}

export const handleSummary = makeSummary;
```

Rules:

- One scenario per file.
- Import harness modules at top-level so init-context file loading stays valid.
- Close the browser page in `finally`.
- Re-export the shared `handleSummary`.

Run it:

```powershell
./scripts/run.ps1 -Project <project> -Scenario browser-search -Environment staging -Profile smoke
```

## Add or edit an environment variant

**Where:** `projects/<project>/project.config.json`

```json
{
  "project": {
    "key": "my-project",
    "name": "My Project",
    "defaultDataFile": "users.csv"
  },
  "environments": {
    "qa": {
      "name": "qa",
      "baseUrl": "https://qa.example.com",
      "authUrl": "https://qa.example.com/login",
      "apiUrl": "https://qa.example.com/api",
      "tenantId": "qa-tenant",
      "timeouts": {
        "navigation": 30000,
        "action": 15000,
        "assertion": 10000
      },
      "logging": {
        "level": "error",
        "logScenarioErrors": true,
        "includeStack": true,
        "includeUserContext": false
      }
    }
  }
}
```

Rules:

- `project.key` and `project.name` are required.
- Environment variants live inside the `environments` map; there is no separate `environments/` directory.
- Required environment fields are `name`, `baseUrl`, `timeouts.navigation`, and `timeouts.action`.

## Add a new profile

**Where:** `projects/<project>/profiles/<name>.json`

Supported executors and required fields:

| Executor | Required fields |
|---|---|
| `shared-iterations` | `vus`, `iterations` |
| `per-vu-iterations` | `vus`, `iterations` |
| `constant-vus` | `vus`, `duration` |
| `ramping-vus` | `stages` |
| `constant-arrival-rate` | `rate`, `timeUnit`, `duration`, `preAllocatedVUs` |
| `ramping-arrival-rate` | `stages`, `preAllocatedVUs` |

Smoke example:

```json
{
  "name": "smoke",
  "executor": "shared-iterations",
  "vus": 1,
  "iterations": 1,
  "maxDuration": "1m",
  "thresholds": {
    "checks": ["rate>0.99"]
  }
}
```

## Add a new CSV dataset

**Where:** `projects/<project>/data/<name>.csv`

```csv
username,password,role
user01@example.com,Password123!,standard
```

Rules:

- Header row required.
- If the dataset should be the project default, set `project.defaultDataFile` in `project.config.json`.
- Otherwise pass `-DataFile <name>.csv` to the runner.

## Add a custom metric

Project-local metrics should live in `projects/<project>/metrics.ts`.

```ts
import { Counter, Trend } from 'k6/metrics';

export const checkoutDuration = new Trend('flow_checkout_duration', true);
export const checkoutErrors = new Counter('flow_checkout_errors');
```

If a metric is truly shared across many projects, add it to the harness instead of duplicating it.
