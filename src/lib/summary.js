// src/lib/summary.js
// Shared handleSummary used by every scenario. Writes to RUN_OUTPUT_DIR if
// the orchestrator passed one (parallel-run safe), otherwise falls back to
// results/ for direct k6 invocations.

import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/3.0.4/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

const OUT = (__ENV.RUN_OUTPUT_DIR || 'results').replace(/\/$/, '');

export function handleSummary(data) {
  return {
    [`${OUT}/summary.html`]: htmlReport(data),
    [`${OUT}/summary.json`]: JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
