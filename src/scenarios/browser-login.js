// src/scenarios/browser-login.js
// k6 entry point. Run via scripts/run.ps1 or directly:
//   k6 run -e ENV_FILE=config/environments/staging.json \
//          -e PROFILE_FILE=config/profiles/load.json \
//          -e DATA_FILE=data/users.csv \
//          -e RUN_OUTPUT_DIR=results/my-run \
//          src/scenarios/browser-login.js

import { browser } from 'k6/browser';
import { environment, buildOptions } from '../lib/config.js';
import { rowForVU } from '../lib/data.js';
import { runLoginFlow } from '../flows/login-flow.js';
import { handleSummary as makeSummary } from '../lib/summary.js';
import { logScenarioError } from '../lib/logging.js';
import { dataErrors } from '../lib/metrics.js';

export const options = buildOptions('browser_login');

export default async function () {
  const page = await browser.newPage();
  try {
    let user;
    try {
      user = rowForVU();
    } catch (err) {
      dataErrors.add(1);
      logScenarioError(environment, {
        scenario: 'browser_login',
        phase: 'data',
        err,
      });
      throw err;
    }
    await runLoginFlow(page, environment, user, { scenario: 'browser_login' });
  } finally {
    await page.close();
  }
}

export const handleSummary = makeSummary;
