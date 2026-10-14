# Apollo Checkpoint — 1S.20 Controlled-Fork Integration

## Status

1S.20 controlled-fork integration is locally complete.

This checkpoint records the controlled-fork integration that follows the
already-closed 1S.20 pure preservation boundary.

No live Polygon transaction was performed.
No live signer was used.
No live-network signer or broadcast is authorized by this milestone.

## Implementation

Implementation commit:

`7362763be6dcbb4dde3fcf92da2762f2cac677d6`

Parent / previously closed 1S.20 pure checkpoint:

`a7df850e1cdcd0dbf975d992a3c6bc74f169c3a9`

Implementation scope:

`test/polygonV4QualifiedExecutionForkSimulationIntegration.test.js`

The implementation commit contains exactly that one integration test.

## Purpose

The integration proves that the exact execution identity preserved through
the successful 1S.19 qualification-context boundary can be handed unchanged
through the pure 1S.20 fork-simulation boundary and executed on a controlled,
pinned Polygon fork.

The integration does not rebuild the execution plan after qualification.

The exact `qualifiedContext.executionPlan` returned by the real
`qualifyAndPreserveExecutionContext()` boundary is the plan supplied through
`runQualifiedExecutionForkSimulation()` and ultimately supplied to
`executor.initiateFlashloan()`.

## Historical Controlled-Fork Fixture

Pinned Polygon fork block:

`94709817`

The integration uses the closed historical execution evidence fixture as the
deterministic controlled-fork input.

The preserved encoded plan is hashed and checked against the immutable
historical `executionPlanHash` before execution.

This is a deterministic historical integration fixture.

It is NOT evidence that a fresh current-market candidate qualified at the
time this test was run.

It is NOT permission to reuse historical economics, gas evidence, freshness,
or profitability as current live execution evidence.

## Qualification-Boundary Semantics

The integration enters the real:

`qualifyAndPreserveExecutionContext()`

boundary.

Its qualification dependency is intentionally injected for this deterministic
historical integration fixture.

Therefore the test proves preservation and execution mechanics across the real
1S.19 context-preservation boundary, but it does not claim to perform a fresh
provider-backed current-market qualification.

The returned successful qualified context preserves the exact identities of:

- qualification result
- candidate
- execution legs
- encoded execution plan
- deadline
- authoritative policy snapshot
- qualification gas evidence

The subsequent 1S.20 simulation layer consumes that exact preserved context.

## Controlled-Fork Ownership

The integration test owns the controlled environment mechanics:

- explicit opt-in via `USE_1S20_FORK_SIMULATION=true`
- exact `POLYGON_FORK_BLOCK=94709817`
- `ALCHEMY_POLYGON` required as read source
- `hardhat_reset`
- local Hardhat fork signer
- deployment of `PolygonV4CandidateExecutor`
- local fork transaction submission
- receipt wait
- executor accounting reads

These mechanics are deliberately outside the pure 1S.20 production helper.

## Execution Evidence

The final controlled-fork test result was:

`1 passing`

The final execution gate required both:

- Hardhat/Mocha exit code 0
- explicit `1 passing` output

This requirement exists because an earlier attempted run used the wrong test
runner.

## Zero-Test Correction

The first attempted controlled-fork invocation used a test implemented with
`node:test` but invoked it through `hardhat test`.

Hardhat returned exit code 0 while reporting:

`0 passing`

That run is INVALID as controlled-fork execution evidence.

No transaction from that zero-test run is considered proven.

The integration was corrected to use the repository's established
Hardhat/Mocha `describe` / `it` fork-test pattern.

After correction, the test was explicitly opted in and produced a genuine:

`1 passing`

result.

The strengthened version was then rerun and again produced:

`1 passing`

The final pre-commit closure also produced:

`1 passing`

## Execution Accounting Validated

The controlled-fork integration validates the executor's post-execution
accounting relationships, including:

- exact flashloan amount
- debt relationship
- route output
- incremental profit
- retained loan-asset funds
- positive receipt gas usage

The retained balance is validated against the successful incremental profit
under the test's zero-starting-balance condition.

## Allowance Cleanup Validated

The strengthened integration independently validates cleanup of the relevant
temporary allowances after successful execution:

- WPOL -> Aave Pool = 0
- WPOL -> Uniswap V3 Router = 0
- DAI -> Permit2 = 0
- APEPE -> Uniswap V3 Router = 0

These checks are part of the actual successful controlled-fork execution test.

## Simulation Evidence vs Qualification Gas Evidence

Final controlled-fork simulation evidence remains semantically separate from
qualification gas evidence.

The simulation result is not substituted for the preserved qualification gas
evidence.

The existing exact historical FORK_RECEIPT gas evidence remains bound to its
own historical execution identity.

The conservative runtime policy gas value is not substituted for measured
receipt gas.

## Test Closure

Affected Node composition suite:

`66/66`

Canonical Node suite:

`564/564`

Canonical Hardhat suite:

`29/29`

Canonical total:

`593/593`

The controlled-fork integration is separate from the canonical suite and is
explicitly opted in.

Final controlled-fork integration:

`1/1`

Final validation established:

- preserved plan execution validated
- execution accounting validated
- allowance cleanup validated
- exact fork block validated
- generated Hardhat artifact/cache churn restored
- implementation diff check clean
- exact implementation scope clean

## Signer and Network Boundary

A local Hardhat signer was used to deploy the executor and submit the
transaction to the ephemeral controlled Polygon fork.

That local signer is NOT a live Polygon signer.

No live Polygon transaction was performed.

No live-network signer was used.

No live-network transaction or flashloan broadcast is authorized by this
checkpoint.

Passing this integration test does not authorize production execution.

## Repository Boundary

This milestone did not modify:

- `ProfitBot.sol`
- `ThreeLegExecution`
- production execution helpers
- frontend / MetaMask integration
- deployment addresses
- `.env`
- HP / Bugs observer environment

The implementation adds only the controlled-fork integration test.

## Current Durable Lineage

1S.20 pure implementation:

`edd998afb904201cf620cb984cf596377c08e327`

1S.20 pure checkpoint:

`a7df850e1cdcd0dbf975d992a3c6bc74f169c3a9`

1S.20 controlled-fork integration implementation:

`7362763be6dcbb4dde3fcf92da2762f2cac677d6`

## Next Boundary

After this checkpoint is committed and both commits are remotely verified,
the next work must remain separate from this historical controlled-fork proof.

Before any actual live-capable execution can be considered, a fresh execution
candidate must independently satisfy the current protected pipeline and all
current execution invariants.

At minimum that later boundary must independently verify:

- current chain and deployment identity
- fresh candidate and observation identity
- exact route and flashloan amount
- authoritative current policy snapshot
- current gas evidence and economics
- slippage and minimum protected net profit
- deadline and freshness
- balances and required allowances
- exact execution-plan binding
- final simulation/preflight evidence
- signer/account identity
- exact transaction parameters

Signer acquisition and live-network broadcast remain separately authorized
operations and are NOT authorized here.

## Recovery Rule

On session recovery, treat Git history, this checkpoint, the 1S.20 pure
checkpoint, source, and tests as authority.

Do not infer live authorization from successful controlled-fork execution.

Do not treat the historical fixture as current-market qualification evidence.

Do not treat the earlier `0 passing` run as execution evidence.
