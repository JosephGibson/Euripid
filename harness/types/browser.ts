export type BrowserElementState = 'visible' | 'attached' | 'hidden' | 'detached';

export interface BrowserLocatorLike {
  waitFor(options?: { state?: BrowserElementState; timeout?: number }): Promise<unknown>;
  fill(value: string, options?: { timeout?: number }): Promise<unknown>;
  click(options?: { timeout?: number }): Promise<unknown>;
  type(value: string, options?: { timeout?: number }): Promise<unknown>;
  textContent(options?: { timeout?: number }): Promise<string | null>;
  count(): Promise<number>;
}

export interface BrowserKeyboardLike {
  press(key: string): Promise<unknown>;
}

export interface BrowserPageLike {
  goto(
    url: string,
    options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'; timeout?: number },
  ): Promise<unknown>;
  locator(selector: string): BrowserLocatorLike;
  screenshot(options: { path: string }): Promise<unknown>;
  title(): Promise<string>;
  close(): Promise<unknown>;
  keyboard?: BrowserKeyboardLike;
}
