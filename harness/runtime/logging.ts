import type { EuripidEnvironment, EuripidLoggingConfig, ScenarioLogContext } from '../types/index.ts';
import { scenarioErrors } from './metrics.ts';

function envBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  return raw === 'true' || raw === '1';
}

export function resolveLoggingConfig(
  env: EuripidEnvironment,
): Required<EuripidLoggingConfig> & { invalidLevel: string | null } {
  const logging = env.logging || {};
  const allowed = ['error', 'warn', 'info', 'debug'];
  const rawLevel = String(__ENV.EURIPID_LOG_LEVEL || logging.level || 'error').toLowerCase();
  const invalidLevel = allowed.includes(rawLevel) ? null : rawLevel;

  return {
    level: (invalidLevel ? 'error' : rawLevel) as Required<EuripidLoggingConfig>['level'],
    invalidLevel,
    logScenarioErrors: envBool(
      __ENV.EURIPID_LOG_SCENARIO_ERRORS,
      logging.logScenarioErrors !== false,
    ),
    includeStack: envBool(__ENV.EURIPID_INCLUDE_STACK, logging.includeStack !== false),
    includeUserContext: envBool(
      __ENV.EURIPID_INCLUDE_USER_CONTEXT,
      logging.includeUserContext === true,
    ),
  };
}

function buildUserHint(
  user: Record<string, unknown> | undefined,
  includeUserContext: boolean,
): Record<string, string> | undefined {
  if (!includeUserContext || !user) {
    return undefined;
  }

  const hint: Record<string, string> = {};
  if (user.role !== undefined) {
    hint.role = String(user.role);
  }
  if (user.username !== undefined) {
    hint.username = String(user.username);
  }

  return Object.keys(hint).length > 0 ? hint : undefined;
}

export function logScenarioError(env: EuripidEnvironment, ctx: ScenarioLogContext): void {
  const cfg = resolveLoggingConfig(env);
  const scenario = ctx.scenario || 'unknown';
  const phase = ctx.phase || 'unknown';
  scenarioErrors.add(1, { phase, scenario });

  if (!cfg.logScenarioErrors) {
    return;
  }

  const errorValue = ctx.err;
  const message =
    errorValue && typeof errorValue === 'object' && 'message' in errorValue
      ? String((errorValue as { message: unknown }).message)
      : String(errorValue);

  const payload: Record<string, unknown> = {
    type: 'euripid_scenario_error',
    ts: new Date().toISOString(),
    env: env.name,
    scenario,
    phase,
    vu: __VU,
    iteration: __ITER,
    message,
  };

  const hint = buildUserHint(ctx.user, cfg.includeUserContext);
  if (hint) {
    payload.user = hint;
  }

  if (cfg.invalidLevel) {
    payload.logging_warning = `Invalid logging.level '${cfg.invalidLevel}' resolved as 'error'`;
  }

  console.error(`EURIPID_ERROR ${JSON.stringify(payload)}`);

  if (
    cfg.includeStack &&
    errorValue &&
    typeof errorValue === 'object' &&
    'stack' in errorValue &&
    errorValue.stack
  ) {
    console.error(String(errorValue.stack));
  }
}
