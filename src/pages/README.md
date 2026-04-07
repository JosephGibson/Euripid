# pages/

Page Object Model classes. Each file is one page or component, extending `BasePage`. Hold locators in a static `SELECTORS` map; expose actions as async methods. Pages never read `__ENV` or `__VU` — they receive `env` via constructor and stay stateless beyond the `page` handle.

`BasePage` provides `resolveTimeout(kind, override)` for the three-level timeout hierarchy (per-call > `env.timeouts.<kind>` > built-in default). Use it in page methods that need configurable waits. See [`docs/RECIPES.md`](../../docs/RECIPES.md#add-a-new-page-object).
