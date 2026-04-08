/**
 * =============================================================================
 * Euripid — YOUR FIRST BROWSER TEST (tutorial scenario)
 * =============================================================================
 *
 * This file is a **learning sandbox**: a dummy "Acme Pizza Co." project that
 * runs against Grafana's public QuickPizza demo. You can execute it as-is,
 * read the comments top-to-bottom, then copy the patterns into your own
 * scenario when you test a real application.
 *
 * HOW TO RUN (from the repo root, with PowerShell):
 *
 *   ./scripts/run.ps1 -Scenario first-test-tutorial -Environment example-tutorial -Profile smoke
 *
 * WHAT YOU GET IN results/<runId>/:
 *   - summary.html / summary.json  — metrics, checks, groups, transactions
 *   - k6-console.log               — k6 output (search for EURIPID_ERROR if something fails)
 *   - environment.json             — snapshot of the env file used
 *
 * WHAT THIS SCENARIO TEACHES (read the numbered sections below):
 *   1) Imports — k6/browser, checks, shared lib modules, assertions.
 *   2) options + buildOptions() — how the load profile drives VUs and thresholds.
 *   3) default function — one "iteration" per VU; browser lifecycle.
 *   4) Transactions — named steps for the HTML report.
 *   5) Assertions — wait for elements with configurable timeouts before checking.
 *   6) Error handling — logScenarioError for structured failure output.
 *   7) handleSummary — write reports to RUN_OUTPUT_DIR.
 *
 * NEXT STEPS AFTER THIS FILE MAKES SENSE:
 *   - Copy this file to my-feature-smoke.js and change the journey to match your UI.
 *   - Add config/environments/<your-app>.json with your real baseUrl.
 *   - Extract locators into src/pages/ (Page Objects) — see docs/RECIPES.md.
 *   - Add data/<users>.csv and src/lib/data.js rowForVU() when you need per-VU data.
 *
 * CONSTRAINT REMINDER (see AGENTS.md): open() for files only at module init — never
 * inside default(). This scenario does not read files in the VU; config is loaded in
 * config.js at import time.
 *
 * =============================================================================
 */

// =============================================================================
// SECTION 1 — Imports
// =============================================================================
//
// k6/browser gives you Chromium automation (Playwright-shaped API that runs
// inside k6 — NOT the npm 'playwright' package).

import { browser } from 'k6/browser';

// check() records pass/fail booleans for the summary and HTML report. It does
// NOT throw — the iteration continues. Use it for "soft" assertions; combine
// with failFast in assertVisible/assertText for "hard" assertions that stop
// the iteration immediately.

import { check } from 'k6';

// Shared infrastructure (init context — imported once per VU module load):
//   environment  — parsed JSON from ENV_FILE (your app's URLs, timeouts, logging).
//   buildOptions — merges profile JSON (VUs, executor) with browser options.

import { environment, buildOptions } from '../lib/config.js';

// One shared summary writer so every scenario writes HTML/JSON to the same place
// the orchestrator expects (__ENV.RUN_OUTPUT_DIR).

import { handleSummary as makeSummary } from '../lib/summary.js';

// withTransaction(name, fn) records a tagged transaction_duration Trend (async-safe; no k6 group())
// metric for outer journey timing.

import {
  withTransaction,
  withNavigation,
  withPageLoad,
  withUserAction,
} from '../lib/transactions.js';

// Structured error lines (EURIPID_ERROR JSON) + scenario_errors counter.

import { logScenarioError } from '../lib/logging.js';

// Assertion helpers — the core of reliable performance testing. Each helper:
//   1. Waits for an element to reach a state (visible, hidden, etc.)
//   2. Waits up to a configurable timeout before giving up
//   3. Records the result via k6 check()
//   4. Optionally throws on failure (failFast: true)
//
// TIMEOUT HIERARCHY (highest priority wins):
//   Per-call opts.timeout  >  env.timeouts.assertion  >  built-in 10 000 ms
//
// Example environment JSON:
//   { "timeouts": { "navigation": 30000, "action": 15000, "assertion": 10000 } }
//
// You set assertion globally there, then override per-call when one element is
// known to be slower (e.g. a dashboard loading heavy charts).

import { assertVisible, assertText } from '../lib/assertions.js';

// =============================================================================
// SECTION 2 — Scenario options
// =============================================================================
// buildOptions('<scenario_key>') reads PROFILE_FILE (e.g. config/profiles/smoke.json)
// and builds the k6 options object with browser type set to 'chromium'.

export const options = buildOptions('first_test_tutorial');

