// Minimal vendored HTML summary renderer for Euripid.
// Replaces the external k6-reporter dependency with a local, stable report.

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return escapeHtml(value);
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2);
}

function renderMetrics(metrics) {
  const rows = Object.entries(metrics || {}).map(([name, metric]) => {
    const values = metric && metric.values ? metric.values : {};
    const columns = ['type', 'count', 'rate', 'avg', 'min', 'med', 'max', 'p(90)', 'p(95)'];
    const cells = columns.map((key) => {
      const raw = key === 'type' ? metric.type : values[key];
      return `<td>${raw === undefined ? '' : formatNumber(raw)}</td>`;
    }).join('');
    return `<tr><th scope="row">${escapeHtml(name)}</th>${cells}</tr>`;
  });

  if (rows.length === 0) {
    return '<p>No metrics available.</p>';
  }

  return `
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Type</th>
          <th>Count</th>
          <th>Rate</th>
          <th>Avg</th>
          <th>Min</th>
          <th>Med</th>
          <th>Max</th>
          <th>P90</th>
          <th>P95</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderRootGroup(group, name = 'root') {
  if (!group || typeof group !== 'object') {
    return '<p>No group data available.</p>';
  }

  const checks = Object.entries(group.checks || {}).map(([checkName, checkData]) => (
    `<li>${escapeHtml(checkName)}: passes=${formatNumber(checkData.passes || 0)}, fails=${formatNumber(checkData.fails || 0)}</li>`
  )).join('');

  const children = Object.entries(group.groups || {}).map(([childName, childGroup]) => (
    `<li>${renderRootGroup(childGroup, childName)}</li>`
  )).join('');

  return `
    <details open>
      <summary>${escapeHtml(name)}</summary>
      ${checks ? `<ul>${checks}</ul>` : '<p>No checks.</p>'}
      ${children ? `<ul>${children}</ul>` : ''}
    </details>
  `;
}

export function htmlReport(data, options = {}) {
  const title = options.title || 'Euripid';
  const metrics = renderMetrics(data && data.metrics ? data.metrics : {});
  const groups = renderRootGroup(data && data.root_group ? data.root_group : null);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; line-height: 1.4; color: #222; }
    h1, h2 { margin-bottom: 12px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
    thead th { background: #f5f5f5; }
    summary { cursor: pointer; font-weight: 600; }
    section { margin-top: 24px; }
    code { background: #f5f5f5; padding: 1px 4px; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>Local Euripid report generated without remote runtime imports.</p>
  <section>
    <h2>Metrics</h2>
    ${metrics}
  </section>
  <section>
    <h2>Groups And Checks</h2>
    ${groups}
  </section>
</body>
</html>`;
}
