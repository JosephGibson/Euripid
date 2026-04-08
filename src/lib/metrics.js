// src/lib/metrics.js
import { Trend, Counter } from 'k6/metrics';

/** Time spent in credential entry + submit (legacy name; thresholds may reference it). */
export const loginDuration = new Trend('flow_login_duration', true);

/** Wall-clock time for the whole flow (legacy). */
export const flowDuration = new Trend('flow_total_duration', true);

export const flowErrors = new Counter('flow_errors');
export const dataErrors = new Counter('data_errors');

/**
 * Per-transaction duration (tag: `transaction`). Shows in HTML/JSON summary as a custom Trend;
 * pairs with outer k6 journey groups that use withTransaction().
 */
export const transactionDuration = new Trend('transaction_duration', true);

// --- Typed transaction Trends ------------------------------------------------
// Each gets its own row in the HTML report so navigations, user actions, and
// page-load waits are visually separated. Tag: `transaction`.

/** Browser navigations: page.goto, page.waitForNavigation, full-page loads. */
export const navigationDuration = new Trend('navigation_duration', true);

/** User interactions: clicks, keyboard input, form submissions, drag-and-drop. */
export const userActionDuration = new Trend('user_action_duration', true);

/** Post-action settling: element appears, spinner disappears, data renders. */
export const pageLoadDuration = new Trend('page_load_duration', true);

/**
 * Count of logged scenario failures (tag: `phase`, `scenario`). Use for thresholds, e.g.
 * `scenario_errors{phase:login_flow}<10`.
 */
export const scenarioErrors = new Counter('scenario_errors');
