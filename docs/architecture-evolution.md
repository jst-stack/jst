# Architecture evolution

JST keeps invariants strict while allowing the physical boundary to move outward as product and organizational complexity becomes real.

## 1. Page-local

Keep a small route together while it has no independent workflow. Effects still stay outside presentational UI, and normal file/complexity rules apply.

Promote when state lifecycle, reuse, vocabulary, or repeated change pressure becomes independent from the page.

## 2. Vertical slices

This is the default JST topology. Pages compose features; features own user interactions; entities provide reusable domain capabilities.

## 3. Bounded-context module

Use `npm run create:slice -- module <name>` when one capability spans routes and splitting it across global layers reduces cohesion. A module may own internal pages, model, services, repository, and UI. Consumers see only `<name>.public.ts`.

Do not create a module because a folder is large. Create one for stable vocabulary, lifecycle, and ownership.

## 4. Workspace package

Use `npm run create:package -- <name>` when a proven module needs independent build ownership, reuse by another application, or a stronger physical boundary.

The generator registers `packages/*`, creates an explicit package export and an ADR. Architecture checks reject:

- wildcard/deep exports;
- imports through another package's `src`;
- undeclared internal dependencies;
- package cycles;
- missing extraction decisions.

Both npm and pnpm remain supported. The package boundary must not change the internal business architecture.

## 5. Microfrontend

A microfrontend is an independently deployable bounded context, not a large component. Create its package contract with:

```bash
npm run create:package -- billing \
  --kind microfrontend \
  --owner checkout-team \
  --host-contract contracts/billing-host.v1.ts \
  --fallback billing-unavailable
```

The host owns shell navigation, authentication handoff, observability, and failure isolation. A remote owns its domain flow and data. Do not share mutable application state. Prefer routing, narrow callbacks, or versioned fact events; keep E2E focused on host integration and cover business behavior inside the remote.

Module Federation is optional. Choose it only after the ownership, runtime, SSR, compatibility, and rollback contracts are defined.

## Architecture decisions

Package extraction changes build and ownership boundaries, so it requires a short decision under `docs/decisions` with:

- Context
- Decision
- Consequences
- Revisit when
- Rollback

Policy exceptions remain narrow and expiring. An ADR explains a deliberate topology change; it does not disable code-quality rules.
