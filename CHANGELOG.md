# Changelog

Notable changes to the JST application template are documented here.

## 0.4.14

- Explain how to connect generated slices while preserving Knip's unreachable-code gate.
- Block high-severity production advisories and patch compatible critical toolchain dependencies.
- Keep Docker installs reproducible with the npm version declared by the project.

## 0.4.13

- Add bounded-context modules, workspace packages, and explicit microfrontend readiness contracts.
- Enforce request-scoped providers, package public APIs, dependency declarations, extraction ADRs, and acyclic workspace dependencies.
- Add architecture evolution and production pattern recipes derived from the Klenov architecture review.
- Add npm/pnpm-aware package generation and workspace build/test gates.
- Pin ESLint across package managers and parallelize workspace checks for deterministic canaries.
