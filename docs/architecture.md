# Architecture

JST provides boundaries, not a framework inside a framework. Add only the layers a use case needs, keep effectful code replaceable, and make ownership obvious from the file tree.

## Dependency direction

```text
app → pages → modules → widgets → features → entities → shared
```

- `app` owns runtime composition, global providers, and application policy.
- `pages` are route composition roots. Route modules stay thin.
- `modules` are optional bounded contexts for capabilities spanning multiple routes. They own their internal pages/layers and expose one public API.
- `widgets` compose reusable page sections without owning domain behavior.
- `features` own user-facing workflows and expose props-driven views.
- `entities` own domain types, models, mappers, repositories, services, stores, and entity UI.
- `shared` owns product-agnostic infrastructure. Move code here only after a second real consumer.

Ownership follows the decision, not the data. Entities own reusable domain state and domain-wide operations. Application services own use cases that remain meaningful without the current UI. Feature view models own interaction state and presentation orchestration: selection, filters, pending state, optimistic projection, rollback/undo presentation, and outcome messages. A feature must not be a thin proxy over workflow logic hidden in an entity store, and a view model must not become a hidden application-service layer.

Dependencies point downward. Slices and modules cannot import siblings directly; compose them from a higher layer, inject a narrow consumer-owned port/facade, or publish a typed completed fact for genuine fan-out. Tests follow the same public APIs and isolation as production code. Keep a test double with its consumer or expose an intentional testing contract instead of deep-importing another slice's private `__tests__` directory.

Every entity, feature, and widget exposes its supported surface through `<slice>.public.ts`. Other slices and pages import that file instead of deep-importing private implementation. `create:slice` generates the public API automatically.

## A complete vertical slice

```text
HTTP client
  → repository adapter
  → runtime DTO validation
  → domain mapper
  → use-case service
  → Reatom store
  → feature entry
  → props-driven view
```

This is a menu, not mandatory boilerplate. Static content and trivial local controls do not need repositories, services, stores, or DI.

## SOLID in React

- **Single responsibility:** routes compose, services orchestrate, stores expose view state, and views render props.
- **Open/closed:** extend behavior through composition, slots, adapters, and provider bindings before editing stable components.
- **Liskov substitution:** wrappers preserve the contract of the element or component they replace, including accessibility and ref behavior.
- **Interface segregation:** pass the smallest dependency object or prop surface the consumer actually uses.
- **Dependency inversion:** domain policy owns ports; HTTP, storage, analytics, clocks, and other effects implement them at composition roots.

## Dependency injection

Import stable lower-layer code directly: types, pure models, mappers, and components. Use DI for effectful or replaceable boundaries, request-scoped services, or dependencies tests must substitute.

`useService` is restricted to `app` and `pages`. Lower layers receive dependencies through constructors or feature injectors. A feature view never imports a container, store, service, repository, or adapter.

Do not add an interface for a single pure implementation, inject plain data, or use DI to hide unclear ownership.

Choose the narrowest valid lifetime:

- application: immutable application policy and truly shared infrastructure;
- request: SSR data and mutable request services;
- module or route: workflow/view-model state;
- local: component-owned presentation state.

Mutable feature state must not become an application singleton merely to simplify access.

## Data boundaries

- Generic request mechanics live in `shared/api`.
- Endpoint contracts and DTOs live with the owning entity repository.
- Untrusted responses are validated before they leave the repository adapter.
- Pure mappers convert DTOs to domain models.
- DTOs never reach stores or UI.

Use generated clients or schema libraries when an API contract justifies them. The showcase uses a small manual parser because it has one endpoint and no OpenAPI source.

## State and MVVM

Reatom stores are view models for non-trivial async or interactive flows. They own user actions and expose explicit loading, refreshing, error, empty, and ready states. Feature entries observe stores and translate them into narrow view props.

Local presentation state stays local. Do not turn a component hook into a hidden service/store/repository stack.

## Styling

- Colocate `Owner.tsx` and `Owner.module.css`; basenames must match.
- A module styles markup owned by that file only.
- Keep tokens, reset/base accessibility rules, and deliberate third-party overrides in `src/index.css`.
- Prefer native CSS and existing tokens. Add Sass or a shared utility only when a real product need appears.

