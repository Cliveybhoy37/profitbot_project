# Apollo Recovery Checkpoint — 1S.4

## Purpose

This checkpoint records the completed 1S.4 implementation:

**1S.4 — Operational Handoff Integration / Qualification Audit**

The implementation safely composes preserved protected-peak operational evidence into the existing execution qualification/preflight boundary without re-quoting, reconstructing quote evidence, acquiring provider state, using a signer, encoding an execution plan, or broadcasting a transaction.

## Authoritative Repository State

Branch:

`repair/simulation-safety`

1S.4 implementation commit:

`012db3ee73e9656f2d2c084797a6e8fff58b9af8`

Subject:

`Add protected peak qualification composition`

Parent:

`556b4c35dee1f9293e15ec79abf5f75cb989ccbc`

Parent subject:

`Add 1S.3 recovery checkpoint`

At 1S.4 implementation closure, local HEAD and `origin/repair/simulation-safety` were both:

`012db3ee73e9656f2d2c084797a6e8fff58b9af8`

The worktree was clean.

## 1S Sequence

The relevant progression is:

`1R timing/performance`
→ `1S.1 architecture audit`
→ `1S.2 schema/economic ownership audit`
→ `1S.3 protected peak handoff`
→ `1S.4 protected peak qualification composition`

1S exists to safely connect the newer protected-peak operational evidence pipeline to the earlier execution qualification/preflight pipeline.

The safety principle remains:

**1S validates and selects evidence; it does not recreate evidence.**

## 1S.3 Input Boundary

1S.3 introduced:

`scripts/utils/polygonV4ProtectedPeakHandoff.js`

Its responsibility is to select exact preserved protected-peak evidence from the latest operational result.

It fails closed unless the latest operational evidence proves the required acquisition and stability conditions.

Important properties include:

- latest cycle only
- no fallback to older evidence
- acquisition complete
- stability evidence present
- protected peak present
- peak must be interior
- protected amount stable
- best protected evidence must be `QUOTE_OK`
- observation block must match its snapshot block
- snapshot blocks must increase
- selected evidence is returned by object identity
- quote metadata is not reconstructed

The 1S.3 implementation commit is:

`e1fc5f36b8eed73516d5b2fd2917ebb83d6b4d7e`

The 1S.3 recovery checkpoint commit is:

`556b4c35dee1f9293e15ec79abf5f75cb989ccbc`

## 1S.4 Architecture Finding

Before implementation, the existing live qualification helper was audited.

`runPolygonV4LiveQualification.js` was not suitable as the direct protected-peak handoff consumer because it performs a fresh `observeThreeLegEconomics()` quote before qualification.

Using that helper directly would violate the 1S.3 rule that preserved evidence must be selected and validated rather than recreated.

The 1Q operational runner also remains acquisition-only and was not modified to absorb execution policy.

The chosen 1S.4 seam is therefore a pure composition utility.

## 1S.4 Implementation

New utility:

`scripts/utils/polygonV4ProtectedPeakQualification.js`

New tests:

`test/polygonV4ProtectedPeakQualification.test.js`

The utility composes:

`selectProtectedPeakHandoff()`
→ `buildObservedV4Candidate()`
→ `buildV4ExecutionLegs()`
→ `preflightObservedV4Candidate()`

No quote operation is performed by the new utility.

No provider is constructed or queried.

No signer is created.

No transaction is constructed or broadcast.

No execution-plan encoding is performed.

## Qualification Policy Snapshot

1S.4 requires an explicit qualification-time policy snapshot containing:

- `currentBlock`
- `gasPriceWei`
- `premiumBps`

Validation requires:

- `currentBlock` is a positive safe integer
- `gasPriceWei` is a positive ethers BigNumber
- `premiumBps` is a nonnegative safe integer

These values are qualification-time policy evidence.

They are deliberately not taken automatically from the protected-peak observation snapshot.

In particular, freshness is evaluated using qualification-time `currentBlock`, not the observation block as a substitute for current chain state.

Qualification-time gas price is also used instead of blindly trusting the earlier observation snapshot gas price.

## Existing Economic Policy Ownership

The new utility does not redefine the economic policy.

It delegates the existing policy checks to:

`preflightObservedV4Candidate()`

The composed preflight receives:

- candidate
- protected execution legs
- requested amount
- current block
- maximum age
- slippage
- maximum slippage
- Aave premium basis points
- estimated gas
- gas price
- safety reserve
- minimum net profit

The existing preflight remains responsible for enforcing freshness, amount consistency, slippage protection, premium cost, gas cost, reserve, and worst-case minimum-profit requirements.

No economic threshold was weakened in 1S.4.

## Failure Semantics

Structural/provenance failures before preflight remain fail-closed exceptions.

Examples include invalid protected handoff evidence or malformed candidate construction.

Economic/preflight rejection is returned as data:

- `qualified: false`
- `stage: "PREFLIGHT"`
- preserved handoff evidence
- candidate
- execution legs
- qualification-time policy values
- rejection reason

Successful qualification returns:

- `qualified: true`
- `stage: "QUALIFIED"`
- preserved handoff evidence
- candidate
- execution legs
- qualification-time policy values
- preflight result

`qualified: true` means qualification succeeded.

It does **not** mean a transaction was signed, submitted, or executed.

## 1S.4 Focused Tests

The new qualification test file contains five focused cases:

