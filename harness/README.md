# harness/

Shared framework code for Euripid. Projects may import from [`harness/index.ts`](./index.ts) only; they should not reach into internal runtime/reporting folders directly. The harness owns k6-safe runtime primitives, reporting helpers, shared types, and vendored helper code, while all app-specific pages, flows, scenarios, data, and profiles live under `projects/`.
