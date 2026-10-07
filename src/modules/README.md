# Bounded-context modules

Keep a capability in the default pages/features/entities topology until it spans multiple routes or the global layer tree reduces cohesion.

A module is a mini-application with one public API. It may own internal pages, workflows, domain models, services, repositories, and UI. Other modules never deep-import those internals.

Create one with:

```bash
npm run create:slice -- module projectManagement --stateful
```

Do not create a module only because a slice has many files. Extract one when it has a stable vocabulary, independent lifecycle, and clear ownership boundary.
