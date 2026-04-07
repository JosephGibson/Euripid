// src/lib/logging.js
// Structured scenario error lines on stderr (captured into k6-console.log by run.ps1).
// Controlled by environment JSON `logging` and optional __ENV overrides (see resolveLoggingConfig).

import { scenarioErrors } from './metrics.js';

function envBool(raw, defaultVal) {
  if (raw === undefined || raw === '') {
    return defaultVal;
  }
  return raw === 'true' || raw === '1';
}

/**
 * Resolved config: env JSON + __ENV.EURIPID_* overrides.
 */
export function resolveLoggingConfig(env) {
  const L = env.logging || {};
  const allowed = ['error', 'warn', 'info', 'debug'];
  const rawLevel = (__ENV.EURIPID_LOG_LEVEL || L.level || 'error').toLowerCase();
  const invalidLevel = !allowed.includes(rawLevel) ? rawLevel : null;
  const level = invalidLevel ? 'error' : rawLevel;
  return {
    /** Reserved for future verbose / non-error log lines. */
    level,
    invalidLevel,
    logScenarioErrors: envBool(__ENV.EURIPID_LOG_SCENARIO_ERRORS, L.logScenarioErrors !== false),
    includeStack: envBool(__ENV.EURIPID_INCLUDE_STACK, L.includeStack !== false),
    /** When true, include non-secret user hints (e.g. role) in error payloads. Never logs passwords. */
    includeUserContext: envBool(__ENV.EURIPID_INCLUDE_USER_CONTEXT, L.includeUserContext === true),
  };
}

function userHint(user, cfg) {
  if (!cfg.includeUserContext || !user || typeof user !== 'object') {
    return undefined;
  }
  const hint = {};
  if (user.role !== undefined) {
    hint.role = String(user.role);
  }
  if (user.username !== undefined) {
    hint.username = String(user.username);
  }
  return Object.keys(hint).length ? hint : undefined;
}

/**
 * Log a failure with structured JSON (one line) for grep and downstream tools.
 * Increments `scenario_errors` for the HTML/JSON summary.
 *
 * @param {object} env From config.js
 * @param {object} ctx
 * @param {string} [ctx.scenario] k6 scenario name
 * @param {string} [ctx.phase] e.g. data | iteration | open_login | login_flow
 * @param {Error|unknown} ctx.err
 * @param {object} [ctx.user] CSV row — password never included
 */
export function logScenarioError(env, ctx) {
  const cfg = resolveLoggingConfig(env);
  const scenario = ctx.scenario || 'unknown';
  const phase = ctx.phase || 'unknown';
  scenarioErrors.add(1, { phase, scenario });

  if (!cfg.logScenarioErrors) {
    return;
  }

  const err = ctx.err;
  const message = err && err.message ? String(err.message) : String(err);

  const payload = {
    type: 'euripid_scenario_error',
    ts: new Date().toISOString(),
    env: env.name,
    scenario,
    phase,
    vu: __VU,
    iteration: __ITER,
    message,
  };
  const hint = userHint(ctx.user, cfg);
  if (hint) {
    payload.user = hint;
  }

  if (cfg.invalidLevel) {
    payload.logging_warning = `Invalid logging.level '${cfg.invalidLevel}' resolved as 'error'`;
  }

  console.error(`EURIPID_ERROR ${JSON.stringify(payload)}`);
  if (cfg.includeStack && err && err.stack) {
    console.error(String(err.stack));
  }
}
