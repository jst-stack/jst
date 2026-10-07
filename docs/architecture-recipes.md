# Architecture recipes

These are ownership recipes, not dependencies that every product must install. Add a recipe only when the use case exists.

## Authentication and authorization

- Repository adapter owns token transport and refresh mechanics.
- An application service owns sign-in/sign-out orchestration.
- Application policy exposes a narrow capability reader such as `can(action, subject)`.
- Features consume capabilities; they do not inspect roles or JWT payloads directly.
- Route guards improve UX, but the backend remains the security boundary.

Test expired credentials, refresh failure, concurrent refresh, forbidden capability, and SSR request isolation.

## Forms

- Zod schema owns boundary validation and domain-compatible field rules.
- A form adapter may wrap React Hook Form or another engine.
- The feature view model owns submission state and calls an application service.
- The view receives fields/errors/actions or a reviewed high-level form contract; it does not call repositories.

Keep server errors, validation errors, and transport failures distinct.

## Feature flags

- An adapter reads the remote provider.
- Application policy maps provider keys to typed product decisions.
- Features ask for a decision, not for a vendor SDK.
- SSR and hydration receive the same evaluated snapshot to prevent UI flicker.

Delete flags and dead branches after rollout. A permanent flag is configuration and should be named accordingly.

## Internationalization

- Translation infrastructure loads locale resources at the application boundary.
- Modules own their message namespaces.
- Domain models store locale-neutral values and error codes.
- Views translate presentation text; application services do not return human copy.
- Localized Zod messages are assembled at the form boundary.

## Query and cache strategy

Choose per use case and record it beside the repository/service:

- `network-only` for volatile or security-sensitive reads;
- `cache-first` for stable reference data;
- stale-while-revalidate for fast repeat reads that tolerate temporary staleness.

The state library is an implementation detail. Cache keys, invalidation, optimistic transaction, and rollback behavior are part of the use-case contract and require tests.

## Optimistic updates, undo, and event sourcing

- Application service owns the command and persistence outcome.
- Feature view model owns optimistic projection, pending UI, messages, and undo availability.
- Domain events are immutable completed facts.
- Undo stores the minimum inverse command or event data required to restore an invariant.

Test success, duplicate submission, rollback, late failure, retry, and undo after navigation when the product promises it.

## Cross-domain workflows

Prefer, in order:

1. a higher composition root coordinating two narrow contracts;
2. a consumer-owned facade with pure anti-corruption mapping;
3. a typed fact event for real one-to-many fan-out.

Events must describe facts (`orderSubmitted`), not commands aimed at another module (`refreshBilling`). Do not introduce a global event bus for a single consumer.

## Generated API clients

Generated OpenAPI/Orval code stays at the repository boundary:

```text
generated transport DTO/client
  → repository adapter
  → runtime validation when the generator cannot guarantee trust
  → pure mapper
  → domain model
```

Never export generated DTOs from an entity/module public API or pass them to UI. Regeneration must be deterministic and checked in CI.

## Local-first

Adopt local-first only when offline work, latency, or collaborative editing is a product requirement. Define identity, conflict resolution, persistence durability, sync ownership, and recovery before choosing a database or CRDT. Keep the sync engine behind a port so feature view models consume domain state rather than replication details.
