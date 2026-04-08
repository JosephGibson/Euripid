// src/lib/assertions.js
// Configurable assertion helpers for k6/browser performance tests.
//
// Timeout hierarchy (highest priority wins):
//   1. Per-call `opts.timeout`          — explicit override for this assertion
//   2. `env.timeouts.assertion`         — global test config from environment JSON
//   3. FALLBACK_ASSERTION_TIMEOUT_MS    — hard default (10 s)
//
// Every helper waits for the element state, then records the result via k6 check().
// Set opts.failFast = true to throw on failure (stops the iteration immediately).

import { check } from 'k6';

const FALLBACK_ASSERTION_TIMEOUT_MS = 10000;

/**
 * Resolve assertion timeout from the three-level hierarchy.
 *
 * @param {object} env    Environment config from config.js.
 * @param {number} [override]  Per-call timeout (ms). Takes priority when > 0.
 * @returns {number}
 */
export function resolveAssertionTimeout(env, override) {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) return override;
  const configuredTimeout = env && env.timeouts ? env.timeouts.assertion : undefined;
  if (
    typeof configuredTimeout === 'number' &&
    Number.isFinite(configuredTimeout) &&
    configuredTimeout > 0
  ) {
    return configuredTimeout;
  }
  return FALLBACK_ASSERTION_TIMEOUT_MS;
}

/**
 * Wait for a locator to reach the requested state and record a k6 check().
 *
 * @param {import('k6/browser').Page} page
 * @param {string} selector  CSS selector.
 * @param {string} checkName Name shown in the summary / HTML report.
 * @param {object} env       Environment config from config.js.
 * @param {object} [opts]
 * @param {number}  [opts.timeout]   Per-call timeout override (ms).
 * @param {'visible'|'attached'|'hidden'|'detached'} [opts.state]  Default: 'visible'.
 * @param {boolean} [opts.failFast]  Throw on failure (default: false).
 * @returns {Promise<boolean>} Whether the check passed.
 */
export async function assertElement(page, selector, checkName, env, opts = {}) {
  const timeout = resolveAssertionTimeout(env, opts.timeout);
  const state = opts.state || 'visible';
  const failFast = opts.failFast === true;

  let found = false;
  try {
    await page.locator(selector).waitFor({ state, timeout });
    found = true;
  } catch (_) {
    // Element did not reach the requested state within timeout.
  }

  const passed = check(found, { [checkName]: (v) => v === true });
  if (!passed && failFast) {
    throw new Error(
      `Assertion failed: ${checkName} — selector "${selector}" did not reach ` +
      `state "${state}" within ${timeout} ms`
    );
  }
  return passed;
}

/**
 * Assert that a selector is visible within the assertion timeout.
 * Shorthand for assertElement with state: 'visible'.
 */
export async function assertVisible(page, selector, checkName, env, opts = {}) {
  return assertElement(page, selector, checkName, env, { ...opts, state: 'visible' });
}

/**
 * Assert that a selector is hidden (or removed) within the assertion timeout.
 * Useful for confirming spinners / overlays disappear after an action.
 */
export async function assertHidden(page, selector, checkName, env, opts = {}) {
  return assertElement(page, selector, checkName, env, { ...opts, state: 'hidden' });
}

/**
 * Wait for an element, read its text, and check it with a predicate function.
 *
 * @param {import('k6/browser').Page} page
 * @param {string} selector
 * @param {(text: string|null) => boolean} predicate  Receives the text; return true to pass.
 * @param {string} checkName
 * @param {object} env
 * @param {object} [opts]         Same as assertElement + state defaults to 'visible'.
 * @returns {Promise<boolean>}
 */
export async function assertText(page, selector, predicate, checkName, env, opts = {}) {
  const timeout = resolveAssertionTimeout(env, opts.timeout);
  const state = opts.state || 'visible';
  const failFast = opts.failFast === true;
  const deadline = Date.now() + timeout;

  let text = null;
  try {
    await page.locator(selector).waitFor({ state, timeout });
    const remaining = Math.max(1, deadline - Date.now());
    text = await page.locator(selector).textContent({ timeout: remaining });
  } catch (_) {
    // Element didn't appear or text couldn't be read within timeout.
  }

  const passed = check(text, { [checkName]: predicate });
  if (!passed && failFast) {
    throw new Error(
      `Assertion failed: ${checkName} — selector "${selector}" text did not ` +
      `satisfy predicate within ${timeout} ms`
    );
  }
  return passed;
}
