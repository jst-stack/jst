# JST Stack engineering roadmap

This document is the canonical delivery contract for the JST Stack ecosystem. Read it before planning, implementing, reviewing, or reporting ecosystem work. Update the status table and decision log whenever the implementation state changes.

Last reviewed: 2026-10-03.

## Objective

Ship JST as a reproducible, enforceable, production-ready React ecosystem whose defaults guide developers toward predictable senior-level architecture without filling generated applications with speculative product code.

The ecosystem consists of four independent repositories:

- `jst-stack/jst` — clean application template and architecture kernel;
- `jst-stack/create-jst` — initializer, migrations, recipes, and project lifecycle CLI;
- `jst-stack/eslint-plugin` — published architecture policy, ESLint rules, and cross-file checks;
- `jst-stack/jst-showcase` — independently deployed reference application, pinned in JST as a Git submodule.

## Non-negotiable product decisions

### Runtime and releases

- Node.js 24 LTS is the single runtime baseline for every repository.
- npm and pnpm are the only officially supported package managers. Yarn and Bun are not advertised or accepted by the CLI until they have full contract coverage.
- `create-jst` and `@jst-stack/eslint-plugin` use independent semantic versions.
- JST templates use immutable release tags. A released CLI resolves a compatible template tag, never a moving `main` branch.
- Showcase is not an npm package and follows continuous delivery.
- A version compatibility table and cross-repository canary define supported combinations.
- Breaking policy changes require a migration and migration notes.
- npm packages are published with npm trusted publishing through GitHub OIDC and provenance. Long-lived publish tokens are not part of the design.

### Generated application

- The default output is a clean working product shell, not a copied demo domain.
- Mantine is the default UI library. Architecture rules remain independent from Mantine.
- Native `fetch` behind a narrow HTTP adapter is the default transport. Alternative transports are user-owned adapters.
- Zod is the default runtime validator for environment variables and untrusted DTOs. It is installed when the first schema consumer is generated.
- Reatom is the default state-manager adapter for stateful slices. The generator contract must allow additional state-manager adapters later without changing architecture rules.
- The official `react-router-serve` app server is the production default; a custom Express server is not part of the clean template.
- Docker is included without prompting.
- Custom structured logging, request context, dedicated health endpoints, and CSP nonce plumbing belong in an opt-in server recipe rather than the clean runtime.
- Observability is vendor-neutral. Error reporting is a narrow port; Sentry and OpenTelemetry remain replaceable recipes.
- PWA/service workers and Partytown are absent from the default project and from initializer questions. They may become explicit recipes later.
- The CLI does not deploy showcase or generated applications to an external platform.

### Styling

- Project creation asks exactly once between CSS Modules and SCSS Modules.
- The choice is stored in project policy and used by generators, Stylelint, staged checks, architecture checks, tests, and documentation.
- A project does not silently mix CSS and SCSS modules. Deliberate changes go through policy/migration.
- Owned styles use the same basename as their owner: `owner.component.tsx` with `owner.component.module.css` or `.scss`.
- Global styles are explicit policy entries rather than filename exceptions spread across scripts.

### Architecture enforcement

- `jst.config.ts` is the single project-level policy entry point.
- The public policy API remains in `@jst-stack/eslint-plugin`; do not create a fifth architecture package until an independent external consumer proves the need.
- ESLint rules, `jst-lint`, generators, styling checks, benchmarks, and fixtures consume the same normalized policy.
- Policy is typed, deeply immutable after normalization, runtime-validated, and rejects unknown keys and inconsistent combinations.
- Production dependency direction is `app → pages → widgets → features → entities → shared`.
- Direct sibling-slice imports are forbidden by default.
- A slice used externally exposes an explicit `<slice>.public.ts`; consumers cannot deep-import its private implementation.
- Route modules remain thin composition roots.
- Effects stay behind repository/infrastructure adapters and consumer-owned narrow ports.
- DTOs are validated at the repository boundary and do not reach domain, state, or UI.
- Stateful flows use a store/view-model and props-driven view entry boundary.
- Inline disables for `jst/*` rules are forbidden. Reviewed policy exceptions require a reason and may include owner and expiry. Expired exceptions fail CI.
- Regular non-JST ESLint suppressions require a description.
- Rules must use AST/resolved imports where correctness matters. Regex source scanning must not duplicate ESLint semantics.
- Linux, macOS, and Windows paths and process behavior are supported.

### Slice generator

