// src/lib/data.js
// Loads a CSV file once into a SharedArray (read-once, shared across all VUs)
// and exposes a deterministic per-VU row picker.
//
// CONTRACT: DATA_FILE paths are repo-root-relative. Because this file lives
// at src/lib/, we prepend '../../' to anchor open() at the repo root.
// If you move this file, update the prefix in the open() call accordingly.

import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

const DATA_FILE = __ENV.DATA_FILE || 'data/users.csv';

export const dataset = new SharedArray('csv-dataset', function () {
  const csv = open('../../' + DATA_FILE);
  return papaparse.parse(csv, { header: true, skipEmptyLines: true }).data;
});

/**
 * Pick a row for the current VU. Wraps with modulo so VU count > row count
 * is fine — VUs will reuse rows deterministically.
 */
export function rowForVU() {
  if (dataset.length === 0) {
    throw new Error('Dataset is empty: ' + DATA_FILE);
  }
  return dataset[(__VU - 1) % dataset.length];
}
