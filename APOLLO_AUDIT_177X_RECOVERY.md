# Apollo / ProfitBot — Step 177X Audit Recovery Record

**Status:** Repository recovery record
**Prepared:** 2026-10-11
**Latest completed terminal operation before creation:** 177X-O135-R1
**Purpose:** Preserve verified audit findings, repository protections, unresolved risks, and recovery instructions.

## 1. Recovery and authorization rules

This record supplements `APOLLO_CHECKPOINT.md`; it does not replace that checkpoint or Git history.

Historical contracts, scanners, research utilities, and execution paths must not be assumed to constitute one current production architecture. Verify integration against the current source tree and Git history.

Operate one step at a time, with explicit approval before each terminal operation. Approval of an inspection does not authorize edits, tests, compilation, RPC requests, signing, authorization callbacks, broadcasting, staging, commits, or pushes.

Never record private keys, seed phrases, passwords, API secrets, or credentials.

## 2. Last verified repository state

Step 177X-O135-R1 completed with preflight and postflight verification.

- Repository: `/workspaces/profitbot_project`
- Branch: `repair/simulation-safety`
- HEAD: `bd84e221e4875032f7caf143e475e7d2aeb05355`
- Tracked working tree: clean
- Staged changes: none
- Experimental untracked tests: exactly three
- Seven protected SHA-256 hashes: matched
- Completion marker: `STEP_177X_O135_R1_COMPLETE=YES`

Protected SHA-256 values:

| File | SHA-256 |
|---|---|
| `package.json` | `353ff3824c8f4408b58b7e517000e21838df736feb56a6f83a7d663ba0150934` |
| `package-lock.json` | `cd3d4d3e46c9e38f812de57973a7ca7f84348c80428feaee75d6e549a83f0556` |
| `APOLLO_CHECKPOINT.md` | `a5b1cfc5d147d6f0ba4777568f0603cc11e6c3674b79d57b9ebfdcaaac407cb9` |
| `contracts/PolygonV4CandidateExecutor.sol` | `1b27e0949ac65b6fb423cb601ea52f6746e6a511b592dbd28bf90111e4d98cf5` |
| `test/polygonV4GasStateSensitivityProbe.test.js` | `5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7` |
| `test/polygonV4PairedGasMeasurementIntegration.test.js` | `5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139` |
| `test/polygonV4PairedGasStateSensitivityIntegration.test.js` | `b2a2095e9179e659b9aa3e25370fb0bf2253f755871c5983f675711e5f6a5be8` |

The three experimental tests must remain untracked unless a later operation explicitly authorizes otherwise.

## 3. Existing checkpoint

O135 stopped at a 200,000-byte inspection limit.

O135-R1 completed a bounded, read-only inspection of `APOLLO_CHECKPOINT.md`:

- Size: 314,741 bytes
- Lines: 8,221
- Headings: 350
- Selected lines printed: 128
- Protected SHA-256: matched

The checkpoint's final recovery section describes O64 and refers to O63 isolated Hardhat regression evidence.

The bounded inspection did not review every historical section. This document supplements that history without rewriting it.

## 4. Historical Polygon V4 research route

The inspected research configuration uses Polygon chain ID 137 and the route:

**WPOL → DAI → APEPE → WPOL**

1. Uniswap V3 entry: WPOL → DAI.
2. Uniswap V4 middle: DAI → APEPE.
3. Uniswap V3 exit: APEPE → WPOL.

The targeted sweep configures the V4 pool key with DAI as `currency0`, APEPE as `currency1`, fee `10000`, tick spacing `100`, and zero hooks. `zeroForOne: true` agrees with DAI → APEPE.

The targeted historical block is `94709817`.

These are source-level findings, not fresh on-chain verification of pool identity, liquidity, or profitability.

## 5. Verified source-audit findings

### V3 and V4 quote composition

The default research observer passes the historical block tag through the entry V3, middle V4, and exit V3 quote calls.

The strict V3 observer checks factory pools across configured fee tiers, quotes against the specified block, selects the highest successful output, and distinguishes `QUOTE_OK`, `NO_ROUTE`, and `RPC_FAILURE`.

