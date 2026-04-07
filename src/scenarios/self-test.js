// src/scenarios/self-test.js
// Self-test that exercises the full toolchain (config loading, browser
// startup, navigation, summary writing) against k6's public demo target.
// No CSV data, no auth — runs anywhere with no setup.
//
// For a step-by-step teaching script (dummy "Acme Pizza" project, heavy comments), use:
//   first-test-tutorial.js + config/environments/example-tutorial.json
//
// Run via:
//   ./scripts/run.ps1 -Scenario self-test -Environment self-test -Profile smoke
// Or directly:
//   k6 run -e ENV_FILE=config/environments/self-test.json \
//          -e PROFILE_FILE=config/profiles/smoke.json \
//          src/scenarios/self-test.js

import { browser } from 'k6/browser';
import { check } from 'k6';
import { environment, buildOptions } from '../lib/config.js';
import { handleSummary as makeSummary } from '../lib/summary.js';
import { withTransaction, withNavigation, withPageLoad } from '../lib/transactions.js';
import { logScenarioError } from '../lib/logging.js';
import { assertVisible } from '../lib/assertions.js';

export const options = buildOptions('self_test');

export default async function () {
  const page = await browser.newPage();
  try {
    await withTransaction('journey_self_test', async () => {
      await withNavigation('navigate_demo', async () => {
        await page.goto(environment.baseUrl, {
          waitUntil: 'load',
          timeout: environment.timeouts.navigation,
        });
      });
      await withPageLoad('verify_page_loaded', async () => {
        // assertVisible waits for the element up to the assertion timeout
        // (env.timeouts.assertion) before recording a check.
        await assertVisible(page, 'body', 'page body is visible', environment);

        const title = await page.title();
        check(title, { 'page has a title': (t) => t && t.length > 0 });
      });
    });
  } catch (err) {
    logScenarioError(environment, { scenario: 'self_test', phase: 'iteration', err });
    throw err;
  } finally {
    await page.close();
  }
}

export const handleSummary = makeSummary;
