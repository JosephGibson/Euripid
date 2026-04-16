import { BasePage } from '../../../harness/index.ts';
import type { DatasetRow } from '../../../harness/types.ts';

export class LoginPage extends BasePage {
  static SELECTORS = {
    username: 'input[name="username"], input[type="email"]',
    password: 'input[name="password"], input[type="password"]',
    submit: 'button[type="submit"]',
    loggedInMarker: '[data-testid="user-menu"], .user-menu',
  };

  async open(): Promise<void> {
    const url = this.env.authUrl || this.env.baseUrl;
    await this.page.goto(String(url), {
      waitUntil: 'load',
      timeout: this.resolveTimeout('navigation'),
    });
  }

  async loginAs(user: DatasetRow, opts: { timeout?: number } = {}): Promise<void> {
    const selectors = LoginPage.SELECTORS;
    const fieldTimeout = this.resolveTimeout('assertion', opts.timeout);
    const actionTimeout = this.resolveTimeout('action', opts.timeout);

    await this.page.locator(selectors.username).waitFor({ state: 'visible', timeout: fieldTimeout });
    await this.page.locator(selectors.password).waitFor({ state: 'visible', timeout: fieldTimeout });
    await this.page.locator(selectors.submit).waitFor({ state: 'visible', timeout: fieldTimeout });

    await this.page.locator(selectors.username).fill(user.username, { timeout: actionTimeout });
    await this.page.locator(selectors.password).fill(user.password, { timeout: actionTimeout });
    await this.page.locator(selectors.submit).click({ timeout: actionTimeout });
  }

  async isLoggedIn(opts: { timeout?: number } = {}): Promise<boolean> {
    const timeout = this.resolveTimeout('assertion', opts.timeout);
    try {
      await this.page.locator(LoginPage.SELECTORS.loggedInMarker).waitFor({
        state: 'visible',
        timeout,
      });
      return true;
    } catch {
      return false;
    }
  }
}