1. Exact preserved protected-peak evidence qualifies without reconstruction.
2. Qualification-time current block controls freshness and stale evidence is rejected.
3. Qualification-time gas price controls economics rather than snapshot gas price.
4. Invalid explicit policy snapshot fails closed.
5. Degraded latest protected evidence cannot fall back to older evidence.

Combined 1S focused validation:

- 1S.3 selector tests: 13
- 1S.3 composition tests: 2
- 1S.4 qualification tests: 5
- total: 20/20 passing

## Canonical Regression Gate

The repository's canonical test commands are defined in `package.json`.

Node:

`npm run test:node`

This deliberately selects files containing `node:test` and does not incorrectly run the four Hardhat/Mocha fork test files under Node's native test runner.

Result after 1S.4:

`454/454 passing`

Hardhat:

`npm run test:hardhat`

This deliberately runs:

- `test/ProfitBot.js`
- `test/execution.js`
- `test/threeLegExecution.js`

Result after 1S.4:

`29/29 passing`

Focused 1S:

`20/20 passing`

Syntax checks for the new utility and test both passed.

`git diff --check` passed.

## Test Harness Recovery Lesson

A previous overly broad command:

`node --test test/*.test.js`

incorrectly included four Hardhat/Mocha fork tests and produced `describe is not defined`.

A previous bare:

`npx hardhat test`

also selected unrelated scaffold `test/Lock.js`, whose optional Hardhat toolbox helpers are not installed.

These failures were test-harness selection problems, not 1S.4 regressions.

The correct canonical repository commands are the package scripts.

No dependency was installed to work around the unrelated `Lock.js` scaffold.

## Generated Hardhat Output

Canonical Hardhat compilation rewrites tracked generated files under:

- `artifacts/`
- `cache/`

After the regression gate, the tracked mutations were verified to be confined to those generated paths and restored from HEAD.

The final implementation worktree was clean before commit and push.

No Solidity source file was modified by 1S.4.

## 1S.4 Commit Boundary

Implementation commit:

`012db3ee73e9656f2d2c084797a6e8fff58b9af8`

Files:

1. `scripts/utils/polygonV4ProtectedPeakQualification.js`
2. `test/polygonV4ProtectedPeakQualification.test.js`

Commit statistics:

- 2 files changed
- 539 insertions

Push succeeded.

Fetch succeeded.

Local and remote commit hashes matched exactly after fetch.

## Safety Boundaries Preserved

1S.4 did not modify:

- `ProfitBot.sol`
- `ThreeLegExecution`
- `PolygonV4CandidateExecutor.sol`
- production execution helpers
- frontend/MetaMask
- deployment addresses
- `.env`
- provider cadence
- economic thresholds

1S.4 performed no:

- live-network transaction
- signer operation
- broadcast
- execution
- RPC qualification run
- HP/Bugs modification

The HP/Bugs environment remains independent and must not be disturbed.

## Provider / Codespaces State

The Codespaces secret-injection investigation remains parked by explicit user choice.

Do not resume that investigation unless requested.

The `ProfitBot-Codespace-ReadOnly` Infura endpoint was previously verified as a working Polygon read-only endpoint, but the current Codespace did not automatically inject `INFURA_POLYGON`.

Do not weaken secret handling.

Do not add `.env` or shell-startup secret workarounds merely to make provider-backed 1S work convenient.

No provider call was needed for 1S.4.

## Remaining 1S Gap

1S.4 proves the pure composition boundary.

It does not yet solve every provider-backed qualification concern.

Important remaining questions include:

- how qualification-time `currentBlock` is acquired authoritatively
- how qualification-time gas price is acquired
- how Aave premium evidence is acquired/bound
- how freshness is rechecked immediately before final qualification
- how measured gas evidence is bound to the exact route, amount, and relevant block/state
- whether a later provider-backed wrapper can remain strictly read-only
- where final policy ownership should live without duplicating or weakening existing preflight policy

In particular, `estimatedGas` is currently an explicit qualification input.

1S.4 does not claim that measured gas evidence is automatically bound to the selected protected-peak route/amount/block.

That must not be silently assumed in later work.

## Next Step

Do not jump directly to execution or live broadcast.

The next work should remain provider-only and fail-closed.

Before implementation, audit the smallest safe provider-backed wrapper that can acquire qualification-time policy evidence and feed the already-tested pure 1S.4 composition utility.

The design must preserve:

- exact protected observation identity
- no re-quote
- no fallback to older evidence
- authoritative qualification-time freshness
- explicit economic policy
- no signer
- no transaction
- no broadcast
- no weakening of profit/slippage/gas/freshness policy

Exact gas-evidence provenance must be addressed explicitly rather than assumed.

## Recovery Procedure

After any chat/session/Codespace interruption:

1. Enter `/workspaces/profitbot_project`.
2. Run `nvm use 18.20.8` if Node is not already 18.20.8.
3. Run `git status --short`.
4. Run `git log --oneline --decorate -8`.
5. Run `git rev-parse HEAD`.
6. Run `git rev-parse origin/repair/simulation-safety`.
7. Read this checkpoint.
8. Confirm local/remote repository state before modifying anything.

Persisted git history and repository files survive independently of chat context.

Unsaved editor buffers, shell processes, environment variables, dev servers, and chat context do not have the same persistence guarantees.

Never place private keys, seed phrases, passwords, API secrets, or other credentials in this checkpoint.
