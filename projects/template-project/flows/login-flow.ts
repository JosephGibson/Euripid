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
import { flowDuration, flowErrors, loginDuration } from '../metrics.ts';
import { DashboardPage } from '../pages/DashboardPage.ts';
import { LoginPage } from '../pages/LoginPage.ts';

export async function runLoginFlow(
  page: BrowserPageLike,
  env: EuripidEnvironment,
  user: DatasetRow,
  ctx: FlowContext = {},
): Promise<void> {
  const scenario = ctx.scenario || 'Sc03_browser_login';
  const flowStart = Date.now();
  const loginPage = new LoginPage(page, env);
  const dashboard = new DashboardPage(page, env);

  try {
    await withTransaction('journey_login', async () => {
      await withNavigation('open_login_page', async () => {
        await loginPage.open();
      });

      await withUserAction('submit_credentials', async () => {
        const loginStart = Date.now();
        await loginPage.loginAs(user);
        loginDuration.add(Date.now() - loginStart);
      });

      await withPageLoad('verify_session', async () => {
        await assertVisible(
          page,
          LoginPage.SELECTORS.loggedInMarker,
          'user is logged in',
          env,
          { failFast: true },
        );
      });

      await withPageLoad('dashboard_ready', async () => {
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
    } catch {
      // Screenshot is best-effort after a hard failure.
    }
    throw err;
  } finally {
    flowDuration.add(Date.now() - flowStart);
  }
}
