# Contributing

This repository is primarily maintained for Jacky's personal content workflow.

Useful contributions should keep the core constraints intact:

- Improve information clarity before visual decoration.
- Keep generated output browser-openable and recording-friendly.
- Avoid adding heavy rendering dependencies to the default path.
- Keep each visual style internally consistent.
- Keep the runtime core in `assets/base-template.html` unchanged unless the runtime itself is the subject of the change.
- Preserve final-state-first animation behavior and the registered beat/layout attributes.
- Run `node scripts/validate-motion-html.mjs path/to/output.html` against a representative output before submitting.

For style changes, update both `styles/` and `assets/styles/`.
