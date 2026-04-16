# config/

Legacy v0.1 reference tree. New rewrite work should not add files here.

The authoritative configuration model is now:

- `projects/<project>/project.config.json` for named environment variants and project metadata
- `projects/<project>/profiles/*.json` for load profiles

Keep this directory only if you are explicitly comparing the rewrite against the old layout.
