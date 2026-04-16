import type { BrowserPageLike } from './browser.ts';

export type EuripidLogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface EuripidTimeouts {
  navigation: number;
  action: number;
  assertion?: number;
}

export interface EuripidLoggingConfig {
  level?: EuripidLogLevel;
  logScenarioErrors?: boolean;
  includeStack?: boolean;
  includeUserContext?: boolean;
}

export interface EuripidEnvironment {
  name: string;
  description?: string;
  baseUrl: string;
  authUrl?: string;
  apiUrl?: string;
  tenantId?: string;
  timeouts: EuripidTimeouts;
  logging?: EuripidLoggingConfig;
  [key: string]: unknown;
}

export interface ProjectMetadata {
  key: string;
  name: string;
  description?: string;
  defaultDataFile?: string;
}

export interface ProjectConfig {
  project: ProjectMetadata;
  environments: Record<string, EuripidEnvironment>;
}

export type ProfileExecutor =
  | 'shared-iterations'
  | 'per-vu-iterations'
  | 'constant-vus'
  | 'ramping-vus'
  | 'constant-arrival-rate'
  | 'ramping-arrival-rate';

export interface ProfileStage {
  duration: string;
  target: number;
}

export interface ProfileConfig {
  name?: string;
  description?: string;
  executor: ProfileExecutor;
  vus?: number;
  iterations?: number;
  maxDuration?: string;
  duration?: string;
  startVUs?: number;
  stages?: ProfileStage[];
  gracefulRampDown?: string;
  gracefulStop?: string;
  rate?: number;
  startRate?: number;
  timeUnit?: string;
  preAllocatedVUs?: number;
  maxVUs?: number;
  thresholds?: Record<string, string[]>;
  [key: string]: unknown;
}

export interface ScenarioLogContext {
  scenario?: string;
  phase?: string;
  err: unknown;
  user?: Record<string, unknown>;
}

export interface FlowContext {
  scenario?: string;
}

export type DatasetRow = Record<string, string>;

export interface SummaryMetric {
  type?: string;
  contains?: string;
  values?: Record<string, number>;
  thresholds?: Record<string, unknown>;
}

export interface SummaryDataShape {
  metrics?: Record<string, SummaryMetric>;
  root_group?: unknown;
  options?: unknown;
  state?: unknown;
  [key: string]: unknown;
}

export interface PageContext {
  page: BrowserPageLike;
  env: EuripidEnvironment;
}
