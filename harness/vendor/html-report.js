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

function formatTimestamp(value) {
  if (!value) {
    return 'Unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return escapeHtml(value);
  }

  return escapeHtml(date.toISOString().replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC'));
}

function formatDurationMs(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'Unavailable';
  }
  if (value >= 1000) {
    return `${formatNumber(value / 1000)} s`;
  }
  return `${formatNumber(value)} ms`;
}

function extractChecks(group) {
  if (!group || typeof group !== 'object') {
    return [];
  }

  if (Array.isArray(group.checks)) {
    return group.checks;
  }

  return Object.entries(group.checks || {}).map(([name, checkData]) => ({
    name,
    ...checkData,
  }));
}

function extractGroups(group) {
  if (!group || typeof group !== 'object') {
    return [];
  }

  if (Array.isArray(group.groups)) {
    return group.groups;
  }

  return Object.entries(group.groups || {}).map(([name, childGroup]) => ({
    name,
    ...childGroup,
  }));
}

function summarizeChecks(group) {
  const checks = extractChecks(group);
  const groups = extractGroups(group);

  let passes = 0;
  let fails = 0;

  checks.forEach((check) => {
    passes += typeof check.passes === 'number' ? check.passes : 0;
    fails += typeof check.fails === 'number' ? check.fails : 0;
  });

  groups.forEach((childGroup) => {
    const childSummary = summarizeChecks(childGroup);
    passes += childSummary.passes;
    fails += childSummary.fails;
  });

  return { passes, fails };
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

  const checks = extractChecks(group).map((checkData, index) => (
    `<li><span class="item-name">${escapeHtml(checkData.name || `check-${index + 1}`)}</span><span class="item-value">passes=${formatNumber(checkData.passes || 0)}, fails=${formatNumber(checkData.fails || 0)}</span></li>`
  )).join('');

  const children = extractGroups(group).map((childGroup, index) => (
    `<li>${renderRootGroup(childGroup, childGroup.name || `group-${index + 1}`)}</li>`
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
  const report = options.report || {};
  const metrics = renderMetrics(data && data.metrics ? data.metrics : {});
  const groups = renderRootGroup(data && data.root_group ? data.root_group : null);
  const metricCount = Object.keys(data && data.metrics ? data.metrics : {}).length;
  const checkTotals = summarizeChecks(data && data.root_group ? data.root_group : null);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #09111f;
      --bg-accent: radial-gradient(circle at top, rgba(34, 211, 238, 0.14), transparent 38%), linear-gradient(180deg, #0b1220 0%, #09111f 55%, #060b14 100%);
      --panel: rgba(15, 23, 42, 0.88);
      --panel-strong: rgba(15, 23, 42, 0.96);
      --border: rgba(148, 163, 184, 0.18);
      --border-strong: rgba(56, 189, 248, 0.32);
      --text: #e2e8f0;
      --muted: #93a4bd;
      --accent: #67e8f9;
      --accent-strong: #22d3ee;
      --success: #4ade80;
      --danger: #fb7185;
      --shadow: 0 18px 50px rgba(2, 6, 23, 0.45);
      --radius: 18px;
      --radius-sm: 12px;
      --mono: "SFMono-Regular", "IBM Plex Mono", "Cascadia Code", "Liberation Mono", Menlo, Consolas, monospace;
      --sans: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      line-height: 1.5;
      color: var(--text);
      background: var(--bg);
      background-image: var(--bg-accent);
      font-family: var(--sans);
    }
    .shell {
      width: min(1440px, calc(100vw - 32px));
      margin: 24px auto 40px;
    }
    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(14px);
    }
    .hero {
      padding: 28px;
      position: relative;
      overflow: hidden;
    }
    .hero::after {
      content: "";
      position: absolute;
      inset: auto -10% -35% auto;
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, rgba(34, 211, 238, 0.16), transparent 70%);
      pointer-events: none;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid var(--border-strong);
      color: var(--accent);
      font: 600 12px/1 var(--mono);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      background: rgba(8, 47, 73, 0.45);
    }
    h1, h2 {
      margin: 0;
      font-family: var(--mono);
      letter-spacing: -0.02em;
    }
    h1 {
      margin-top: 18px;
      font-size: clamp(30px, 5vw, 46px);
    }
    p {
      margin: 12px 0 0;
      color: var(--muted);
      max-width: 72ch;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 14px;
      margin-top: 24px;
    }
    .meta-card {
      padding: 14px 16px;
      border-radius: var(--radius-sm);
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.12);
    }
    .meta-label {
      display: block;
      font: 600 11px/1 var(--mono);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .meta-value {
      font: 600 15px/1.45 var(--mono);
      color: var(--text);
      word-break: break-word;
    }
    .success { color: var(--success); }
    .danger { color: var(--danger); }
    .panel {
      margin-top: 22px;
      padding: 22px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }
    .section-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(34, 211, 238, 0.12);
      color: var(--accent);
      font: 600 12px/1 var(--mono);
      border: 1px solid rgba(34, 211, 238, 0.22);
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin-top: 12px;
      overflow: hidden;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: var(--panel-strong);
    }
    th, td {
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid rgba(148, 163, 184, 0.08);
    }
    thead th {
      background: rgba(15, 23, 42, 0.98);
      color: var(--accent);
      font: 600 12px/1.2 var(--mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    tbody th,
    tbody td {
      font-family: var(--mono);
      font-size: 13px;
    }
    tbody tr:nth-child(even) {
      background: rgba(15, 23, 42, 0.72);
    }
    tbody tr:hover {
      background: rgba(34, 211, 238, 0.08);
    }
    summary {
      cursor: pointer;
      font: 600 14px/1.4 var(--mono);
      color: var(--accent);
      list-style: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    summary::-webkit-details-marker { display: none; }
    details {
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      background: rgba(15, 23, 42, 0.68);
    }
    details + details,
    details ul {
      margin-top: 12px;
    }
    ul {
      margin: 12px 0 0;
      padding-left: 20px;
      color: var(--muted);
    }
    li + li {
      margin-top: 6px;
    }
    .item-name {
      display: inline-block;
      color: var(--text);
      font-family: var(--mono);
      margin-right: 8px;
    }
    .item-value {
      font-family: var(--mono);
      color: var(--muted);
    }
    code {
      background: rgba(15, 23, 42, 0.9);
      border: 1px solid var(--border);
      padding: 2px 6px;
      border-radius: 6px;
      font-family: var(--mono);
      color: var(--accent);
    }
    @media (max-width: 860px) {
      .shell {
        width: min(100vw - 20px, 100%);
        margin: 10px auto 24px;
      }
      .hero, .panel {
        padding: 18px;
      }
      .section-header {
        align-items: flex-start;
        flex-direction: column;
      }
      table {
        display: block;
        overflow-x: auto;
      }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <span class="eyebrow">Local Summary</span>
      <h1>${escapeHtml(title)}</h1>
      <p>Local Euripid report generated without remote runtime imports.</p>
      <div class="meta-grid">
        <article class="meta-card">
          <span class="meta-label">Generated</span>
          <div class="meta-value"><time datetime="${escapeHtml(report.generatedAt || '')}">${formatTimestamp(report.generatedAt)}</time></div>
        </article>
        <article class="meta-card">
          <span class="meta-label">Project</span>
          <div class="meta-value">${escapeHtml(report.project || 'Unavailable')}</div>
        </article>
        <article class="meta-card">
          <span class="meta-label">Environment</span>
          <div class="meta-value">${escapeHtml(report.environment || 'Unavailable')}</div>
        </article>
        <article class="meta-card">
          <span class="meta-label">Run Duration</span>
          <div class="meta-value">${formatDurationMs(report.testRunDurationMs)}</div>
        </article>
        <article class="meta-card">
          <span class="meta-label">Metric Rows</span>
          <div class="meta-value">${formatNumber(metricCount)}</div>
        </article>
        <article class="meta-card">
          <span class="meta-label">Checks</span>
          <div class="meta-value">
            <span class="success">${formatNumber(checkTotals.passes)}</span> passed /
            <span class="danger">${formatNumber(checkTotals.fails)}</span> failed
          </div>
        </article>
      </div>
    </section>
    <section class="panel">
      <div class="section-header">
        <h2>Metrics</h2>
        <span class="section-badge">${formatNumber(metricCount)} tracked metrics</span>
      </div>
      ${metrics}
    </section>
    <section class="panel">
      <div class="section-header">
        <h2>Groups And Checks</h2>
        <span class="section-badge">${formatNumber(checkTotals.passes + checkTotals.fails)} total checks</span>
      </div>
      ${groups}
    </section>
  </main>
</body>
</html>`;
}
