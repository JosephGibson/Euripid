// Minimal vendored text summary formatter for Euripid.
// Provides a small subset of k6-summary output used by handleSummary().

function formatValue(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return String(value);
  }
  if (Math.abs(value) >= 1000 || Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2);
}

function metricLine(name, metric) {
  const values = metric && metric.values ? metric.values : {};
  const parts = [];
  for (const key of ['count', 'rate', 'avg', 'min', 'med', 'max', 'p(90)', 'p(95)']) {
    if (values[key] !== undefined) {
      parts.push(`${key}=${formatValue(values[key])}`);
    }
  }
  return `${name}: ${parts.join(' ')}`.trim();
}

export function textSummary(data, options = {}) {
  const indent = options.indent || ' ';
  const metrics = data && data.metrics ? data.metrics : {};
  const report = options.report || {};
  const lines = ['Euripid summary'];

  if (report.generatedAt) {
    lines.push(`${indent}generated_at=${report.generatedAt}`);
  }
  if (report.project) {
    lines.push(`${indent}project=${report.project}`);
  }
  if (report.environment) {
    lines.push(`${indent}environment=${report.environment}`);
  }
  if (typeof report.testRunDurationMs === 'number') {
    lines.push(`${indent}duration_ms=${formatValue(report.testRunDurationMs)}`);
  }

  for (const [name, metric] of Object.entries(metrics)) {
    lines.push(`${indent}${metricLine(name, metric)}`);
  }

  return `${lines.join('\n')}\n`;
}
