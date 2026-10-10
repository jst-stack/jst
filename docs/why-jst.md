# Why JST

JST is for React products where several developers or coding agents must produce code with predictable ownership. It converts architecture conventions into editor, commit, CI, migration, and release checks.

## What changes compared with a starter

| Foundation | Gives you | Still leaves to team discipline |
| --- | --- | --- |
| Raw Vite/React | Fast build and local development | Ownership, effects, public APIs, SSR, release policy |
| Framework boilerplate | Routing, rendering, framework conventions | Domain boundaries and replaceable effects |
| Feature-Sliced Design guidance | Useful layer vocabulary | Enforcement, workflow ownership, migrations, production gates |
| Nx | Workspace graph and task orchestration | Product-level React architecture and view-model boundaries |
| JST | SSR plus executable source, slice, effect, UI, workspace, and release contracts | Product decisions and justified project-specific policy overrides |

JST is deliberately stricter than a neutral scaffold. The default standard rejects cross-slice imports, hidden effects, orchestration in views, private deep imports, unowned styles, oversized source, and undocumented workspace extraction.

## Use JST when

- the application has non-trivial workflows and external effects;
- maintainability across people or AI agents matters;
- SSR and hydration are product requirements;
- the team wants one documented way to add slices, modules, and packages;
- architectural feedback must appear before review.

## Do not use JST when

- the project is a static landing page or disposable prototype;
- an existing platform team already owns an incompatible application standard;
- the application is an embedded widget with no SSR or domain workflows;
- the team will routinely disable the rules instead of reviewing ownership;
- independent deployment is required immediately and a proven microfrontend platform already exists.

JST is not proof that a design is correct. Passing rules proves that code follows the configured boundaries; reviewers still own product behavior and architectural judgment.
