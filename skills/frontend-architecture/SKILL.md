---
name: frontend-architecture
description: Implement or review product code in this React starter using model-first vertical slices, explicit DI boundaries, Reatom view models for stateful workflows, and props-driven UI.
---

# Frontend architecture

Inspect the nearest complete slice before editing. Keep the smallest complete vertical slice and preserve the architecture kernel when replacing the reference domain.

## Model first

Before JSX, identify the bounded context, domain state, invariants, use cases, and effectful boundaries. Then implement only the layers the use case needs:

1. Domain types and pure models own vocabulary and invariants.
2. Consumer-owned ports describe required I/O with the least authority possible.
3. Adapters implement browser, storage, HTTP, analytics, or other external effects.
4. An application service owns use-case orchestration that remains meaningful without the current UI.
5. A Reatom store is the MVVM view model for interaction state: presentation-derived state, pending state, optimistic projection, messages, and calls into application services.
6. A feature entry observes the store and maps it to a props-driven view.

Static pages and trivial local controls do not need every layer. Stateful workflows must not collapse model, effects, orchestration, and rendering into one hook or component.

## SOLID check

- One owner per decision: routes compose, services orchestrate, stores expose view state, views render props.
- Extend stable UI with composition and slots. Wrappers preserve native props, refs, semantics, and accessibility.
- Keep contracts and dependency objects narrower than their implementations.
- Domain policy owns ports; effectful adapters implement them at composition roots.

## Ownership

- `pages` are composition roots for routes, metadata, modules, widgets, features, and dependencies. Keep `route.tsx` thin.
- `modules` are optional bounded contexts for capabilities that span several routes or lose cohesion in the global layer tree. A module may own internal pages, workflows, services, repositories, and UI behind one `<module>.public.ts`.
- `features` own one user workflow and depend on entity contracts/UI, never on `app` or `pages`.
- `entities` own domain types, models/mappers, repository ports/adapters, services, view-model stores, and entity UI.
- `shared` contains product-agnostic infrastructure only. Promote code here after a second real consumer.
- DTOs describe transport data only; never expose them to UI. `shared/api` owns generic HTTP mechanics. Entity API repositories own endpoints and typed request contracts. Services map/orchestrate domain data. Reatom stores expose loading, error, derived state, and user actions. Add runtime schema validation at an untrusted repository boundary.

Assign behavior to the layer that owns the decision, not the layer that happens to hold the data. An entity may own reusable domain state and domain-wide operations. An application service owns business orchestration that survives another UI. A feature view model owns interaction lifecycle: selection, filters, feature preferences, submission guards, optimistic projection, rollback/undo presentation, and user-facing outcome messages. If removing a feature makes a port, atom, or message meaningless, it belongs to that feature. Do not hide a feature in a thin proxy whose real behavior lives in an entity store, or hide an application use case inside a view model.

Start page-local only for a genuinely small route. Promote to a feature when it gains an independent workflow. Promote related slices to a module when one product capability spans routes and the global layers reduce cohesion. Promote a proven module to `packages/*` only for real reuse, ownership, build, or release pressure. Microfrontends require independent deployment and an operational host contract; repository size is not a reason.

Before coding a multi-feature request, write a short ownership map for yourself: domain vocabulary and invariants; each workflow and its state; effect ports and their consumers; composition-only coordination. Re-check it before delivery. Passing layer-direction lint is necessary, not proof that responsibilities are correctly owned.

## DI boundary

Directly import stable lower-layer code: types, pure models, mappers, and components. Use DI for effectful or replaceable boundaries such as HTTP, storage, clocks, analytics, and request-scoped services, or when tests must substitute an implementation. Do not inject plain data or add an interface with one non-effectful implementation.

`useService` is a service locator for `app` and `pages` composition only. Lower layers receive dependencies through constructors or narrow feature injectors. Define a port/token beside its consumer and bind the adapter in a discovered `*.provider.ts` module.

A feature entry may consume its injector and Reatom store. Files under `features/*/ui` must not import injectors, stores, services, repositories, or data adapters. Pass state and callbacks as props so views are independently testable and replaceable. A feature that needs page-owned state receives the minimum dependency object through its injector; it must not import `app`.

Choose dependency lifetime deliberately: application scope for immutable policy and truly shared infrastructure; request scope for SSR data and mutable request services; module/route scope for workflow state; local scope for component-owned presentation state. Never promote mutable feature state to an application singleton for convenience.

The default policy forbids direct imports between sibling production slices and bounded-context modules. Compose them in a higher layer, use a consumer-owned facade/port, or publish a typed fact for genuine fan-out. Events describe completed facts, not remote commands. If a product has a proven counterexample, record an ADR and change the centralized `jst.createConfig` policy through review instead of scattering disable comments.

## Pattern choice

- Prefer composition and aggregation; use inheritance only for an existing polymorphic contract.
- Use Gateway/Repository for external effects and a Facade/Service for multi-step use cases.
- Reatom provides Observer semantics for view models. Add Publisher-Subscriber only for real cross-workflow fan-out.
- Use Builder only when construction has ordered optional stages or enforced invariants; ordinary object creation stays direct.
- Keep dependency objects narrow. A component or service receives only what it calls.

## Preserve the kernel

Removing the demo means deleting demo slices, not `src/app/container`, `src/shared/lib/react.lib.ts`, provider discovery, this skill, or architecture checks. Clean setup may remove Reatom when no stateful slice remains; add it back before implementing a non-trivial stateful workflow instead of replacing the view model with a large React hook.

## Styling

- Colocate `Owner.tsx` with `Owner.module.css`; the basename must match. Use plain CSS unless the project deliberately adopts and lints Sass.
- Import modules as `styles`; use camelCase local classes. Pass them through UI-library `className`/`classNames` slots.
- A module styles only markup owned by that file. Never import another slice's private stylesheet or target its generated class names.
- Keep only tokens, reset/base accessibility rules, and deliberate third-party overrides in `src/index.css`.
- Prefer existing CSS custom properties and native CSS. Promote a token or utility only after a second real consumer.
- Run `npm run lint:styles`; do not bypass the naming or Stylelint checks.

## Delivery check

Keep transport failure and empty/loading states explicit. Test services/stores with substituted ports and user flows with role-based Playwright locators. Test names must describe behavior actually exercised; cover the risky transitions named in the request, not only the happy path. Tests obey the same public APIs and slice boundaries as production code—own a double locally or expose an intentional testing contract instead of importing another slice's private `__tests__` files. Run `npm run check`; it verifies layer rules, UI isolation, and the architecture kernel. Add abstractions only when the current slice proves they are needed.

Create slices with `npm run create:slice -- <entity|feature|module|widget> <lowerCamelName>`. Extract a proven boundary with `npm run create:package -- <lowerCamelName>`; the generated package must keep one public export, declared dependencies, an acyclic workspace graph, and a reviewed extraction ADR. Source files follow `<lowerCamelName>.<role>.ts(x)` and the role directories enforced by ESLint. Do not disable architecture, naming, effect-boundary, complexity, or size rules inline; split the responsibility or move it to the reported boundary.
