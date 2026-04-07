// src/lib/config.js
// Loads environment + profile JSON files at init context and builds k6 options.
//
// CONTRACT: paths in ENV_FILE / PROFILE_FILE are repo-root-relative. Because
// this file lives at src/lib/, we prepend '../../' to anchor open() at the
// repo root. If you move this file, update ROOT_PREFIX accordingly.
//
// k6 only allows open() at init context, so this module MUST be imported
// at the top of scenario files, not lazily.

const ROOT_PREFIX = '../../';

const ENV_FILE = __ENV.ENV_FILE || 'config/environments/dev.json';
const PROFILE_FILE = __ENV.PROFILE_FILE || 'config/profiles/smoke.json';

export const environment = JSON.parse(open(ROOT_PREFIX + ENV_FILE));
export const profile = JSON.parse(open(ROOT_PREFIX + PROFILE_FILE));

// --- Schema validation -------------------------------------------------------
// Fail fast with a useful message if a profile is malformed. A typo here
// otherwise produces a cryptic k6 options error.

const REQUIRED_BY_EXECUTOR = {
  'shared-iterations':     ['vus', 'iterations'],
  'per-vu-iterations':     ['vus', 'iterations'],
  'constant-vus':          ['vus', 'duration'],
  'ramping-vus':           ['stages'],
  'constant-arrival-rate': ['rate', 'timeUnit', 'duration', 'preAllocatedVUs'],
  'ramping-arrival-rate':  ['stages', 'preAllocatedVUs'],
};

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validatePositiveFiniteNumber(value, label) {
  if (!isPositiveFiniteNumber(value)) {
    throw new Error(`${label} must be a positive finite number`);
  }
}

function validatePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

