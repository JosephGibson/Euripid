import type { EuripidEnvironment, ProfileConfig, ProfileStage, ProjectConfig } from '../types/index.ts';

const ROOT_PREFIX = '../../';

const REQUIRED_BY_EXECUTOR: Record<ProfileConfig['executor'], string[]> = {
  'shared-iterations': ['vus', 'iterations'],
  'per-vu-iterations': ['vus', 'iterations'],
  'constant-vus': ['vus', 'duration'],
  'ramping-vus': ['stages'],
  'constant-arrival-rate': ['rate', 'timeUnit', 'duration', 'preAllocatedVUs'],
  'ramping-arrival-rate': ['stages', 'preAllocatedVUs'],
};

const PROJECT_CONFIG_FILE = __ENV.PROJECT_CONFIG_FILE || 'projects/template-project/project.config.json';
const PROFILE_FILE = __ENV.PROFILE_FILE || 'projects/template-project/profiles/smoke.json';
export const environmentKey = __ENV.ENVIRONMENT || 'dev';
export const projectKey = __ENV.PROJECT || PROJECT_CONFIG_FILE.split('/')[1] || 'template-project';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function validatePositiveFiniteNumber(value: unknown, label: string): asserts value is number {
  if (!isPositiveFiniteNumber(value)) {
    throw new Error(`${label} must be a positive finite number`);
  }
}

function validatePositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function validateDurationString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty duration string`);
  }
}

function validateThresholds(thresholds: unknown, label: string): void {
  if (thresholds === undefined) {
    return;
  }
  if (!isPlainObject(thresholds)) {
    throw new Error(`${label} must be an object`);
  }

  for (const [metric, rules] of Object.entries(thresholds)) {
    const invalidRules =
      !Array.isArray(rules) ||
      rules.length === 0 ||
      rules.some((rule) => typeof rule !== 'string' || rule.trim() === '');
    if (invalidRules) {
      throw new Error(`${label}.${metric} must be a non-empty array of strings`);
    }
  }
}

function validateStages(stages: unknown, label: string): asserts stages is ProfileStage[] {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }

  stages.forEach((stage, index) => {
    if (!isPlainObject(stage)) {
      throw new Error(`${label}[${index}] must be an object`);
    }
    validateDurationString(stage.duration, `${label}[${index}].duration`);
    if (!isNonNegativeInteger(stage.target)) {
      throw new Error(`${label}[${index}].target must be a non-negative integer`);
    }
  });
}

function validateEnvironment(
  env: unknown,
  label: string,
): asserts env is EuripidEnvironment {
  if (!isPlainObject(env)) {
    throw new Error(`${label}: expected a JSON object`);
  }

  const required = ['name', 'baseUrl', 'timeouts'];
  const missing = required.filter((field) => env[field] === undefined);
  if (missing.length > 0) {
    throw new Error(`${label}: missing required fields: ${missing.join(', ')}`);
  }

  if (typeof env.name !== 'string' || env.name.trim() === '') {
    throw new Error(`${label}: 'name' must be a non-empty string`);
  }

  if (typeof env.baseUrl !== 'string' || env.baseUrl.trim() === '') {
    throw new Error(`${label}: 'baseUrl' must be a non-empty string`);
  }

  if (!isPlainObject(env.timeouts)) {
    throw new Error(`${label}: 'timeouts' must be a plain object`);
  }
  const timeouts = env.timeouts as Record<string, unknown>;

  if (timeouts.navigation === undefined || timeouts.action === undefined) {
    throw new Error(`${label}: timeouts must include 'navigation' and 'action'`);
  }

  ['navigation', 'action', 'assertion'].forEach((key) => {
    if (timeouts[key] !== undefined) {
      validatePositiveFiniteNumber(timeouts[key], `${label}: timeouts.${key}`);
    }
  });

  if (env.logging !== undefined) {
    validateLogging(env.logging, `${label}: logging`);
  }
}

function validateLogging(logging: unknown, label: string): void {
  if (!isPlainObject(logging)) {
    throw new Error(`${label} must be an object`);
  }

  const allowed = ['level', 'logScenarioErrors', 'includeStack', 'includeUserContext'];
  Object.keys(logging).forEach((key) => {
    if (!allowed.includes(key)) {
      throw new Error(`${label}: unknown field '${key}'`);
    }
  });

  const validLevels = ['error', 'warn', 'info', 'debug'];
  if (
    logging.level !== undefined &&
    !validLevels.includes(String(logging.level).toLowerCase())
  ) {
    throw new Error(`${label}.level must be one of error|warn|info|debug`);
  }

  ['logScenarioErrors', 'includeStack', 'includeUserContext'].forEach((key) => {
    if (logging[key] !== undefined && typeof logging[key] !== 'boolean') {
      throw new Error(`${label}.${key} must be boolean`);
    }
  });
}

function validateProjectConfig(config: unknown): asserts config is ProjectConfig {
  if (!isPlainObject(config)) {
    throw new Error(`Project config ${PROJECT_CONFIG_FILE}: expected a JSON object`);
  }

  if (!isPlainObject(config.project)) {
    throw new Error(`Project config ${PROJECT_CONFIG_FILE}: missing required object 'project'`);
  }

  if (typeof config.project.key !== 'string' || config.project.key.trim() === '') {
    throw new Error(`Project config ${PROJECT_CONFIG_FILE}: project.key must be a non-empty string`);
  }

  if (typeof config.project.name !== 'string' || config.project.name.trim() === '') {
    throw new Error(`Project config ${PROJECT_CONFIG_FILE}: project.name must be a non-empty string`);
  }

  if (
    config.project.defaultDataFile !== undefined &&
    (typeof config.project.defaultDataFile !== 'string' || config.project.defaultDataFile.trim() === '')
  ) {
    throw new Error(
      `Project config ${PROJECT_CONFIG_FILE}: project.defaultDataFile must be a non-empty string`,
    );
  }

  if (!isPlainObject(config.environments) || Object.keys(config.environments).length === 0) {
    throw new Error(`Project config ${PROJECT_CONFIG_FILE}: environments must be a non-empty object`);
  }

  Object.entries(config.environments).forEach(([key, env]) => {
    validateEnvironment(env, `Environment '${key}' in ${PROJECT_CONFIG_FILE}`);
  });
}

function validateProfile(profileConfig: unknown): asserts profileConfig is ProfileConfig {
  if (!isPlainObject(profileConfig)) {
    throw new Error(`Profile ${PROFILE_FILE}: expected a JSON object`);
  }

  if (!profileConfig.executor) {
    throw new Error(`Profile ${PROFILE_FILE}: missing required field 'executor'`);
  }

  const executor = String(profileConfig.executor) as ProfileConfig['executor'];
  if (!(executor in REQUIRED_BY_EXECUTOR)) {
    throw new Error(
      `Profile ${PROFILE_FILE}: unknown executor '${executor}'. Supported: ${Object.keys(REQUIRED_BY_EXECUTOR).join(', ')}`,
    );
  }

  const missing = REQUIRED_BY_EXECUTOR[executor].filter((field) => profileConfig[field] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Profile ${PROFILE_FILE}: executor '${executor}' requires fields: ${missing.join(', ')}`,
    );
  }

  switch (executor) {
    case 'shared-iterations':
    case 'per-vu-iterations':
      validatePositiveInteger(profileConfig.vus, `Profile ${PROFILE_FILE}: vus`);
      validatePositiveInteger(profileConfig.iterations, `Profile ${PROFILE_FILE}: iterations`);
      break;
    case 'constant-vus':
      validatePositiveInteger(profileConfig.vus, `Profile ${PROFILE_FILE}: vus`);
      validateDurationString(profileConfig.duration, `Profile ${PROFILE_FILE}: duration`);
      break;
    case 'ramping-vus':
      validateStages(profileConfig.stages, `Profile ${PROFILE_FILE}: stages`);
      if (profileConfig.startVUs !== undefined && !isNonNegativeInteger(profileConfig.startVUs)) {
        throw new Error(`Profile ${PROFILE_FILE}: startVUs must be a non-negative integer`);
      }
      if (profileConfig.gracefulRampDown !== undefined) {
        validateDurationString(
          profileConfig.gracefulRampDown,
          `Profile ${PROFILE_FILE}: gracefulRampDown`,
        );
      }
      break;
    case 'constant-arrival-rate':
      validatePositiveFiniteNumber(profileConfig.rate, `Profile ${PROFILE_FILE}: rate`);
      validateDurationString(profileConfig.timeUnit, `Profile ${PROFILE_FILE}: timeUnit`);
      validateDurationString(profileConfig.duration, `Profile ${PROFILE_FILE}: duration`);
      validatePositiveInteger(
        profileConfig.preAllocatedVUs,
        `Profile ${PROFILE_FILE}: preAllocatedVUs`,
      );
      if (profileConfig.maxVUs !== undefined) {
        validatePositiveInteger(profileConfig.maxVUs, `Profile ${PROFILE_FILE}: maxVUs`);
      }
      break;
    case 'ramping-arrival-rate':
      validateStages(profileConfig.stages, `Profile ${PROFILE_FILE}: stages`);
      validatePositiveInteger(
        profileConfig.preAllocatedVUs,
        `Profile ${PROFILE_FILE}: preAllocatedVUs`,
      );
      if (profileConfig.startRate !== undefined) {
        validatePositiveFiniteNumber(profileConfig.startRate, `Profile ${PROFILE_FILE}: startRate`);
      }
      if (profileConfig.timeUnit !== undefined) {
        validateDurationString(profileConfig.timeUnit, `Profile ${PROFILE_FILE}: timeUnit`);
      }
      if (profileConfig.maxVUs !== undefined) {
        validatePositiveInteger(profileConfig.maxVUs, `Profile ${PROFILE_FILE}: maxVUs`);
      }
      break;
  }

  if (profileConfig.maxDuration !== undefined) {
    validateDurationString(profileConfig.maxDuration, `Profile ${PROFILE_FILE}: maxDuration`);
  }
  if (profileConfig.gracefulStop !== undefined) {
    validateDurationString(profileConfig.gracefulStop, `Profile ${PROFILE_FILE}: gracefulStop`);
  }
  validateThresholds(profileConfig.thresholds, `Profile ${PROFILE_FILE}: thresholds`);
}

