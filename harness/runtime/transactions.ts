import {
  navigationDuration,
  pageLoadDuration,
  transactionDuration,
  userActionDuration,
} from './metrics.ts';

export async function withTransaction<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    transactionDuration.add(Date.now() - startedAt, { transaction: name });
  }
}

export async function withNavigation<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    navigationDuration.add(Date.now() - startedAt, { transaction: name });
  }
}

export async function withUserAction<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    userActionDuration.add(Date.now() - startedAt, { transaction: name });
  }
}

export async function withPageLoad<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();
  try {
    return await fn();
  } finally {
    pageLoadDuration.add(Date.now() - startedAt, { transaction: name });
  }
}
