// src/lib/transactions.js
// Named transactions: k6 `group()` for nested timings in the summary/HTML report, plus
// tagged Trends so each step appears as a first-class metric.
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

import { group } from 'k6';
import {
  transactionDuration,
  navigationDuration,
  userActionDuration,
  pageLoadDuration,
} from './metrics.js';

/**
 * Run async work inside a k6 group and record `transaction_duration` with tag `transaction`.
 * Nest calls to model user journey → steps (groups show as parent::child in k6 metrics).
 *
 * @param {string} name Short snake_case label (shows in report).
 * @param {() => Promise<unknown>} fn
 */
export async function withTransaction(name, fn) {
  return await group(name, async () => {
    const t0 = Date.now();
    try {
      return await fn();
    } finally {
      transactionDuration.add(Date.now() - t0, { transaction: name });
    }
  });
}

/**
 * Time a browser navigation (page.goto, waitForNavigation, full-page load).
 * Records `navigation_duration`.
 *
 * @param {string} name e.g. 'navigate_to_login', 'search_results_loaded'
 * @param {() => Promise<unknown>} fn
 */
export async function withNavigation(name, fn) {
  return await group(name, async () => {
    const t0 = Date.now();
    try {
      return await fn();
    } finally {
      const elapsed = Date.now() - t0;
      navigationDuration.add(elapsed, { transaction: name });
    }
  });
}

/**
 * Time a user interaction (click, type, form submit, keyboard shortcut).
 * Records `user_action_duration`.
 *
 * @param {string} name e.g. 'click_submit', 'type_search_query'
 * @param {() => Promise<unknown>} fn
 */
export async function withUserAction(name, fn) {
  return await group(name, async () => {
    const t0 = Date.now();
    try {
      return await fn();
    } finally {
      const elapsed = Date.now() - t0;
      userActionDuration.add(elapsed, { transaction: name });
    }
  });
}

/**
 * Time a page-load / settling wait (element appears, spinner gone, data renders).
 * Records `page_load_duration`.
 *
 * @param {string} name e.g. 'dashboard_ready', 'results_rendered'
 * @param {() => Promise<unknown>} fn
 */
export async function withPageLoad(name, fn) {
  return await group(name, async () => {
    const t0 = Date.now();
    try {
      return await fn();
    } finally {
      const elapsed = Date.now() - t0;
      pageLoadDuration.add(elapsed, { transaction: name });
    }
  });
}
