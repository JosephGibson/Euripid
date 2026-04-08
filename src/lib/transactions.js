// src/lib/transactions.js
// Named transactions: tagged Trend metrics for per-step timings in the summary/HTML report.
//
// k6's group() must not receive an async callback — browser flows are async, and k6
// explicitly rejects that pattern. See:
// https://grafana.com/docs/k6/latest/javascript-api/k6/group/
//
// Four helpers, from general to specific:
//   withTransaction  — catch-all (records transaction_duration only)
//   withNavigation   — page.goto / waitForNavigation (+ navigation_duration)
//   withUserAction   — click, type, submit, keyboard (+ user_action_duration)
//   withPageLoad     — post-action settling / assertions (+ page_load_duration)
//
// `withTransaction()` is reserved for outer journey wrappers. Typed helpers emit
// only their own per-type Trends so transaction_duration does not double-count
// nested steps.

import {
  transactionDuration,
  navigationDuration,
  userActionDuration,
  pageLoadDuration,
} from './metrics.js';

/**
 * Run async work and record `transaction_duration` with tag `transaction`.
 * Nest calls to model user journey → steps (each step is a separate tagged sample).
 *
 * @param {string} name Short snake_case label (shows in report).
 * @param {() => Promise<unknown>} fn
 */
export async function withTransaction(name, fn) {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    transactionDuration.add(Date.now() - t0, { transaction: name });
  }
}

/**
 * Time a browser navigation (page.goto, waitForNavigation, full-page load).
 * Records `navigation_duration`.
 *
 * @param {string} name e.g. 'navigate_to_login', 'search_results_loaded'
 * @param {() => Promise<unknown>} fn
 */
export async function withNavigation(name, fn) {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - t0;
    navigationDuration.add(elapsed, { transaction: name });
  }
}

/**
 * Time a user interaction (click, type, form submit, keyboard shortcut).
 * Records `user_action_duration`.
 *
 * @param {string} name e.g. 'click_submit', 'type_search_query'
 * @param {() => Promise<unknown>} fn
 */
export async function withUserAction(name, fn) {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - t0;
    userActionDuration.add(elapsed, { transaction: name });
  }
}

/**
 * Time a page-load / settling wait (element appears, spinner gone, data renders).
 * Records `page_load_duration`.
 *
 * @param {string} name e.g. 'dashboard_ready', 'results_rendered'
 * @param {() => Promise<unknown>} fn
 */
export async function withPageLoad(name, fn) {
  const t0 = Date.now();
  try {
    return await fn();
  } finally {
    const elapsed = Date.now() - t0;
    pageLoadDuration.add(elapsed, { transaction: name });
  }
}