- `create:slice` is an interactive generator with equivalent deterministic flags.
- It supports `entity`, `feature`, and `widget` without creating unused layers.
- Relevant options include repository, service, stateful, UI, persistence, and tests.
- `--stateful` uses the configured state adapter and installs Reatom when required.
- `--repository` can create a port, fetch adapter, Zod DTO schema, mapper, provider binding, and MSW contract handler as selected.
- `--ui` uses Mantine and the configured CSS/SCSS Module extension.
- Generated source compiles, follows role placement, exposes a public API only when consumed externally, and includes the smallest meaningful tests.
- The generator can install missing dependencies with the selected package manager.
- `--dry-run` prints the exact file, manifest, and install plan. `--no-install` writes source without invoking the package manager.
- Generation is atomic: failures restore files, package manifest, and lockfile.
- Empty `.gitkeep` scaffolding is not a successful generator result.

### Testing

- Vitest covers pure models, schemas, mappers, services, stores, CLI behavior, and infrastructure contracts.
- Testing Library and User Event cover props-driven UI and feature integration.
- MSW owns deterministic HTTP integration fixtures.
- Playwright covers observable user journeys, SSR/hydration, accessibility, error states, responsive behavior, and reduced motion.
- Slice unit/integration tests live under `<slice>/__tests__/*.test.ts(x)`.
- Infrastructure script tests live under `scripts/__tests__/*.test.ts`.
- Browser tests live under `e2e/<product-area>/*.spec.ts` with universal contracts under `e2e/smoke`.
- `test` is the default Vitest suffix and `spec` the Playwright suffix. Both are policy fields rather than hard-coded exceptions.
- Chromium runs on every PR. Firefox and WebKit run nightly and before release. Release coverage includes desktop and mobile viewports.
- Showcase demonstrates each testing level without duplicating the same assertion at every level.

### Performance

- The plugin benchmark suite includes synthetic projects with 1,000 files and 10,000 imports.
- Measure cold and cached ESLint, cold and cached `jst-lint`, wall time, CPU time, and peak memory.
- Benchmark project creation without dependency installation and full npm/pnpm creation with installation and checks.
- Store machine-readable baselines and CI artifacts.
- Block material regressions after runner variance is calibrated; begin with a 20% tolerance rather than pretending shared runners are deterministic.
- Full benchmarks run in CI and on a schedule, never in pre-commit.
- Generated applications have configurable gzip JavaScript/CSS budgets and unexpected-chunk detection.
- Showcase has Lighthouse CI and synthetic Core Web Vitals baselines. Browser performance checks are not part of the fast local `npm run check`.

### CLI lifecycle

- Project creation is atomic: prepare in a temporary sibling directory, validate, then move into the destination.
- A failure or cancellation removes temporary output and forwards signals to child processes.
- Install output remains visible and actionable.
- `--version` reads package metadata rather than a duplicated literal.
- npm and pnpm flows run against real package managers in CI.
- Generated README commands match the selected package manager.
- `npm create jst <name>` creates the clean shell.
- `npm create jst <name> -- --example showcase` creates the pinned reference application deliberately.
- The public showcase is linked prominently from JST documentation; external hosting is maintained by the owner outside this implementation scope.
- `jst migrate` supports versioned migrations, `--from`, `--to`, and `--dry-run`.
- Migrations require a safe Git state, avoid ambiguous business-code rewrites, run verification afterward, and restore on failure.

## Delivery phases

### Phase 0 — authoritative contracts

- [x] Complete ecosystem audit and compare relevant open-source projects.
- [x] Resolve product decisions with the owner.
- [x] Record the canonical roadmap.
- [x] Add this roadmap to every repository's agent/contributor context where applicable.
- [x] Define a machine-readable compatibility manifest.
- [x] Establish the status-report format below.

### Phase 1 — runtime, package, and release foundation

- [x] Move every repository, `.nvmrc`, engine range, CI job, Docker image, and Node types to Node 24 LTS.
- [x] Remove Yarn/Bun claims and add real npm/pnpm generation tests.
- [x] Add CI to `create-jst` and eslint-plugin with supported Node/ESLint/OS matrices.
- [x] Add changelogs, release-note templates, and compatibility documentation.
- [ ] Create immutable template tags as part of the authorized release.
- [ ] Publish `@jst-stack/eslint-plugin` through trusted publishing with provenance.
- [ ] Replace Git commit dependencies with compatible npm ranges.
- [x] Add cross-repository released-artifact canary.

### Phase 2 — policy and enforcement correctness