function validateDurationString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty duration string`);
  }
}

function validateThresholds(thresholds, label) {
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

function validateStages(stages, label) {
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new Error(`${label} must be a non-empty array`);
  }
  for (let i = 0; i < stages.length; i += 1) {
    const stage = stages[i];
    if (!isPlainObject(stage)) {
      throw new Error(`${label}[${i}] must be an object`);
    }
    validateDurationString(stage.duration, `${label}[${i}].duration`);
    if (!isNonNegativeInteger(stage.target)) {
      throw new Error(`${label}[${i}].target must be a non-negative integer`);
    }
  }
}

function validateExecutorShape(p) {
  switch (p.executor) {
    case 'shared-iterations':
    case 'per-vu-iterations':
      validatePositiveInteger(p.vus, `Profile ${PROFILE_FILE}: vus`);
      validatePositiveInteger(p.iterations, `Profile ${PROFILE_FILE}: iterations`);
      break;
    case 'constant-vus':
      validatePositiveInteger(p.vus, `Profile ${PROFILE_FILE}: vus`);
      validateDurationString(p.duration, `Profile ${PROFILE_FILE}: duration`);
      break;
    case 'ramping-vus':
      validateStages(p.stages, `Profile ${PROFILE_FILE}: stages`);
      if (p.startVUs !== undefined && !isNonNegativeInteger(p.startVUs)) {
        throw new Error(`Profile ${PROFILE_FILE}: startVUs must be a non-negative integer`);
      }
      if (p.gracefulRampDown !== undefined) {
        validateDurationString(p.gracefulRampDown, `Profile ${PROFILE_FILE}: gracefulRampDown`);
      }
      break;
    case 'constant-arrival-rate':
      validatePositiveFiniteNumber(p.rate, `Profile ${PROFILE_FILE}: rate`);
      validateDurationString(p.timeUnit, `Profile ${PROFILE_FILE}: timeUnit`);
      validateDurationString(p.duration, `Profile ${PROFILE_FILE}: duration`);
      validatePositiveInteger(p.preAllocatedVUs, `Profile ${PROFILE_FILE}: preAllocatedVUs`);
      if (p.maxVUs !== undefined) {
        validatePositiveInteger(p.maxVUs, `Profile ${PROFILE_FILE}: maxVUs`);
      }
      break;
    case 'ramping-arrival-rate':
      validateStages(p.stages, `Profile ${PROFILE_FILE}: stages`);
      validatePositiveInteger(p.preAllocatedVUs, `Profile ${PROFILE_FILE}: preAllocatedVUs`);
      if (p.startRate !== undefined) {
        validatePositiveFiniteNumber(p.startRate, `Profile ${PROFILE_FILE}: startRate`);
      }
      if (p.timeUnit !== undefined) {
        validateDurationString(p.timeUnit, `Profile ${PROFILE_FILE}: timeUnit`);
      }
      if (p.maxVUs !== undefined) {
        validatePositiveInteger(p.maxVUs, `Profile ${PROFILE_FILE}: maxVUs`);
      }
      break;
    default:
      break;
  }

  if (p.maxDuration !== undefined) {
    validateDurationString(p.maxDuration, `Profile ${PROFILE_FILE}: maxDuration`);
  }
  if (p.gracefulStop !== undefined) {
    validateDurationString(p.gracefulStop, `Profile ${PROFILE_FILE}: gracefulStop`);
  }
  validateThresholds(p.thresholds, `Profile ${PROFILE_FILE}: thresholds`);
}

function validateProfile(p) {
  if (!isPlainObject(p)) {
    throw new Error(`Profile ${PROFILE_FILE}: expected a JSON object`);
  }
  if (!p.executor) {
    throw new Error(`Profile ${PROFILE_FILE}: missing required field 'executor'`);
  }
  const required = REQUIRED_BY_EXECUTOR[p.executor];
  if (!required) {
    throw new Error(
      `Profile ${PROFILE_FILE}: unknown executor '${p.executor}'. ` +
      `Supported: ${Object.keys(REQUIRED_BY_EXECUTOR).join(', ')}`
    );
  }
  const missing = required.filter((f) => p[f] === undefined);
  if (missing.length) {
    throw new Error(
      `Profile ${PROFILE_FILE}: executor '${p.executor}' requires fields: ${missing.join(', ')}`
    );
  }
  validateExecutorShape(p);
}

function validateEnvironment(e) {
  if (!isPlainObject(e)) {
    throw new Error(`Environment ${ENV_FILE}: expected a JSON object`);
  }
  const required = ['name', 'baseUrl', 'timeouts'];
  const missing = required.filter((f) => e[f] === undefined);
  if (missing.length) {
    throw new Error(`Environment ${ENV_FILE}: missing required fields: ${missing.join(', ')}`);
  }
  if (typeof e.name !== 'string' || e.name.trim() === '') {
    throw new Error(`Environment ${ENV_FILE}: 'name' must be a non-empty string`);
  }
  if (typeof e.baseUrl !== 'string' || e.baseUrl.trim() === '') {
    throw new Error(`Environment ${ENV_FILE}: 'baseUrl' must be a non-empty string`);
  }
  if (!isPlainObject(e.timeouts)) {
    throw new Error(`Environment ${ENV_FILE}: 'timeouts' must be a plain object`);
  }
  if (e.timeouts.navigation === undefined || e.timeouts.action === undefined) {
    throw new Error(`Environment ${ENV_FILE}: timeouts must include 'navigation' and 'action'`);
  }
  const numeric = ['navigation', 'action', 'assertion'];
  for (const k of numeric) {
    if (e.timeouts[k] !== undefined) {
      validatePositiveFiniteNumber(e.timeouts[k], `Environment ${ENV_FILE}: timeouts.${k}`);
    }
  }
}

function validateOptionalLogging(e) {
  if (!e.logging) {
    return;
  }
  const L = e.logging;
  if (!isPlainObject(L)) {
    throw new Error(`Environment ${ENV_FILE}: 'logging' must be an object`);
  }
  const allowed = ['level', 'logScenarioErrors', 'includeStack', 'includeUserContext'];
  for (const k of Object.keys(L)) {
    if (!allowed.includes(k)) {
      throw new Error(`Environment ${ENV_FILE}: unknown logging field '${k}'`);
    }
  }
  const validLevels = ['error', 'warn', 'info', 'debug'];
  if (L.level !== undefined && !validLevels.includes(String(L.level).toLowerCase())) {
    throw new Error(`Environment ${ENV_FILE}: logging.level must be one of error|warn|info|debug`);
  }
  for (const key of ['logScenarioErrors', 'includeStack', 'includeUserContext']) {
    if (L[key] !== undefined && typeof L[key] !== 'boolean') {
      throw new Error(`Environment ${ENV_FILE}: logging.${key} must be boolean`);
    }
  }
}

validateEnvironment(environment);
validateOptionalLogging(environment);
validateProfile(profile);

// --- Options builder ---------------------------------------------------------

/**
 * Build a k6 `options` object from the loaded profile + a scenario name.
 * One scenario per run (keeping composition simple, per design).
 */
export function buildOptions(scenarioName) {
  const scenario = { executor: profile.executor };

  // Pass through all known executor fields that are present.
  const passthrough = [
    'vus', 'iterations', 'maxDuration', 'duration',
    'startVUs', 'stages', 'gracefulRampDown', 'gracefulStop',
    'rate', 'startRate', 'timeUnit', 'preAllocatedVUs', 'maxVUs',
  ];
  for (const f of passthrough) {
    if (profile[f] !== undefined) scenario[f] = profile[f];
  }

  // k6/browser requires this option on any scenario that drives a browser.
  scenario.options = { browser: { type: 'chromium' } };

  return {
    scenarios: { [scenarioName]: scenario },
    thresholds: profile.thresholds || {},
  };
}
