# data/

Per-VU CSV datasets. Loaded once via `SharedArray` in `src/lib/data.js`, then `rowForVU()` picks one row per VU using `(__VU - 1) % length`. Header row required. Pass with `-DataFile <name>.csv` in `run.ps1`.

`users.csv` is committed with dummy placeholder data so the template runs out of the box. When you add real credential CSVs, do **not** commit them — add them to `.gitignore` or keep them local-only.