- [x] Introduce typed `jst.config.ts` and one normalized/deeply immutable policy.
- [x] Make ESLint rules and every policy-package CLI check consume it.
- [ ] Remove hard-coded test suffixes, aliases, layers, style extensions, provider globs, and UI paths outside defaults.
- [x] Replace duplicate regex enforcement with AST/resolver-backed checks.
- [x] Close import forms, shadowing, prefix matching, Windows path, and boolean/calculation false positives.
- [x] Enforce explicit slice public APIs and detect circular dependencies.
- [x] Add structured exceptions and reject inline `jst/*` disables.
- [x] Ship declaration files, exact JSON schemas, per-rule docs, valid/invalid examples, and migration guidance.
- [x] Add adversarial fixtures proving every documented rule blocks representative violations.

### Phase 3 — initializer, migrations, and generators

- [x] Make `create-jst` atomic, signal-safe, reproducible, and template-tag aware.
- [x] Align initializer/template option validation through the versioned template contract before setup mutates output.
- [x] Implement npm/pnpm-aware generated documentation and lockfile behavior.
- [x] Implement CSS/SCSS selection and complete style-policy enforcement.
- [x] Replace `.gitkeep` slice creation with the minimal interactive/flag-based generator.
- [x] Implement generator dependency adapters for Reatom, Zod, Testing Library, MSW, and Sass.
- [x] Add dry-run/no-install and transactional rollback.
- [x] Add clean and showcase example modes.
- [x] Add versioned migration engine and initial migrations.

### Phase 4 — production runtime

- [x] Keep the official `react-router-serve` production server and framework SSR.
- [x] Add Docker multi-stage non-root build and runtime health checks.
- [x] Exclude the rejected custom Express/Pino/nonce runtime and keep `react-router-serve` as the only shipped server path.
- [x] Remove speculative storage/state infrastructure from the clean project until generated by a real use case.

### Phase 5 — tests, performance, and security

- [x] Add Testing Library, User Event, and on-demand MSW infrastructure.
- [x] Expand Playwright projects and scheduled/release browser matrix.
- [x] Add bundle budgets, Lighthouse CI, and Core Web Vitals baseline.
- [x] Add plugin/CLI synthetic benchmarks and calibrated regression checks.
- [x] Add dependency review, CodeQL, and OpenSSF Scorecard workflows where they improve repository code/supply-chain quality.
- [x] Keep action dependencies pinned by full commit SHA and workflow permissions minimal.

### Phase 6 — showcase, documentation, and release proof

- [ ] Migrate showcase to the released plugin and the same mandatory gates as JST.
- [x] Demonstrate public APIs, Zod DTO validation, fetch adapter, DI, Reatom, Testing Library, MSW, and full browser states.
- [x] Keep API browser tests deterministic while retaining a visible real JSONPlaceholder flow.
- [x] Document compatibility, rule reference, migration, deployment, troubleshooting, and release process.
- [x] Update README links, submodule pointer, and example creation command.
- [ ] Run clean npm and pnpm creation in temporary directories on Linux, macOS, and Windows.
- [ ] Run every repository check, package tarball test, release dry run, cross-browser suite, benchmarks, and final adversarial architecture audit.

## Explicitly deferred

These items are not required for the current definition of done:

- enforcement of PR-only development, approvals, signed commits, or branch protection rules;
- automatic deployment to Vercel, Cloudflare, Netlify, or another external account;
- PWA/service-worker and Partytown implementation beyond optional future recipes;
- custom Express/Pino servers, request context, dedicated health endpoints, and CSP nonce plumbing, rejected in favor of the official `react-router-serve` path;
- Storybook, authentication, forms, a database, TanStack Query, Redux, Sentry, or OpenTelemetry as default dependencies;
- arbitrary test coverage percentages without a risk-based reason;
- Yarn or Bun support without the same compatibility guarantees as npm/pnpm;
- a separate `@jst-stack/architecture` package;
- a monorepo migration.

## Over-engineering cuts

- Consolidate duplicated initializer/setup validation.
- Replace the one-subscriber event bus with direct progress callbacks unless a second real subscriber appears.
- Avoid factories/interfaces with a single non-effectful implementation.
- Delete the `.gitkeep` generator rather than preserving empty architecture theatre.
- Keep only genuinely cross-file kernel checks in `jst-lint`; ESLint owns per-file AST rules.
- Do not keep unused local-storage or state infrastructure in the clean output.
- Do not ask initializer questions for rare recipes.

## Definition of done

The ecosystem is complete only when all of the following are proven from current artifacts:

