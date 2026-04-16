import { htmlReport } from '../vendor/html-report.js';
import { textSummary } from '../vendor/text-summary.js';
import type { SummaryDataShape } from '../types/index.ts';

const OUT = (__ENV.RUN_OUTPUT_DIR || 'results').replace(/\/$/, '');
const WRITE_FULL_SUMMARY = String(__ENV.EURIPID_WRITE_FULL_SUMMARY || '').toLowerCase() === 'true';
const PROJECT_LABEL = __ENV.PROJECT || '';
const ENV_LABEL = __ENV.ENVIRONMENT || '';
const REPORT_TITLE = [PROJECT_LABEL, ENV_LABEL].filter(Boolean).join(' / ') || 'Euripid';

function buildPersistedSummary(data: SummaryDataShape): string {
  if (WRITE_FULL_SUMMARY) {
    return JSON.stringify(data, null, 2);
  }

  const metrics: Record<string, Record<string, unknown>> = {};
  Object.entries(data.metrics || {}).forEach(([name, metric]) => {
    metrics[name] = {
      type: metric.type,
      contains: metric.contains,
      values: metric.values || {},
      thresholds: metric.thresholds || {},
    };
  });

  return JSON.stringify(
    {
      root_group: data.root_group || {},
      options: data.options || {},
      state: data.state || {},
      metrics,
    },
    null,
    2,
  );
}

export function handleSummary(data: SummaryDataShape): Record<string, string> {
  return {
    [`${OUT}/summary.html`]: htmlReport(data, { title: `Euripid — ${REPORT_TITLE}` }),
    [`${OUT}/summary.json`]: buildPersistedSummary(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
