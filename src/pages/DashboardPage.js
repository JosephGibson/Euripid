// src/pages/DashboardPage.js
import { BasePage } from './BasePage.js';

export class DashboardPage extends BasePage {
  static SELECTORS = {
    header: 'h1, [data-testid="dashboard-header"]',
  };

  /**
   * @param {object} [opts]
   * @param {number} [opts.timeout]  Override assertion timeout for the header wait.
   */
  async waitForLoad(opts = {}) {
    await this.waitForReady(DashboardPage.SELECTORS.header, opts);
  }
}
