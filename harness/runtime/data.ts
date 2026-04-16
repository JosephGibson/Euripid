import { SharedArray } from 'k6/data';
import papaparse from '../vendor/papaparse.js';
import type { DatasetRow } from '../types/index.ts';
import { buildProjectPath, project } from './config.ts';

const ROOT_PREFIX = '../../';

const DEFAULT_DATA_FILE = project.defaultDataFile
  ? buildProjectPath('data', project.defaultDataFile)
  : '';
const DATA_FILE = __ENV.DATA_FILE || DEFAULT_DATA_FILE;

if (!DATA_FILE) {
  throw new Error(
    'DATA_FILE is not configured. Set project.defaultDataFile in project.config.json or pass DATA_FILE via the runner.',
  );
}

export const dataset = new SharedArray(`csv-dataset:${DATA_FILE}`, () => {
  const csv = open(ROOT_PREFIX + DATA_FILE);
  const parsed = papaparse.parse(csv, {
    header: true,
    skipEmptyLines: true,
  }) as unknown as { data: DatasetRow[] };
  return parsed.data;
});

export function rowForVU(): DatasetRow {
  if (dataset.length === 0) {
    throw new Error(`Dataset is empty: ${DATA_FILE}`);
  }

  return dataset[(__VU - 1) % dataset.length] as DatasetRow;
}
