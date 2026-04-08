// src/scenarios/google-example.js
// Example scenario that navigates to Google.com, interacts with the search UI,
// and verifies results. Demonstrates every typed transaction helper and how
// each shows up in the HTML report as a separate metric row.
//
// HTML REPORT MAPPING (what you'll see in summary.html):
//   Custom Trend rows (k6 group() cannot wrap async browser code; steps are tagged Trends):
//     navigation_duration    -- p95/avg/min/max; tags include transaction=navigate_to_google
//     page_load_duration     -- homepage_ready, results_rendered
//     user_action_duration   -- type_search_query, submit_search
//     transaction_duration   -- outer journey_google_search only
//
// Run via:
//   ./scripts/run.ps1 -Scenario google-example -Environment google-example -Profile smoke
// Multi-VU / ramped runs: use Profile load-demo (not load) -- load.json enforces Web Vitals
// SLAs that third-party sites like Google will often breach under concurrency.
//   ./scripts/run.ps1 -Scenario google-example -Environment google-example -Profile load-demo
// Or directly:
//   k6 run -e ENV_FILE=config/environments/google-example.json \
//          -e PROFILE_FILE=config/profiles/smoke.json \
//          src/scenarios/google-example.js

import { browser } from 'k6/browser';
import { check } from 'k6';
import { environment, buildOptions } from '../lib/config.js';
import { handleSummary as makeSummary } from '../lib/summary.js';
import {
  withTransaction,
  withNavigation,
  withUserAction,
  withPageLoad,
} from '../lib/transactions.js';
import { logScenarioError } from '../lib/logging.js';
import { assertVisible } from '../lib/assertions.js';

export const options = buildOptions('google_example');

export default async function () {
  const page = await browser.newPage();
  try {
    await withTransaction('journey_google_search', async () => {

      // --- NAVIGATION: full-page load to Google homepage -----------------------
      // withNavigation records navigation_duration.
      // Use for: page.goto, page.waitForNavigation, any full-page transition.
      await withNavigation('navigate_to_google', async () => {
        await page.goto(environment.baseUrl, {
          waitUntil: 'load',
          timeout: environment.timeouts.navigation,
        });
      });

      // --- PAGE LOAD: wait for the page to settle after navigation -------------
      // withPageLoad records page_load_duration.
      // Use for: asserting elements are visible/ready after a navigation or action.
      await withPageLoad('homepage_ready', async () => {
        // EU/UK consent interstitial -- best-effort; ignore if not shown.
        try {
          await page.locator('#L2AGLb').click({ timeout: 5000 });
        } catch (_) {
          /* no consent button */
        }

        await assertVisible(
          page,
          'textarea[name="q"], input[name="q"]',
          'search box is visible',
          environment,
          { failFast: true },
        );

        const title = await page.title();
        check(title, {
          'title contains Google': (t) => /google/i.test(t || ''),
        });
      });

      // --- USER ACTION: type a query into the search box -----------------------
      // withUserAction records user_action_duration.
      // Use for: clicks, keyboard input, form fills, drag-and-drop.
      await withUserAction('type_search_query', async () => {
        const searchBox = page.locator('textarea[name="q"], input[name="q"]');
        await searchBox.click();
        await searchBox.type('k6 browser performance testing');
      });

      // --- USER ACTION: submit the search form ---------------------------------
      // Pressing Enter triggers a navigation. The action timing covers only
      // the keypress itself; the page-load step below captures the full
      // round-trip (navigation + render) by waiting for the results element.
      await withUserAction('submit_search', async () => {
        await page.keyboard.press('Enter');
      });

      // --- PAGE LOAD: wait for results to appear after submit ------------------
      // assertVisible implicitly waits for the navigation to finish AND the
      // DOM to render, so this single step captures "time from submit to
      // results visible" — the metric users care about most.
      await withPageLoad('results_rendered', async () => {
        const resultsTimeout = Math.max(
          environment.timeouts.assertion,
          Math.min(environment.timeouts.navigation, 45000),
        );
        await assertVisible(
          page,
          '#rso, #center_col',
          'search results container is visible',
          environment,
          { timeout: resultsTimeout },
        );

        const resultsUrl = await page.url();
        check(resultsUrl, {
          'search results url': (u) =>
            typeof u === 'string' &&
            (u.includes('/search') || u.includes('q=') || u.includes('search?q=')),
        });
      });
    });
  } catch (err) {
    logScenarioError(environment, {
      scenario: 'google_example',
      phase: 'iteration',
      err,
    });
    throw err;
  } finally {
    await page.close();
  }
}

export const handleSummary = makeSummary;
