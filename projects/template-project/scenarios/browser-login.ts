import { browser } from 'k6/browser';
import {
  buildOptions,
  dataErrors,
  environment,
  handleSummary as makeSummary,
  logScenarioError,
} from '../../../harness/index.ts';
import { rowForVU } from '../../../harness/data.ts';
import { runLoginFlow } from '../flows/login-flow.ts';

export const options = buildOptions('browser_login');

export default async function (): Promise<void> {
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
