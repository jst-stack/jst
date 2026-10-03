# Migrations

Run migrations only from a clean Git working tree. Preview the exact files first:

```bash
npx --package=create-jst jst migrate --from 0.3.0 --to 0.4.0 --dry-run
npx --package=create-jst jst migrate --from 0.3.0 --to 0.4.0
```

The migration command rejects unsupported version paths and customized source shapes before mutation. It runs the project quality gate after writing and restores every touched file if verification fails. Product/business code is never rewritten heuristically.
