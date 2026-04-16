import { htmlReport } from '../vendor/html-report.js';
import { textSummary } from '../vendor/text-summary.js';
import type { SummaryDataShape } from '../types/index.ts';

const OUT = (__ENV.RUN_OUTPUT_DIR || 'results').replace(/\/$/, '');
const WRITE_FULL_SUMMARY = String(__ENV.EURIPID_WRITE_FULL_SUMMARY || '').toLowerCase() === 'true';
const PROJECT_LABEL = __ENV.PROJECT || '';
const ENV_LABEL = __ENV.ENVIRONMENT || '';
const REPORT_TITLE = [PROJECT_LABEL, ENV_LABEL].filter(Boolean).join(' / ') || 'Euripid';

interface SummaryStateShape {
  testRunDurationMs?: number;
}

interface ReportMetadata {
  title: string;
  project?: string;
  environment?: string;
  generatedAt: string;
  generatedAtEpochMs: number;
  testRunDurationMs?: number;
}

function buildReportMetadata(data: SummaryDataShape): ReportMetadata {
  const now = new Date();
  const state = ((data.state && typeof data.state === 'object') ? data.state : {}) as SummaryStateShape;
  const duration = typeof state.testRunDurationMs === 'number' && Number.isFinite(state.testRunDurationMs)
    ? state.testRunDurationMs
    : undefined;

  return {
    title: `Euripid — ${REPORT_TITLE}`,
    project: PROJECT_LABEL || undefined,
    environment: ENV_LABEL || undefined,
    generatedAt: now.toISOString(),
    generatedAtEpochMs: now.getTime(),
    testRunDurationMs: duration,
  };
}

function buildPersistedSummary(data: SummaryDataShape, report: ReportMetadata): string {
  if (WRITE_FULL_SUMMARY) {
    return JSON.stringify(
      {
        ...data,
        report,
      },
      null,
      2,
    );
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
      report,
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
  const report = buildReportMetadata(data);

  return {
    [`${OUT}/summary.html`]: htmlReport(data, { title: report.title, report }),
    [`${OUT}/summary.json`]: buildPersistedSummary(data, report),
    stdout: textSummary(data, { indent: ' ', enableColors: true, report }),
  };
}
