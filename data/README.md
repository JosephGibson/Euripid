# data/

Legacy v0.1 reference tree. New rewrite work should use `projects/<project>/data/` instead.

Project-local CSV datasets are still loaded through `SharedArray`, but the stable entrypoint is now [`harness/data.ts`](/home/joker/Projects/Euripid/harness/data.ts), not `src/lib/data.js`.
