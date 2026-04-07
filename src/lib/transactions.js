// src/lib/transactions.js
// Named transactions: k6 `group()` for nested timings in the summary/HTML report, plus a
// tagged Trend so transaction_duration{transaction:...} appears as a first-class metric.

import { group } from 'k6';
import { transactionDuration } from './metrics.js';

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
