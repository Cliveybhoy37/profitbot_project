# Open Dependabot PR triage (23 September 2026)

This is a scope and merge-safety review of all 22 open PRs. No PR was merged. The project does not install the vendored `lib/balancer-v2` workspace in root CI; its lockfile updates require an independent build decision. Mainline dependency fixes should be tested against root npm lockfile and Hardhat before merging.

| PR | Package | Scope | Decision |
|---|---|---|---|
| #30 | follow-redirects | Root lockfile | Relevant; test with root dependency updates |
| #29 | follow-redirects | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #28 | axios | Root manifest and lockfile | Superseded: tested axios 1.20.0 in repair branch; do not merge older 1.15.0 |
| #27 | lodash | Vendored Balancer manifest and lockfile | Defer pending vendored workspace policy |
| #26 | lodash | Root lockfile | Relevant; test with root updates |
| #25 | picomatch | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #24 | serialize-javascript, hardhat | Root manifest and lockfile | Requires Hardhat compatibility and contract tests |
| #23 | brace-expansion | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #22 | yaml | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #21 | picomatch | Root lockfile | Relevant; test with root updates; distinct from #25 |
| #20 | flatted | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #19 | undici, hardhat | Root manifest and lockfile | Overlaps #24 Hardhat; test one compatible version |
| #17 | immutable | Root lockfile | Relevant; test with root updates; distinct from #16 |
| #16 | immutable | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #14 | rollup | Vendored Balancer manifest and lockfile | Defer pending vendored workspace policy |
| #13 | bn.js | Root lockfile | Relevant; test with root updates |
| #12 | ajv | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #11 | pbkdf2 | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #9 | eslint | Vendored Balancer manifests and lockfile | Major upgrade; defer compatibility work |
| #6 | sha.js | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #5 | cipher-base | Vendored Balancer lockfile | Defer pending vendored workspace policy |
| #4 | form-data | Root lockfile | Superseded: tested form-data 4.0.6 in repair branch; do not merge older 4.0.4 |

Additional remote branch `lib/balancer-v2/undici-5.29.0` has no common ancestor with main and includes tracked `.env` filenames. Do not merge it or inspect secret contents. Root `main` does not track those filenames in its current tree; history contains a commit touching them. Treat any credentials that may have been stored there as potentially exposed and rotate them through the issuing services without placing replacements in Git.

Root `npm audit --omit=dev` at this checkpoint reports 19 findings (1 critical, 2 high, 4 moderate, 12 low); high/critical packages include `form-data`, `axios`, and `ws`. This counts transitive dependencies and is not evidence of exploitable bot behavior. Fixes require incremental root dependency updates and tests; a suggested `ws` fix involves a major ethers change and must not be applied blindly.

After focused axios 1.20.0 and form-data 4.0.6 upgrades, `npm audit --omit=dev` reports 16 findings (0 critical, 1 high, 3 moderate, 12 low). Remaining high is `ws`, which requires separate dependency-tree review; no ethers major upgrade was applied.

A scoped npm override now resolves `ws` under `@ethersproject/providers` to 8.21.3 while retaining ethers v5. After `npm ci` and the complete test suite, `npm audit --omit=dev` reports 15 findings (0 critical, 0 high, 1 moderate, 14 low). The separate Hardhat development dependency still uses ws 7.5.10; this is not part of the production-only audit. Review the full dependency tree again before production use.
