# Release process

1. Update changelogs and [`jst.compatibility.json`](../jst.compatibility.json).
2. Run every repository `check`, package dry run, browser matrix, benchmark, and generated npm/pnpm canary.
3. Publish the ESLint plugin and `create-jst` through their tag-triggered OIDC workflows with provenance.
4. Tag the template with the exact version referenced by the CLI.
5. Run the released-artifact canary, then update the advertised compatibility row and showcase submodule pointer.

Do not replace immutable tags or publish a compatibility row before the released artifacts pass the same gates as local source.
