import { Counter, Trend } from 'k6/metrics';

export const loginDuration = new Trend('flow_login_duration', true);
export const flowDuration = new Trend('flow_total_duration', true);
export const flowErrors = new Counter('flow_errors');