// =============================================================================
// SECTION 3 — The VU function
// =============================================================================
// One async "iteration" per (VU, iteration) pair. Under load, many VUs run
// this concurrently. Always acquire a page and close it in finally.

export default async function () {
  const page = await browser.newPage();

  try {
    // =========================================================================
    // SECTION 4 — User journey modeled as an outer transaction plus typed steps
    // =========================================================================
    // Outer transaction = whole journey (tagged transaction_duration in the report).
    // Inner typed steps = named actions/load waits a product owner would recognise.

    await withTransaction('tutorial_acme_pizza_journey', async () => {
      // --- Step A: Navigate to the app root -----------------------------------
      // environment.baseUrl comes from config/environments/example-tutorial.json.
      // Replace that file's baseUrl when your real app is ready.

      await withNavigation('step_open_homepage', async () => {
        await page.goto(environment.baseUrl, {
          // 'load' waits for the load event. 'networkidle' is stricter but can
          // flake on SPAs with long-polling — start with 'load' or 'domcontentloaded'.
          waitUntil: 'load',

          // Timeout from env JSON — tune per environment (fast CI vs slow staging).
          timeout: environment.timeouts.navigation,
        });
      });

      // --- Step B: Assert elements exist (the key performance testing pattern) -
      //
      // In performance tests, pages load under variable server pressure.
      // You MUST wait for elements before asserting — otherwise you get
      // false negatives that are really just "the DOM wasn't ready yet".
      //
      // assertVisible(page, selector, checkName, env, opts):
      //   - Waits for the selector to become visible
      //   - Up to opts.timeout (or env.timeouts.assertion, or 10 s fallback)
      //   - Records a k6 check()
      //   - Returns true/false
      //   - With { failFast: true }, throws immediately on failure

      await withPageLoad('step_assert_page_ready', async () => {
        // 1) Assert the page body rendered — uses the global assertion timeout
        //    from env.timeouts.assertion (10 s in example-tutorial.json).
        await assertVisible(
          page,                           // k6/browser Page
          'body',                         // CSS selector
          'tutorial: page body rendered', // check name (shows in report)
          environment,                    // env config (timeout source)
        );

        // 2) Assert a specific element — the QuickPizza logo / heading.
        //    Here we use a PER-CALL timeout override of 5000 ms because we
        //    know the heading should render faster than the default 10 s.
        await assertVisible(
          page,
          'h1',
          'tutorial: heading visible',
          environment,
          { timeout: 5000 },             // per-call override
        );

        // 3) Assert text content matches a predicate. assertText waits for
        //    the element, reads textContent(), and checks the predicate.
        await assertText(
          page,
          'h1',
          (text) => text !== null && text.length > 0,
          'tutorial: heading has text',
          environment,
        );

        // 4) Soft check on the page title (no element wait needed for title()).
        //    check() alone is fine for non-DOM values.
        const title = await page.title();
        check(title, {
          'tutorial: document has a non-empty title': (t) => typeof t === 'string' && t.length > 0,
        });
        check(title, {
          'tutorial: title matches demo app (QuickPizza)': (t) => /pizza/i.test(t || ''),
        });
      });

      // --- Step C: Demonstrate failFast (commented — uncomment to test) -------
      //
      // With { failFast: true }, a failed assertion throws immediately.
      // The error is caught in the outer catch, logged via logScenarioError,
      // and the iteration stops. Use this for critical gates like "login succeeded".
      //
      // await withPageLoad('step_critical_element', async () => {
      //   await assertVisible(
      //     page,
      //     '[data-testid="critical-widget"]',
      //     'critical widget loaded',
      //     environment,
      //     { failFast: true, timeout: 15000 },  // hard fail + custom timeout
      //   );
      // });

      // --- Step D (extension hook): click something on the real app -----------
      // Uncomment and adapt when you have a stable selector on YOUR site:
      //
      // await withUserAction('step_open_menu', async () => {
      //   const menuSelector = '[data-testid="main-menu"]';
      //   await assertVisible(page, menuSelector, 'menu button visible', environment);
      //   await page.locator(menuSelector).click();
      // });
    });
  } catch (err) {
    // Central place for iteration-level failures — logs JSON to stderr and
    // increments scenario_errors{phase,scenario} for dashboards.

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

// =============================================================================
// SECTION 5 — Summary output (do not omit in real scenarios)
// =============================================================================
// Re-export the shared handleSummary so k6 writes summary.html / summary.json
// into RUN_OUTPUT_DIR. The PowerShell script sets that to results/<runId>/.

export const handleSummary = makeSummary;
