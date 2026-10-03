# Troubleshooting

## `npm ci` reports an out-of-sync lockfile

Run the supported npm version, update dependencies with `npm install`, review both manifest and lockfile, then rerun `npm ci`. Never hand-edit dependency entries in the lockfile.

## Architecture lint rejects an import

Read the reported source and target layers. Import another slice through its public API, move orchestration to a higher composition layer, or inject a narrow consumer-owned port. Do not add an inline JST disable; reviewed temporary exceptions belong in `jst.config.ts` with a reason and expiry.

## A generated slice needs another library

Use `npm run create:slice -- --dry-run` first. The generator prints files and dependency changes, installs only selected adapters, and rolls back source and lockfiles if installation fails.

## SSR differs from hydration

Keep request-scoped state in the app container and avoid reading browser globals during server render. Cover the observable state with a Playwright SSR/hydration test rather than hiding the warning.
