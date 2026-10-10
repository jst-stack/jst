# Compatibility

[`jst.compatibility.json`](https://github.com/jst-stack/jst/blob/main/jst.compatibility.json) is the machine-readable support contract. A CLI release selects the listed immutable template tag; generated projects use the listed plugin range and Node/package-manager majors. Combinations outside that manifest are not release-tested.

| Template | create-jst | ESLint plugin | Node | Package managers |
| --- | --- | --- | --- | --- |
| `v0.4.17` | `>=0.4.0 <0.5.0` | `>=0.4.4 <0.5.0` | `>=24.15.0 <25` | npm 11, pnpm 10 |

The release canary creates npm and pnpm projects from published artifacts and runs their complete checks before the combination is advertised.
