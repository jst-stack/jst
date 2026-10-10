# Project health and evidence

JST publishes evidence for its engineering claims. A badge is a link to the underlying run or registry record, not a substitute for review.

| Signal | Evidence |
| --- | --- |
| Template validation | [CI](https://github.com/jst-stack/jst/actions/workflows/ci.yml), [browser matrix](https://github.com/jst-stack/jst/actions/workflows/browser-matrix.yml), [security](https://github.com/jst-stack/jst/actions/workflows/security.yml) |
| Generated-project portability | [create-jst CI](https://github.com/jst-stack/create-jst/actions/workflows/ci.yml) on npm/pnpm and Linux/macOS/Windows |
| Published artifact | [release canary](https://github.com/jst-stack/create-jst/actions/workflows/released-canary.yml), [create-jst on npm](https://www.npmjs.com/package/create-jst) |
| Architecture-policy performance | [plugin benchmarks](https://github.com/jst-stack/eslint-plugin/actions/workflows/benchmark.yml), [plugin on npm](https://www.npmjs.com/package/@jst-stack/eslint-plugin) |
| Showcase quality | [CI](https://github.com/jst-stack/jst-showcase/actions/workflows/ci.yml), [browser matrix](https://github.com/jst-stack/jst-showcase/actions/workflows/browser-matrix.yml), [performance](https://github.com/jst-stack/jst-showcase/actions/workflows/performance.yml) |
| Supply chain | [OpenSSF Scorecard](https://securityscorecards.dev/viewer/?uri=github.com/jst-stack/jst), npm provenance on each published version, immutable release tags |
| Supported combinations | [`jst.compatibility.json`](https://github.com/jst-stack/jst/blob/main/jst.compatibility.json) and [compatibility guide](compatibility.md) |
| Bundle limits | `npm run lint:budgets` in the template and showcase release gates |

## What is measured

- CLI generation is exercised against both package managers on all three supported operating systems.
- Playwright covers SSR output, hydration, accessibility, and Chromium/Firefox/WebKit behavior.
- The policy benchmark records cold and cached wall time, CPU time, and peak memory against a reviewed baseline.
- Production dependency audits, CodeQL, dependency review, and provenance run independently of product tests.

JST does not collect runtime telemetry from generated applications. Download counts come from npm; contribution and response metrics come from public GitHub data.
