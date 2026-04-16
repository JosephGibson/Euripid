import { Counter, Trend } from 'k6/metrics';

/** Counts rows that could not be read or parsed from the CSV dataset. */
export const dataErrors = new Counter('data_errors');

/** Records total elapsed time (ms) for outer user journeys, tagged with `transaction`. */
export const transactionDuration = new Trend('transaction_duration', true);

/** Records elapsed time (ms) for full-page navigations, tagged with `transaction`. */
export const navigationDuration = new Trend('navigation_duration', true);

/** Records elapsed time (ms) for discrete user interactions, tagged with `transaction`. */
export const userActionDuration = new Trend('user_action_duration', true);

/** Records elapsed time (ms) for post-navigation readiness checks, tagged with `transaction`. */
export const pageLoadDuration = new Trend('page_load_duration', true);

/** Counts scenario-level failures that trigger a `logScenarioError()` call. */
export const scenarioErrors = new Counter('scenario_errors');
