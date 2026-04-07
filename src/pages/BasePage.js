// src/pages/BasePage.js
// Base class for all Page Objects. Holds the k6/browser `page` handle and
// provides shared helpers (navigation, screenshots, configurable waits).

const SCREENSHOT_DIR = (__ENV.RUN_OUTPUT_DIR || 'results').replace(/\/$/, '') + '/screenshots';

const TIMEOUT_DEFAULTS = {
  navigation: 30000,
  action:     15000,
  assertion:  10000,
};

export class BasePage {
  /**
   * @param {import('k6/browser').Page} page
   * @param {object} env  resolved environment config from config.js
   */
  constructor(page, env) {
    this.page = page;
    this.env = env;
  }

  /**
   * Resolve a named timeout from the three-level hierarchy:
   *   1. Per-call override (number > 0)
   *   2. env.timeouts.<kind>
   *   3. Built-in fallback
   *
   * @param {'navigation'|'action'|'assertion'} kind
   * @param {number} [override] Per-call timeout (ms).
   * @returns {number}
   */
  resolveTimeout(kind, override) {
    if (typeof override === 'number' && override > 0) return override;
    const t = this.env.timeouts;
    if (t && typeof t[kind] === 'number') return t[kind];
    return TIMEOUT_DEFAULTS[kind] || TIMEOUT_DEFAULTS.assertion;
  }

  async goto(path = '/') {
    const url = this.env.baseUrl.replace(/\/$/, '') + path;
    await this.page.goto(url, {
      waitUntil: 'load',
      timeout: this.resolveTimeout('navigation'),
    });
  }

  async screenshot(name) {
    await this.page.screenshot({
      path: `${SCREENSHOT_DIR}/${name}-vu${__VU}-${Date.now()}.png`,
    });
  }

  /**
   * Wait for a selector to reach a state with a configurable timeout.
   *
   * @param {string} selector
   * @param {object} [opts]
   * @param {'visible'|'attached'|'hidden'|'detached'} [opts.state]  Default: 'visible'.
   * @param {number} [opts.timeout]  Per-call override; falls back to env.timeouts.assertion.
   */
  async waitForReady(selector, opts = {}) {
    const timeout = this.resolveTimeout('assertion', opts.timeout);
    const state = opts.state || 'visible';
    await this.page.locator(selector).waitFor({ state, timeout });
  }
}
