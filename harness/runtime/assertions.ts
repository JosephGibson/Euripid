import { check } from 'k6';
import type { BrowserElementState, BrowserPageLike, EuripidEnvironment } from '../types/index.ts';

const FALLBACK_ASSERTION_TIMEOUT_MS = 10000;

export function resolveAssertionTimeout(
  env: EuripidEnvironment,
  override?: number,
): number {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return override;
  }

  const configuredTimeout = env?.timeouts?.assertion;
  if (
    typeof configuredTimeout === 'number' &&
    Number.isFinite(configuredTimeout) &&
    configuredTimeout > 0
  ) {
    return configuredTimeout;
  }

  return FALLBACK_ASSERTION_TIMEOUT_MS;
}

export async function assertElement(
  page: BrowserPageLike,
  selector: string,
  checkName: string,
  env: EuripidEnvironment,
  opts: { timeout?: number; state?: BrowserElementState; failFast?: boolean } = {},
): Promise<boolean> {
  const timeout = resolveAssertionTimeout(env, opts.timeout);
  const state = opts.state || 'visible';
  const failFast = opts.failFast === true;

  let found = false;
  try {
    await page.locator(selector).waitFor({ state, timeout });
    found = true;
  } catch {
    // Element did not reach the requested state within timeout.
  }

  const passed = check(found, { [checkName]: (value: boolean) => value === true });
  if (!passed && failFast) {
    throw new Error(
      `Assertion failed: ${checkName} — selector "${selector}" did not reach state "${state}" within ${timeout} ms`,
    );
  }

  return passed;
}

export async function assertVisible(
  page: BrowserPageLike,
  selector: string,
  checkName: string,
  env: EuripidEnvironment,
  opts: { timeout?: number; failFast?: boolean } = {},
): Promise<boolean> {
  return await assertElement(page, selector, checkName, env, { ...opts, state: 'visible' });
}

export async function assertHidden(
  page: BrowserPageLike,
  selector: string,
  checkName: string,
  env: EuripidEnvironment,
  opts: { timeout?: number; failFast?: boolean } = {},
): Promise<boolean> {
  return await assertElement(page, selector, checkName, env, { ...opts, state: 'hidden' });
}

export async function assertText(
  page: BrowserPageLike,
  selector: string,
  predicate: (text: string | null) => boolean,
  checkName: string,
  env: EuripidEnvironment,
  opts: { timeout?: number; state?: BrowserElementState; failFast?: boolean } = {},
): Promise<boolean> {
  const timeout = resolveAssertionTimeout(env, opts.timeout);
  const state = opts.state || 'visible';
  const failFast = opts.failFast === true;
  const deadline = Date.now() + timeout;

  let text: string | null = null;
  try {
    await page.locator(selector).waitFor({ state, timeout });
    const remaining = Math.max(1, deadline - Date.now());
    text = await page.locator(selector).textContent({ timeout: remaining });
  } catch {
    // Element didn't appear or text couldn't be read within timeout.
  }

  const passed = check(text, { [checkName]: predicate });
  if (!passed && failFast) {
    throw new Error(
      `Assertion failed: ${checkName} — selector "${selector}" text did not satisfy predicate within ${timeout} ms`,
    );
  }

  return passed;
}
