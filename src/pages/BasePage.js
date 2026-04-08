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
    if (typeof override === 'number' && Number.isFinite(override) && override > 0) return override;
    const t = this.env.timeouts;
    const configuredTimeout = t ? t[kind] : undefined;
    if (
      typeof configuredTimeout === 'number' &&
      Number.isFinite(configuredTimeout) &&
      configuredTimeout > 0
    ) {
      return configuredTimeout;
    }
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
    const fileName = `${name}-vu${__VU}-${Date.now()}.png`;
    try {
      await this.page.screenshot({
        path: `${SCREENSHOT_DIR}/${fileName}`,
      });
    } catch (err) {
      if (__ENV.RUN_OUTPUT_DIR) {
        throw err;
      }
      // Direct k6 runs may not have a pre-created screenshots/ directory.
      // Fall back to the current working directory so failure evidence is not lost.
      await this.page.screenshot({
        path: `results-${fileName}`,
      });
    }
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
