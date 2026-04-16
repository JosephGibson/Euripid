import { check } from 'k6';
import { browser } from 'k6/browser';
import {
  assertVisible,
  buildOptions,
  environment,
  handleSummary as makeSummary,
  logScenarioError,
  withNavigation,
  withPageLoad,
  withTransaction,
} from '../../../harness/index.ts';

export const options = buildOptions('Sc01_self_test');

export default async function (): Promise<void> {
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
        await assertVisible(page, 'body', 'page body is visible', environment);

        const title = await page.title();
        check(title, { 'page has a title': (value) => Boolean(value && value.length > 0) });
      });
    });
  } catch (err) {
    logScenarioError(environment, {
      scenario: 'Sc01_self_test',
      phase: 'iteration',
      err,
    });
    throw err;
  } finally {
    await page.close();
  }
}

export const handleSummary = makeSummary;
