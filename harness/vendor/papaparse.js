// Minimal vendored CSV parser for Euripid.
// Source provenance: behavior-compatible subset of Papa Parse 5.1.1 used by
// Euripid's CSV loader (header row parsing + skipEmptyLines).

function parseRows(input) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += ch;
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function isEmptyRow(row) {
  return row.every((value) => String(value).trim() === '');
}

function normalizeRow(row, width) {
  const out = row.slice(0, width);
  while (out.length < width) {
    out.push('');
  }
  return out;
}

function parse(input, options = {}) {
  const rows = parseRows(String(input || ''));
  const skipEmptyLines = options.skipEmptyLines === true;
  const filtered = skipEmptyLines ? rows.filter((row) => !isEmptyRow(row)) : rows;

  if (options.header === true) {
    const headers = filtered.length > 0 ? filtered[0] : [];
    const data = filtered.slice(1).map((row) => {
      const cells = normalizeRow(row, headers.length);
      const record = {};
      for (let i = 0; i < headers.length; i += 1) {
        record[headers[i]] = cells[i];
      }
      return record;
    });
    return { data, errors: [], meta: { fields: headers } };
  }

  return { data: filtered, errors: [], meta: {} };
}

export default { parse };
