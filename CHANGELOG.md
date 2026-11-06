# Changelog

Notable changes to the JST application template are documented here.

## 0.4.37

- Enforce that the compatibility manifest documents the release tag before publishing, and backfill the changelog and documentation entries that were missing for earlier releases.

## 0.4.36

- Document the production advisory level in the development advisory ledger gate.

## 0.4.35

- Refresh development and production dependencies, including the Dependabot metadata action.

## 0.4.34

- Keep the development advisory review intact across Dependabot bumps.

## 0.4.33

- Automate template patch releases from main.

## 0.4.32

- Ship the hardened JST MCP integration, exact dependency specs in generated projects, safe Dependabot auto-merge, and release preparation without elevated pull-request access.

## 0.4.31

- Adds signed release archives and strengthens supply-chain security metadata.

## 0.4.30

- Roll slice generation back cleanly on interruption and reject concurrent generator writes.

## 0.4.29

- Remove the template-only option module from generated projects so `npm run check` stays green.

## 0.4.28

- Consume the split quality and architecture enforcement through the compatibility preset.

## 0.4.27

- Validate ESLint proof reports before consuming diagnostics.

## 0.4.26

- Use the pinned npm release in every cross-platform architecture proof job.

## 0.4.25

- Add the reproducible architecture repair proof and structured diagnostics.

## 0.4.18

- Keep ecosystem-only release automation and documentation out of generated applications while preserving the complete architecture kernel.

## 0.4.17

- Add a canonical documentation site, project-health proof, release compatibility automation, pinned container images, hardened dependency resolutions, and adversarial validation across the ecosystem.

## 0.4.16

- Publish the first-feature onboarding, product-fit guidance, public roadmap, sponsorship policy, and expanded diagnostic repair paths.
- Link architecture diagnostics to stable rule documentation through `@jst-stack/eslint-plugin` 0.4.3.
- Verify documentation links and use least-privilege release permissions.

## 0.4.15

- Keep release installs reproducible with the npm version declared by the project.
- Refresh optional dependency metadata for clean installs on current Node runners.

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
