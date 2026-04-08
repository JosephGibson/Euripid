// src/pages/LoginPage.js
// Generic form-login page object. Override selectors per project by
// subclassing or by overriding the static SELECTORS map.

import { BasePage } from './BasePage.js';

export class LoginPage extends BasePage {
  static SELECTORS = {
    username: 'input[name="username"], input[type="email"]',
    password: 'input[name="password"], input[type="password"]',
    submit:   'button[type="submit"]',
    loggedInMarker: '[data-testid="user-menu"], .user-menu',
  };

  async open() {
    const url = this.env.authUrl || this.env.baseUrl;
    await this.page.goto(url, {
      waitUntil: 'load',
      timeout: this.resolveTimeout('navigation'),
    });
  }

  /**
   * @param {object} user  CSV row with `username` and `password`.
   * @param {object} [opts]
   * @param {number} [opts.timeout]  Override assertion timeout for field waits.
   */
  async loginAs(user, opts = {}) {
    const s = LoginPage.SELECTORS;
    const fieldTimeout = this.resolveTimeout('assertion', opts.timeout);
    const actionTimeout = this.resolveTimeout('action', opts.timeout);

    // Wait for the form fields before interacting — if the app is slow to
    // render, this fails with a clear timeout instead of a "locator not found".
    await this.page.locator(s.username).waitFor({ state: 'visible', timeout: fieldTimeout });
    await this.page.locator(s.password).waitFor({ state: 'visible', timeout: fieldTimeout });
    await this.page.locator(s.submit).waitFor({ state: 'visible', timeout: fieldTimeout });

    await this.page.locator(s.username).fill(user.username, { timeout: actionTimeout });
    await this.page.locator(s.password).fill(user.password, { timeout: actionTimeout });
    await this.page.locator(s.submit).click({ timeout: actionTimeout });
  }

  /**
   * @param {object} [opts]
   * @param {number} [opts.timeout]  Override assertion timeout for the logged-in marker.
   * @returns {Promise<boolean>}
   */
  async isLoggedIn(opts = {}) {
    const timeout = this.resolveTimeout('assertion', opts.timeout);
    try {
      await this.page.locator(LoginPage.SELECTORS.loggedInMarker)
        .waitFor({ state: 'visible', timeout });
      return true;
    } catch (_) {
      return false;
    }
  }
}
