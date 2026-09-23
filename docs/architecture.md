# Architecture

JST provides boundaries, not a framework inside a framework. Add only the layers a use case needs, keep effectful code replaceable, and make ownership obvious from the file tree.

## Dependency direction

```text
app → pages → widgets → features → entities → shared
```

- `app` owns runtime composition, global providers, and application policy.
- `pages` are route composition roots. Route modules stay thin.
- `widgets` compose reusable page sections without owning domain behavior.
- `features` own user-facing workflows and expose props-driven views.
- `entities` own domain types, models, mappers, repositories, services, stores, and entity UI.
- `shared` owns product-agnostic infrastructure. Move code here only after a second real consumer.

Dependencies normally point downward. A direct same-layer import is acceptable while ownership is clear, no cycle exists, and the code has one consumer. Extract a contract when reuse, independent evolution, or test substitution becomes real.

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
- Run `npm run check` before review. It validates imports, feature UI isolation, style ownership, types, tests, production builds, and dead code.

The executable rules live in ESLint, Stylelint, `scripts/check-architecture.mjs`, and `scripts/check-style-files.mjs`. The concise coding-agent contract lives in `skills/frontend-architecture/SKILL.md`.
