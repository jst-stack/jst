# Build the first production feature

This walkthrough takes a clean JST application from generation to a release-ready vertical slice. It deliberately triggers one architecture error so the repair path is clear.

## 1. Create and verify the application

```bash
npm create jst@latest order-board
cd order-board
npm run validate
```

`validate` is the fast edit loop. `check:release` adds the production build, dependency audit, SSR, hydration, accessibility, and browser contracts.

## 2. Generate the boundaries

```bash
npm run create:slice -- entity order
npm run create:slice -- feature browseOrders --stateful
```

The entity owns order vocabulary and external data. The feature owns the browsing workflow and interaction state. The page composes both. Do not start with JSX and invent ownership afterward.

## 3. Implement the data path

Use this order:

```text
order DTO parser
  → order mapper/model
  → repository port and HTTP adapter
  → order service
  → browseOrders store
  → browseOrders entry
  → props-driven view
```

Keep each contract narrow:

- `order.dto.ts` describes transport data and validates the untrusted response.
- `order.mapper.ts` converts the DTO to the domain `Order` model.
- `order.repository.ts` implements endpoint access; its port exposes only the operation the service needs.
- `order.service.ts` owns the use case independently from React.
- `browseOrders.store.ts` owns pending, error, empty, ready, and refresh interaction states.
- `browseOrders.entry.tsx` observes the store and maps state to view props.
- `browseOrders.component.tsx` renders props and emits callbacks.

Bind the repository/service through a discovered `*.provider.ts` composition module. Do not call `useService` below `app` or `pages`.

The complete working equivalent is the `post` entity and `requestPosts` feature in [JST Showcase](https://github.com/jst-stack/jst-showcase/tree/main/src).

## 4. Compose the route

Import each slice through its `<slice>.public.ts` entry from the owning page. Keep `route.tsx` limited to route metadata and page composition.

If Knip reports the generated slice as unreachable, it has not been composed yet; do not suppress the report.

## 5. See a guardrail work

Temporarily call `fetch` from the feature view and run:

```bash
npm run lint
```

JST reports `jst/effects-at-boundary`. Remove the call and place transport access in the entity repository adapter. This is the normal repair model: move the decision or effect to its owner instead of disabling the rule.

Use [Troubleshooting](troubleshooting.md) for import, naming, effect, UI, SSR, and generated-slice diagnostics.

## 6. Test the risky transitions

- Unit-test DTO rejection and mapping.
- Substitute the repository port in the service test.
- Exercise loading, failure, empty, refresh, and stale-response behavior in the store test.
- Cover the user-visible flow with role-based Playwright locators.

Tests use the same public APIs as production code. Do not deep-import another slice's private test utilities.

## 7. Run the release gate

```bash
npm run check:release
```

The feature is complete only when source rules, architecture, types, tests, SSR build, production dependencies, hydration, accessibility, and browser behavior agree.
