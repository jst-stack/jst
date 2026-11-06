# Security Policy

## Reporting a vulnerability

Do not disclose vulnerabilities in public issues, discussions, or pull requests.

Use GitHub's [private vulnerability reporting](https://github.com/jst-stack/jst/security/advisories/new) for this repository. If private reporting is unavailable, contact the maintainer through their GitHub profile and request a private channel without including vulnerability details in the first message.

Include affected versions, impact, reproduction steps, and any known mitigation. You should receive an acknowledgement within seven days; timelines for a fix and coordinated disclosure depend on severity and scope.

## Supported versions

Security fixes target the latest commit on `main`. Applications created from this template must maintain their own dependency updates and security policy.

## Dependency policy

`npm run check:release` blocks high-severity production dependency advisories. Development-only tools are reviewed separately because npm may report advisories in fixed-input linters and test runners before an upstream release exists; they must never be mistaken for a clean production audit. Critical toolchain advisories are overridden to patched transitive versions only when the existing public API remains compatible and the complete quality gate passes.

The development review is recorded in `security/development-advisories.json` and enforced by `npm run audit:development`. The ledger is keyed by package, not by advisory id, because npm reissues advisory ids for the same package while the review decision stays unchanged; a reviewer's decision therefore survives registry refreshes and dependency bumps on its own. The gate fails when a waived package is also reported by `npm audit --omit=dev`, so the ledger can never launder a production advisory, and when a waiver passes its `expires` date.

Reviewers run `npm run audit:development:sync` to record the packages that the current lockfile reports as development-only, and `npm run audit:development:sync -- --review` to renew expiring waivers for another 90 days, then replace the generated `reason` with the actual decision. The script refuses to record a waiver for anything that reaches the production tree.
