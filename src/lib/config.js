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

function validateProfile(p) {
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
}

function validateEnvironment(e) {
  const required = ['name', 'baseUrl', 'timeouts'];
  const missing = required.filter((f) => e[f] === undefined);
  if (missing.length) {
    throw new Error(`Environment ${ENV_FILE}: missing required fields: ${missing.join(', ')}`);
  }
  if (typeof e.timeouts !== 'object' || e.timeouts === null || Array.isArray(e.timeouts)) {
    throw new Error(`Environment ${ENV_FILE}: 'timeouts' must be a plain object`);
  }
  if (!e.timeouts.navigation || !e.timeouts.action) {
    throw new Error(`Environment ${ENV_FILE}: timeouts must include 'navigation' and 'action'`);
  }
  const numeric = ['navigation', 'action', 'assertion'];
  for (const k of numeric) {
    if (e.timeouts[k] !== undefined && (typeof e.timeouts[k] !== 'number' || e.timeouts[k] <= 0)) {
      throw new Error(`Environment ${ENV_FILE}: timeouts.${k} must be a positive number (ms)`);
    }
  }
}

function validateOptionalLogging(e) {
  if (!e.logging) {
    return;
  }
  const L = e.logging;
  if (typeof L !== 'object' || Array.isArray(L)) {
    throw new Error(`Environment ${ENV_FILE}: 'logging' must be an object`);
  }
  const allowed = ['level', 'logScenarioErrors', 'includeStack', 'includeUserContext'];
  for (const k of Object.keys(L)) {
    if (!allowed.includes(k)) {
      throw new Error(`Environment ${ENV_FILE}: unknown logging field '${k}'`);
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
    'rate', 'timeUnit', 'preAllocatedVUs', 'maxVUs',
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
