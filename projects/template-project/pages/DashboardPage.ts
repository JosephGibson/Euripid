import { BasePage } from '../../../harness/index.ts';

export class DashboardPage extends BasePage {
  static SELECTORS = {
    header: 'h1, [data-testid="dashboard-header"]',
  };

  async waitForLoad(opts: { timeout?: number } = {}): Promise<void> {
    await this.waitForReady(DashboardPage.SELECTORS.header, opts);
  }
}