The V4 observer validates the supplied pool-key structure and amount, requests a block-pinned quote, and passes its output into the exit observer.

### Venue registry — O133

`scripts/utils/polygonScannerVenues.js` configures `UNISWAP_V3` with:

- Factory: `0x1F98431c8aD98523631AE4a59f267346ea31F984`
- Quoter: `0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6`

The registry also defines separate QuickSwap V2 and SushiSwap V2 venues.

Configured addresses were inspected; deployed bytecode was not independently verified.

### Fee tiers — O134

`scripts/utils/uniswapV3Quote.js` defines:

- `FULL_FEE_TIERS = [100, 500, 3000, 10000]`
- `FAST_FEE_TIERS = [500, 3000]`

The strict research observer imports `FULL_FEE_TIERS` directly and is not reduced to the legacy fast-mode configuration.

The legacy quote helper catches per-tier errors without distinguishing infrastructure failures from missing routes. Its error semantics must not be treated as equivalent to the strict observer.

## 6. Unresolved safety findings

### A. V4 currency-direction invariant

The reusable three-leg observer does not explicitly enforce that V4 pool currencies match entry and exit tokens according to `zeroForOne`.

The inspected default route is aligned, but generic inputs are not equivalently protected.

### B. Pool-cache identity

The inspected V3 cache keys include block tag, sorted token pair, and fee, but omit provider, chain, and factory identity.

The default amount-surface acquisition uses a fresh cache. Reuse across incompatible contexts remains a potential hazard.

### C. Block identity

Block numbers are passed into the quote calls, but the returned evidence does not independently authenticate a common block hash.

### D. Gas denomination

Generic economic calculations may compare native-token gas costs directly against arbitrary ERC-20 starting-token amounts.

The nominal WPOL-based route uses compatible wei-scale units under its accounting assumptions. Arbitrary starting tokens require explicit conversion or restriction.

### E. Legacy quote errors

The legacy helper can silently discard infrastructure errors and return zero output when no fee tier succeeds.

### F. Live execution readiness

No current finding establishes live trading readiness. Historical gross quote profit is not realized net profit after premium, gas, slippage, and execution risk.

## 7. Historical validation

Earlier approved operations recorded:

- Node regression: 1,268 / 1,268 passing.
- Hardhat regression: 29 / 29 passing.
- Isolated Hardhat compilation and fork-stage gas evidence.

These tests were not rerun during O129–O135-R1.

A previous Hardhat run modified tracked generated artifacts and cache data; those changes were subsequently restored under a separate approved recovery step.

Future tests require separate authorization and safeguards against tracked artifact changes.

## 8. Execution boundary

`contracts/PolygonV4CandidateExecutor.sol` was inspected as an isolated fork-stage executor, not verified as a production-integrated trading system.

Its callback checks repayment and configured minimum incremental profit, but does not subtract transaction gas on-chain when checking profitability.

The broader submission path contains separate simulation, transaction validation, authorization, and broadcast boundaries.

**No live transaction is authorized.**

## 9. Recommended engineering priorities

1. Enforce V4 pool-currency and direction continuity.
2. Restrict starting-token denominations or implement explicit gas-cost conversion.
3. Strengthen quote/cache identity with chain, provider, factory, and block provenance.
4. Review failure handling and partial fee-tier errors.
5. Add targeted tests only after separate approval.
6. Reassess execution economics and gas-limit safety before considering live execution.

These priorities are recommendations, not approved changes.

## 10. Recovery and next steps

Latest completed terminal operation before this document: **177X-O135-R1**.

Step O136 drafted the recovery record in chat. Step O137 was separately approved to create only this new file.

After O137, verify the terminal output and inspect the resulting file hash and Git status under a separately approved operation if necessary.

Any staging or commit requires independent authorization.

After interruption:

1. Verify repository root, branch, HEAD, status, and protected hashes.
2. Read the existing checkpoint using bounded output.
3. Inspect this record if it exists.
4. Reconcile source findings against the current repository.
5. Preserve the three experimental tests.
6. Obtain approval before the next operation.

Codespaces can stop independently of chat. Saved repository files and Git commits are more durable than terminal processes, unsaved buffers, temporary directories, or chat context.

**End of recovery record.**
