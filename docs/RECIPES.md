# Recipes

Copy-paste patterns for extending Euripid. Each recipe is self-contained — pick the one that matches the task and follow it literally.

---

## Add a new page object

**When:** the flow needs to interact with a new page or component in the target app.

**Where:** `src/pages/<n>Page.js`

```js
import { BasePage } from './BasePage.js';

export class SearchPage extends BasePage {
  static SELECTORS = {
    input:  'input[name="q"]',
    submit: 'button[type="submit"]',
    result: '[data-testid="result-row"]',
  };

  async search(term, opts = {}) {
    const s = SearchPage.SELECTORS;
    const fieldTimeout = this.resolveTimeout('assertion', opts.timeout);
    // Wait for the input to render before typing — fails with a clear
    // timeout instead of a silent locator error on slow pages.
    await this.page.locator(s.input).waitFor({ state: 'visible', timeout: fieldTimeout });
    await this.page.locator(s.input).type(term);
    await this.page.locator(s.submit).click();
    await this.waitForReady(s.result, opts);
  }

  async resultCount() {
    return await this.page.locator(SearchPage.SELECTORS.result).count();
  }
}
```

**Rules:** extend `BasePage`, keep selectors in a static `SELECTORS` map, action methods are async. Use `this.resolveTimeout(kind, override)` for configurable waits (per-call > env > fallback). Never reference `__ENV` or `__VU` from a page (those belong to scenarios and `BasePage`).

---

## Add a new flow

**When:** composing multiple page objects into a user journey.

**Where:** `src/flows/<n>-flow.js`

```js
import { check } from 'k6';
import { LoginPage } from '../pages/LoginPage.js';
import { SearchPage } from '../pages/SearchPage.js';
import { flowDuration, flowErrors } from '../lib/metrics.js';
import { withTransaction } from '../lib/transactions.js';
import { logScenarioError } from '../lib/logging.js';
import { assertVisible } from '../lib/assertions.js';

export async function runSearchFlow(page, env, user, term, ctx = {}) {
  const scenario = ctx.scenario || 'browser_search';
  const start = Date.now();
  const login = new LoginPage(page, env);
  const search = new SearchPage(page, env);
  try {
    await withTransaction('journey_search', async () => {
      await withTransaction('login', async () => {
        await login.open();
        await login.loginAs(user);
        await assertVisible(page, LoginPage.SELECTORS.loggedInMarker,
          'user is logged in', env, { failFast: true });
      });
      await withTransaction('search', async () => {
        await search.search(term);
        const count = await search.resultCount();
        check(count, { 'has results': (n) => n > 0 });
      });
    });
  } catch (err) {
    flowErrors.add(1);
    logScenarioError(env, { scenario, phase: 'search_flow', err, user });
    try { await login.screenshot('search-failure'); } catch (_) {}
    throw err;
  } finally {
    flowDuration.add(Date.now() - start);
  }
}
```

**Rules:** wrap in `withTransaction` for HTML report timings; record duration via `metrics.js` in `finally`; log failures with `logScenarioError`; use `assertVisible` with `failFast` for critical gates (e.g. login); screenshot on failure (best-effort).

---

## Add a new scenario

**When:** exposing a flow as a runnable k6 entry point.

**Where:** `src/scenarios/<n>.js`

