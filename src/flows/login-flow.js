// src/flows/login-flow.js
// Composed user journey: open login page, authenticate, land on dashboard.
// Transactions are wrapped with withTransaction() for group + transaction_duration metrics.
// Element assertions use the configurable timeout hierarchy (per-call > env > fallback).

import { LoginPage } from '../pages/LoginPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { loginDuration, flowDuration, flowErrors } from '../lib/metrics.js';
import { withTransaction } from '../lib/transactions.js';
import { logScenarioError } from '../lib/logging.js';
import { assertVisible } from '../lib/assertions.js';

/**
 * @param {import('k6/browser').Page} page
 * @param {object} env  environment from config.js
 * @param {object} user  row from CSV
 * @param {object} [ctx]
 * @param {string} [ctx.scenario]  k6 scenario name for logging
 */
export async function runLoginFlow(page, env, user, ctx = {}) {
  const scenario = ctx.scenario || 'browser_login';
  const flowStart = Date.now();
  const loginPage = new LoginPage(page, env);
  const dashboard = new DashboardPage(page, env);

  try {
    await withTransaction('journey_login', async () => {
      await withTransaction('open_login_page', async () => {
        await loginPage.open();
      });

      await withTransaction('submit_credentials', async () => {
        const loginStart = Date.now();
        await loginPage.loginAs(user);
        loginDuration.add(Date.now() - loginStart);
      });

      await withTransaction('verify_session', async () => {
        // assertVisible waits up to the assertion timeout, records a k6 check,
        // and throws immediately on failure (failFast) so we don't waste time
        // on the dashboard step after a failed login.
        await assertVisible(
          page,
          LoginPage.SELECTORS.loggedInMarker,
          'user is logged in',
          env,
          { failFast: true },
        );
      });

      await withTransaction('dashboard_ready', async () => {
        await dashboard.waitForLoad();
      });
    });
  } catch (err) {
    flowErrors.add(1);
    logScenarioError(env, {
      scenario,
      phase: 'login_flow',
      err,
      user,
    });
    try {
      await loginPage.screenshot('login-failure');
    } catch (_) {
      // Screenshot is best-effort after a hard failure.
    }
    throw err;
  } finally {
    flowDuration.add(Date.now() - flowStart);
  }
}
