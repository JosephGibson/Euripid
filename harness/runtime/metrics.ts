import { Counter, Trend } from 'k6/metrics';

export const dataErrors = new Counter('data_errors');

export const transactionDuration = new Trend('transaction_duration', true);
export const navigationDuration = new Trend('navigation_duration', true);
export const userActionDuration = new Trend('user_action_duration', true);
export const pageLoadDuration = new Trend('page_load_duration', true);

export const scenarioErrors = new Counter('scenario_errors');