```js
import { browser } from 'k6/browser';
import { environment, buildOptions } from '../lib/config.js';
import { rowForVU } from '../lib/data.js';
import { runSearchFlow } from '../flows/search-flow.js';
import { handleSummary as makeSummary } from '../lib/summary.js';

export const options = buildOptions('browser_search');

export default async function () {
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

**Rules:** import `config.js`, `data.js`, and `summary.js` at the top (init context). Pass a unique scenario name to `buildOptions()`. Always close the page in `finally`. Always re-export `handleSummary` from `summary.js` — never roll your own, otherwise `RUN_OUTPUT_DIR` is bypassed and parallel runs race.

**Learning path:** read [`src/scenarios/first-test-tutorial.js`](../src/scenarios/first-test-tutorial.js) first — it is a commented tour of the same structure using `config/environments/example-tutorial.json` and the public QuickPizza demo.

**Run it:**
```powershell
./scripts/run.ps1 -Scenario <new-scenario-name> -Environment staging -Profile smoke
```

---

## Add a new environment

**Where:** `config/environments/<n>.json`

```json
{
  "name": "qa",
  "baseUrl": "https://qa.example.com",
  "authUrl": "https://qa.example.com/login",
  "apiUrl":  "https://qa.example.com/api",
  "tenantId": "qa-tenant",
  "timeouts": { "navigation": 30000, "action": 15000, "assertion": 10000 }
}
```

**Required fields** (validated at init by `config.js`): `name`, `baseUrl`, `timeouts.navigation`, `timeouts.action`. Optional: `timeouts.assertion` (default 10 000 ms) — global timeout for element assertion waits. Add other fields freely; they'll be available on `environment` in any flow or page.

---

## Add a new profile

**Where:** `config/profiles/<n>.json`

`config.js` validates the profile against the executor's required fields. Supported executors and required fields:

| Executor                | Required fields                                            |
|-------------------------|------------------------------------------------------------|
| `shared-iterations`     | `vus`, `iterations`                                        |
| `per-vu-iterations`     | `vus`, `iterations`                                        |
| `constant-vus`          | `vus`, `duration`                                          |
| `ramping-vus`           | `stages`                                                   |
| `constant-arrival-rate` | `rate`, `timeUnit`, `duration`, `preAllocatedVUs`          |
| `ramping-arrival-rate`  | `stages`, `preAllocatedVUs`                                |

**Shared-iterations** (smoke / fixed iteration count):
```json
{
  "name": "smoke",
  "executor": "shared-iterations",
  "vus": 1,
  "iterations": 1,
  "maxDuration": "1m",
  "thresholds": { "checks": ["rate>0.99"] }
}
```

**Ramping-vus** (ramping load):
```json
{
  "name": "stress",
  "executor": "ramping-vus",
  "startVUs": 0,
  "stages": [
    { "duration": "1m", "target": 20 },
    { "duration": "5m", "target": 20 },
    { "duration": "1m", "target": 0 }
  ],
  "gracefulRampDown": "30s",
  "thresholds": {
    "browser_web_vital_lcp": ["p(95)<4000"],
    "checks": ["rate>0.95"]
  }
}
```

**Rules:** if you add a new executor, extend `REQUIRED_BY_EXECUTOR` and the `passthrough` list in `src/lib/config.js`. Don't put env-specific URLs in profiles — that's what environments are for.

---

## Add a new CSV dataset

**Where:** `data/<n>.csv`

```csv
column1,column2,column3
value1,value2,value3
```

**Rules:** header row required (parsed by `papaparse` with `header: true`). Run with `-DataFile <n>.csv`. To use it from a scenario, the existing `rowForVU()` helper picks up whatever `DATA_FILE` env var was passed — no code change needed unless you need multiple datasets in one scenario (extend `data.js` in that case).

---

## Add a new custom metric

**Where:** `src/lib/metrics.js`

```js
import { Trend, Counter, Rate } from 'k6/metrics';

export const checkoutDuration = new Trend('flow_checkout_duration', true);
export const apiErrors = new Counter('api_errors');
export const cacheHitRate = new Rate('cache_hit_rate');
```

**Rules:** prefix flow-related trends with `flow_`, API-related with `api_`. Pass `true` as the second arg to `Trend` for time-based metrics — it tells k6 to format ms as duration in the summary.

---

## Transactions (groups + HTML report)

**Where:** `src/lib/transactions.js` — import `withTransaction` into a flow.

```js
import { withTransaction } from '../lib/transactions.js';

await withTransaction('checkout_payment', async () => {
  await page.locator('#pay').click();
});
```

Each call records a k6 **group** (nested timings in the summary) and a tagged **`transaction_duration`** sample. Name the transaction after the user-visible step (snake_case).

---

## Scenario error logging

**Where:** environment JSON optional `logging` block; orchestrator flags `-LogLevel`, `-DisableScenarioErrorLog`, `-IncludeUserContextInLogs`; or k6 `-e EURIPID_LOG_SCENARIO_ERRORS=false`.

Failures call `logScenarioError(env, { scenario, phase, err, user })` from `src/lib/logging.js`, increment **`scenario_errors`**, and print one `EURIPID_ERROR {...}` JSON line to stderr (captured in `k6-console.log`). Password fields from CSV are never included; `includeUserContext` allows username/role hints only.

---

## Element assertions (wait + check with configurable timeout)

**Where:** `src/lib/assertions.js` — import into flows or scenarios.

**Timeout hierarchy** (highest priority wins):
1. Per-call `opts.timeout`
2. `env.timeouts.assertion` (from environment JSON)
3. Built-in fallback: 10 000 ms

```js
import { assertVisible, assertText, assertHidden } from '../lib/assertions.js';

// Wait for selector to be visible (env.timeouts.assertion), record check.
await assertVisible(page, '#dashboard', 'dashboard visible', env);

// Per-call override — wait up to 20 s for this slow widget.
await assertVisible(page, '.chart', 'chart loaded', env, { timeout: 20000 });

// Fail the iteration immediately if login marker is missing.
await assertVisible(page, '.user-menu', 'logged in', env, { failFast: true });

// Assert text content with a predicate.
await assertText(page, 'h1', (t) => /welcome/i.test(t), 'greeting shown', env);

// Assert spinner disappears.
await assertHidden(page, '.spinner', 'loading done', env, { timeout: 5000 });
```

**Environment JSON:** add `timeouts.assertion` to set the global default:
```json
{ "timeouts": { "navigation": 30000, "action": 15000, "assertion": 10000 } }
```

**Page objects** use the same hierarchy via `BasePage.resolveTimeout('assertion', override)`.