1. A released CLI on Node 24 creates both clean and showcase projects with npm and pnpm.
2. Every generated project passes install, policy validation, lint, React Doctor, unit/integration tests, SSR build, unused-code checks, browser smoke tests, and Docker health checks.
3. The npm-published eslint-plugin is provenance-backed, documented, typed, tested across its supported matrix, and used by JST/showcase without Git dependencies.
4. The policy is a single source of truth and adversarial fixtures cannot bypass documented architectural boundaries through supported syntax or paths.
5. CSS and SCSS projects receive equivalent generation, linting, ownership, build, and migration behavior.
6. Slice generation is minimal, atomic, dependency-aware, and produces compiling architecture rather than empty directories.
7. Migrations can move every supported previous ecosystem combination to the current one or explicitly reject unsupported paths before mutation.
8. Framework SSR and the non-root Docker runtime are exercised; no custom Express runtime is shipped.
9. Benchmarks and application performance budgets have stored baselines and enforce calibrated regressions.
10. Showcase passes the same contracts, demonstrates the documented architecture, and is pinned to the compatible template release.
11. Linux, macOS, Windows, Chromium, Firefox, and WebKit coverage matches the support policy.
12. The final audit finds no unresolved P0/P1 item in this document.

## Required status report

## Implementation checkpoint — 2026-10-03

Completed in the current implementation run:

- `create-jst` 0.4.0 accepts and tests CSS/SCSS selection, clean/showcase examples, immutable sources, direct progress callbacks, signal-aware child processes, package-manager documentation, transactional creation, and versioned rollback-safe migrations.
- Template setup persists the style choice in `jst.config.ts`, rewrites CSS Modules to SCSS Modules, selects the SCSS Stylelint preset, adds Sass dependencies, and removes a stale npm lockfile when the dependency graph changes.
- `create:slice` writes real entity/feature/widget source, supports dry-run/no-install, restores project manifests and lockfiles on install failure, and plans Zod, Reatom, Sass, MSW, Testing Library, UI, repository, service, persistence, and test adapters.
- The policy package has a typed, runtime-validated, deeply immutable policy, JSON Schema, structured exceptions, AST/resolver-backed ESLint rules, cross-file public API/cycle checks, application budget enforcement, and calibrated 1,000-file/10,000-import benchmarks.
- The clean template no longer contains the unused storage implementation and now contains a native-fetch HTTP port/adapter/provider boundary.
- Production uses the official `react-router-serve` app server with framework SSR; the previously added custom Express runtime was removed by owner decision.
- A multi-stage non-root Node 24 Docker image and production runtime tests were added.
- Showcase now demonstrates Zod boundary validation, MSW contracts, Testing Library/User Event interaction tests, React Doctor, deterministic browser API states, scheduled cross-browser coverage, and Lighthouse/Core Web Vitals budgets.
- Every repository has dependency-review/CodeQL workflows with SHA-pinned actions and least-privilege job permissions.

Verification completed at this checkpoint:

- JST `npm run check`: passed (ESLint, Stylelint, architecture, React Doctor, 7 Vitest tests, typecheck, SSR build, and Knip).
- `@jst-stack/eslint-plugin` `npm run check`: passed (lint, 24 tests, and package dry-run); benchmark regression check passed. UI import restrictions are policy-owned and expand the configured `{alias}` instead of hard-coding `@/`.
- `create-jst` `npm run check`: passed (lint, 15 tests, and package dry-run).
- Showcase `npm run check`: passed (ESLint, Stylelint, architecture, React Doctor, 6 Vitest files/8 tests, typecheck, SSR build, and Knip).
- Showcase full browser matrix: passed 73 contracts with 2 documented platform skips across Chromium, Firefox, WebKit, mobile Chrome, and mobile Safari.
- Showcase Lighthouse CI: passed three production runs against the stored Core Web Vitals and audit baseline.
- Fresh clean CSS and SCSS projects: both passed a real npm install followed by the complete generated-project `npm run check` flow.

Still in progress at this checkpoint:

- Publish the policy package before replacing JST/showcase Git dependencies with npm ranges; no publish, commit, or push was performed.
- Make template generators consume the published normalized policy rather than compatibility fallbacks, then activate `jst-lint budgets` in generated applications.
- Run released-artifact npm/pnpm canaries on Linux/macOS/Windows after the 0.4.0 template and CLI tags exist.
- Complete the final cross-platform/release audit; CLI project-creation and plugin lint baselines are already stored and passing locally.
- Verify the Docker image with an actual container build and health probe; the local Docker daemon was unavailable, while the CI health job is configured.

Current release blockers:

- P0: none.
- P1: three release-sequencing items — publish the policy package, create immutable compatible tags/releases, and switch JST/showcase from Git dependencies to the released npm range.

Every implementation handoff must end with a concise current-state summary containing:

- completed in this increment;
- verification actually run and its result;
- current phase and next concrete step;
- newly discovered risk or `none`;
- remaining P0/P1 blockers count;
- repository commits/push state when mutations occurred.

Do not report the ecosystem as complete from a narrow green check. Update this document first, then verify the definition of done against authoritative repository, package, CI, and runtime state.
