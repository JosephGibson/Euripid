// src/lib/summary.js
// Shared handleSummary used by every scenario. Writes to RUN_OUTPUT_DIR if
// the orchestrator passed one (parallel-run safe), otherwise falls back to
// results/ for direct k6 invocations.

import { htmlReport } from '../vendor/html-report.js';
import { textSummary } from '../vendor/text-summary.js';

const OUT = (__ENV.RUN_OUTPUT_DIR || 'results').replace(/\/$/, '');
const WRITE_FULL_SUMMARY = (__ENV.EURIPID_WRITE_FULL_SUMMARY || '').toLowerCase() === 'true';

const ENV_LABEL = (__ENV.ENV_FILE || '').replace(/.*\//, '').replace('.json', '');
const REPORT_TITLE = ENV_LABEL ? `Euripid — ${ENV_LABEL}` : 'Euripid';

function buildPersistedSummary(data) {
  if (WRITE_FULL_SUMMARY) {
    return JSON.stringify(data, null, 2);
  }

  const metrics = {};
  for (const [name, metric] of Object.entries(data.metrics || {})) {
    metrics[name] = {
      type: metric.type,
      contains: metric.contains,
      values: metric.values || {},
      thresholds: metric.thresholds || {},
    };
  }

  return JSON.stringify({
    root_group: data.root_group || {},
    options: data.options || {},
    state: data.state || {},
    metrics,
  }, null, 2);
}

export function handleSummary(data) {
  return {
    [`${OUT}/summary.html`]: htmlReport(data, { title: REPORT_TITLE }),
    [`${OUT}/summary.json`]: buildPersistedSummary(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