function openJson<T>(file: string): T {
  return JSON.parse(open(ROOT_PREFIX + file)) as T;
}

export const projectConfig = openJson<ProjectConfig>(PROJECT_CONFIG_FILE);
validateProjectConfig(projectConfig);

if (!projectConfig.environments[environmentKey]) {
  throw new Error(
    `Project config ${PROJECT_CONFIG_FILE}: unknown environment '${environmentKey}'. Available: ${Object.keys(projectConfig.environments).join(', ')}`,
  );
}

export const project = projectConfig.project;
export const projectRoot = PROJECT_CONFIG_FILE.replace(/\/[^/]+$/, '');
export const environment = projectConfig.environments[environmentKey];

export const profile = openJson<ProfileConfig>(PROFILE_FILE);
validateProfile(profile);

export function buildProjectPath(...segments: string[]): string {
  return [projectRoot, ...segments].join('/');
}

export function buildOptions(scenarioName: string): Record<string, unknown> {
  const scenario: Record<string, unknown> = { executor: profile.executor };
  const passthrough: Array<keyof ProfileConfig> = [
    'vus',
    'iterations',
    'maxDuration',
    'duration',
    'startVUs',
    'stages',
    'gracefulRampDown',
    'gracefulStop',
    'rate',
    'startRate',
    'timeUnit',
    'preAllocatedVUs',
    'maxVUs',
  ];

  passthrough.forEach((field) => {
    if (profile[field] !== undefined) {
      scenario[field] = profile[field];
    }
  });

  scenario.options = { browser: { type: 'chromium' } };

  return {
    scenarios: { [scenarioName]: scenario },
    thresholds: profile.thresholds || {},
  };
}
