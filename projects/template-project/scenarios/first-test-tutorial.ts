/**
 * =============================================================================
 * Euripid — YOUR FIRST BROWSER TEST (template-project tutorial scenario)
 * =============================================================================
 *
 * This file is the committed learning sandbox for the rewrite. It runs against
 * Grafana's public QuickPizza demo, lives inside `projects/template-project/`,
 * and demonstrates the project-local layout users will copy for their own work.
 *
 * HOW TO RUN (from the repo root, with PowerShell):
 *
 *   ./scripts/run.ps1 -Project template-project -Scenario first-test-tutorial -Environment example-tutorial -Profile smoke
 *
 * WHAT YOU GET IN projects/template-project/results/<runId>/:
 *   - summary.html / summary.json  — metrics, checks, groups, transactions
 *   - k6-console.log               — k6 output (search for EURIPID_ERROR if something fails)
 *   - environment.json             — snapshot of the resolved environment used
 *
 * WHAT THIS SCENARIO TEACHES:
 *   1) Imports — k6/browser, checks, shared harness modules, assertions.
 *   2) options + buildOptions() — how the project-local load profile drives VUs and thresholds.
 *   3) default function — one browser iteration per VU.
 *   4) Transactions — named steps for the HTML report.
 *   5) Assertions — wait for elements with configurable timeouts before checking.
 *   6) Error handling — logScenarioError for structured failure output.
 *   7) handleSummary — write reports to RUN_OUTPUT_DIR.
 *
 * NEXT STEPS AFTER THIS FILE MAKES SENSE:
 *   - Copy `projects/template-project/` to `projects/<your-project>/`.
 *   - Rename the copied project's metadata in `project.config.json`.
 *   - Add or edit environment variants inside `project.config.json`.
 *   - Add project-local pages, flows, scenarios, and CSV data in the copied project.
 */

import { check } from 'k6';
import { browser } from 'k6/browser';
import {
  assertText,
  assertVisible,
  buildOptions,
  environment,
  handleSummary as makeSummary,
  logScenarioError,
  withNavigation,
  withPageLoad,
  withTransaction,
  withUserAction,
} from '../../../harness/index.ts';

export const options = buildOptions('first_test_tutorial');

export default async function (): Promise<void> {
  const page = await browser.newPage();

  try {
    await withTransaction('tutorial_acme_pizza_journey', async () => {
      await withNavigation('step_open_homepage', async () => {
        await page.goto(environment.baseUrl, {
          waitUntil: 'load',
          timeout: environment.timeouts.navigation,
        });
      });

      await withPageLoad('step_assert_page_ready', async () => {
        await assertVisible(page, 'body', 'tutorial: page body rendered', environment);

        await assertVisible(
          page,
          'h1',
          'tutorial: heading visible',
          environment,
          { timeout: 5000 },
        );

        await assertText(
          page,
          'h1',
          (text) => text !== null && text.length > 0,
          'tutorial: heading has text',
          environment,
        );

        const title = await page.title();
        check(title, {
          'tutorial: document has a non-empty title': (value) =>
            typeof value === 'string' && value.length > 0,
        });
        check(title, {
          'tutorial: title matches demo app (QuickPizza)': (value) => /pizza/i.test(value || ''),
        });
      });

      // Extension hook for copied projects:
      // await withUserAction('step_open_menu', async () => {
      //   const menuSelector = '[data-testid="main-menu"]';
      //   await assertVisible(page, menuSelector, 'menu button visible', environment);
      //   await page.locator(menuSelector).click();
      // });
      void withUserAction;
    });
  } catch (err) {
    logScenarioError(environment, {
      scenario: 'first_test_tutorial',
      phase: 'iteration',
      err,
    });
    throw err;
  } finally {
    await page.close();
  }
}

export const handleSummary = makeSummary;
