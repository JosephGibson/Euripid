import {
  navigationDuration,
  pageLoadDuration,
  transactionDuration,
  userActionDuration,
} from './metrics.ts';

/** Wraps an outer user journey, recording total elapsed time tagged with `transaction`. */
export async function withTransaction<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    transactionDuration.add(Date.now() - startedAt, { transaction: name });
  }
}

/** Wraps a full-page navigation (goto / waitForNavigation), recording elapsed time tagged with `transaction`. */
export async function withNavigation<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    navigationDuration.add(Date.now() - startedAt, { transaction: name });
  }
}

/** Wraps a discrete user interaction (click, fill, submit), recording elapsed time tagged with `transaction`. */
export async function withUserAction<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    userActionDuration.add(Date.now() - startedAt, { transaction: name });
  }
}

/** Wraps a post-navigation readiness check (waitFor, assertVisible), recording elapsed time tagged with `transaction`. */
export async function withPageLoad<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    pageLoadDuration.add(Date.now() - startedAt, { transaction: name });
  }
}
