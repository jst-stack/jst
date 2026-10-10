# Troubleshooting

## `npm ci` reports an out-of-sync lockfile

Run the supported npm version, update dependencies with `npm install`, review both manifest and lockfile, then rerun `npm ci`. Never hand-edit dependency entries in the lockfile.

## Architecture lint rejects an import

Read the reported source and target layers. Import another slice through its public API, move orchestration to a higher composition layer, or inject a narrow consumer-owned port. Do not add an inline JST disable; reviewed temporary exceptions belong in `jst.config.ts` with a reason and expiry.

## A source file has the wrong name or directory

Use `<lowerCamelName>.<role>.ts(x)` and place the role in the directory named by `jst.config.ts`. Generate canonical structures with `npm run create:slice -- <kind> <name>` instead of guessing. Change a deliberate convention through the typed policy, not by editing the plugin.

## A view cannot import a store or call an async service

Observe the view model in the feature entry. Pass serializable state and callbacks into the `*.component.tsx` view. Async orchestration belongs in the store, service, or composition boundary; rendering stays replaceable and independently testable.

## Browser or network access is rejected

Move `fetch`, storage, cookies, workers, sockets, analytics, and vendor SDK access behind an entity repository or shared infrastructure adapter. Define the narrow port beside its consumer and bind the adapter at a composition root.

## A generated slice needs another library

Use `npm run create:slice -- --dry-run` first. The generator prints files and dependency changes, installs only selected adapters, and rolls back source and lockfiles if installation fails.

## SSR differs from hydration

Keep request-scoped state in the app container and avoid reading browser globals during server render. Cover the observable state with a Playwright SSR/hydration test rather than hiding the warning.
