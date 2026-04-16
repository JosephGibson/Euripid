import type { BrowserElementState, BrowserPageLike, EuripidEnvironment } from '../../types/index.ts';

const SCREENSHOT_DIR = `${(__ENV.RUN_OUTPUT_DIR || 'results').replace(/\/$/, '')}/screenshots`;

const TIMEOUT_DEFAULTS = {
  navigation: 30000,
  action: 15000,
  assertion: 10000,
} as const;

export class BasePage {
  protected page: BrowserPageLike;
  protected env: EuripidEnvironment;

  constructor(page: BrowserPageLike, env: EuripidEnvironment) {
    this.page = page;
    this.env = env;
  }

  resolveTimeout(kind: keyof typeof TIMEOUT_DEFAULTS, override?: number): number {
    if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
      return override;
    }

    const configuredTimeout = this.env.timeouts?.[kind];
    if (
      typeof configuredTimeout === 'number' &&
      Number.isFinite(configuredTimeout) &&
      configuredTimeout > 0
    ) {
      return configuredTimeout;
    }

    return TIMEOUT_DEFAULTS[kind];
  }

  async goto(path = '/'): Promise<void> {
    const url = `${this.env.baseUrl.replace(/\/$/, '')}${path}`;
    await this.page.goto(url, {
      waitUntil: 'load',
      timeout: this.resolveTimeout('navigation'),
    });
  }

  async screenshot(name: string): Promise<void> {
    const fileName = `${name}-vu${__VU}-${Date.now()}.png`;
    try {
      await this.page.screenshot({ path: `${SCREENSHOT_DIR}/${fileName}` });
    } catch (error) {
      if (__ENV.RUN_OUTPUT_DIR) {
        throw error;
      }

      await this.page.screenshot({ path: `results-${fileName}` });
    }
  }

  async waitForReady(
    selector: string,
    opts: { state?: BrowserElementState; timeout?: number } = {},
  ): Promise<void> {
    const timeout = this.resolveTimeout('assertion', opts.timeout);
    await this.page.locator(selector).waitFor({
      state: opts.state || 'visible',
      timeout,
    });
  }
}