## Tests and enforcement

- Unit-test models, parsers, services, and stores near their owning code.
- Group Playwright specs by product area; keep universal SSR, hydration, accessibility, motion, and responsive checks in `e2e/smoke`.
- Use role-based browser locators and test observable behavior, not implementation details.
- Make test names truthful and cover the risky transitions explicitly requested: paging, cross-filter selection, duplicate submission, rollback, and undo are separate behaviors.
- Run `npm run check` before review. It validates imports, feature UI isolation, style ownership, types, tests, production builds, and dead code.
- `jst-lint architecture` also validates bounded-context public APIs and any `packages/*` workspace: explicit exports, declared internal dependencies, extraction ADRs, and an acyclic package graph.

The executable rules come from [`@jst-stack/eslint-plugin`](https://github.com/jst-stack/eslint-plugin): its flat-config preset runs in editors and its `jst-lint` CLI validates cross-file architecture and stylesheet ownership. Stylelint handles CSS syntax. The concise coding-agent contract lives in `skills/frontend-architecture/SKILL.md`.

The standard is strict but replaceable. Use `jst.createConfig({ files: { testSuffixes: ['spec'] } })` in `eslint.config.js` to override a deliberate convention without editing or forking rule code. The same policy API exposes focused `files`, `imports`, `effects`, `ui`, and `limits` overrides; unspecified values retain JST defaults.

## Enforced source contract

These rules are errors in the editor through ESLint, in `npm run lint`, and at commit time:

- Source files use `<lowerCamelName>.<role>.ts(x)`. React Router route/entry files and `vite-env.d.ts` are framework exceptions.
- Browser and HTTP implementations use the `adapter` role; React Router reserves `*.client.*` for client-only modules.
- Entity, feature, and widget code lives in `layer/<lowerCamelSlice>/...`; loose source files at layer roots are rejected.
- Bounded-context modules live in `src/modules/<lowerCamelModule>` and may contain internal pages, model, services, repository, and UI behind `<module>.public.ts`.
- Entity roles use `model`, `repository`, `services`, and `ui`. Feature roles use `model` and `ui`; widget presentation uses `ui`.
- Components live in `ui`, transport adapters and DTOs in `repository`, services in `services`, and models, mappers, and builders in `model`.
- `fetch`, `localStorage`, `sessionStorage`, and `indexedDB` are allowed only in entity repositories or shared infrastructure adapters.
- UI directories cannot import stores, injectors, services, repositories, data adapters, or `app`.
- Production source files are limited to 250 meaningful lines; functions to 80. Complexity is limited to 12, nesting to three levels, and parameters to four.
- CSS owned by a component uses the identical `<owner>.module.css` basename. Global CSS is restricted to `src/index.css`.

Create a compliant empty slice instead of assembling folders by hand:

```bash
npm run create:slice -- entity account
npm run create:slice -- feature signIn
npm run create:slice -- module projectManagement --stateful
npm run create:slice -- widget accountSummary
```

The generator prints the public entry to compose from an owning page or higher layer. Knip deliberately rejects a newly generated but unreachable slice, so connect that public entry before running the complete quality gate.

Add `--stateful` to an entity or feature when it needs a Reatom view model. A stateful feature scaffold includes the store, reactive entry, props-driven view, public API, and required Reatom packages:

```bash
npm run create:slice -- feature checkout --stateful
```

The limits are defaults, not permission to disable rules inline. If a real module cannot fit them, split responsibilities first; change a limit only through review with a concrete counterexample.

## Growth path

Use the smallest boundary that matches demonstrated complexity:

```text
page-local → vertical slices → bounded-context module → workspace package → microfrontend
```

`npm run create:package -- orderOperations` creates an opt-in workspace package, one public entry, and a required extraction ADR. Use `--kind microfrontend` only when the capability has an autonomous owner and independent deployment; the command then requires owner, host contract, and fallback metadata. See [Architecture evolution](architecture-evolution.md).
