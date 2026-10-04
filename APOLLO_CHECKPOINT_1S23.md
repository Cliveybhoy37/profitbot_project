# Apollo Checkpoint — 1S.23 Prepared Execution Lifecycle Composition

## Status

1S.23 implementation is complete locally.

Implementation commit:
`15505cb4fb3e9049fa321e08b235c3d94afb54cd`

Parent:
`c0757add0a2db018a76008fc1002c6f1223be275`

Branch:
`repair/simulation-safety`

No live-network transaction, signer acquisition, or broadcast was authorized or performed.

## Objective

1S.23 adds the identity-preserving lifecycle composition joining the frozen execution components:

1. acquire preparation execution context
2. prepare one exact execution plan
3. measure gas for that exact prepared plan
4. acquire fresh qualification execution context
5. reject an expired immutable prepared deadline
6. qualify the exact unchanged prepared context
7. run final controlled-fork simulation only when qualified

## Implementation

Added:

- `scripts/utils/polygonV4PreparedExecutionLifecycleComposition.js`
- `test/polygonV4PreparedExecutionLifecycleComposition.test.js`

Primary function:

`runPreparedExecutionLifecycleComposition(...)`

## Lifecycle invariant

The lifecycle is:

operational result
→ preparation execution context
→ exact prepared execution plan
→ exact-plan fork-receipt gas evidence
→ fresh qualification execution context
→ deadline freshness gate
→ prepared-context qualification
→ final controlled-fork simulation

The prepared execution plan is created once before gas measurement.

Candidate, execution legs, execution plan, deadline, and minimum-profit identity are not rebuilt after measurement.

## Deadline invariant

The preparation context supplies the deadline encoded into the exact measured execution plan.

After measurement, 1S.23 acquires a fresh qualification execution context.

It fails closed when:

`preparedExecutionContext.deadline <= qualificationExecutionContext.policyBlockTimestamp`

The fresh context's newly computed deadline does not replace or extend the prepared deadline.

The plan is not rebuilt or re-measured to hide elapsed time.

## Policy and gas ownership

Fresh qualification policy is acquired only after exact-plan gas measurement.

The fresh authoritative policy snapshot is supplied to the existing 1S.22 prepared-context qualification boundary.

Exact execution gas remains owned by the existing fork-receipt gas-evidence producer.

1S.23 does not substitute conservative policy gas or historical gas evidence for measured execution gas.

## Qualification and simulation ownership

1S.22 remains responsible for prepared execution-context qualification.

An unqualified result is preserved and final simulation is not run.

Final controlled-fork simulation remains owned by the existing qualified-execution fork-simulation utility.

Fork provenance and exact execution functions remain injected/caller-owned.

## Test evidence

Focused 1S.23:
- 7 passed
- 0 failed

Affected composition:
- 56 passed
- 0 failed

Canonical Node:
- 581 passed
- 0 failed

Canonical Hardhat:
- 29 passed
- 0 failed

Canonical total:
- 610 passed
- 0 failed

The focused 1S.23 suite was reconfirmed after Hardhat execution:
- 7 passed
- 0 failed

Generated Hardhat artifact/cache churn was restored before final scope verification.

## Exact implementation patch

Exact staging gate passed.

Patch:
- 2 files
- 984 insertions
- 0 deletions

No forbidden implementation paths were staged.

## Explicit non-ownership

1S.23 does not own:

- provider construction
- fork reset
- fork provenance creation
- signer acquisition
- live account selection
- live transaction construction or submission
- flashloan initiation
- broadcast
- candidate reconstruction after preparation
- execution-leg reconstruction after preparation
- execution-plan reconstruction after preparation
- historical gas-evidence acquisition
- policy-gas substitution
- deployment-address changes
- frontend or MetaMask integration

## Repository boundary

This milestone did not modify:

- `ProfitBot.sol`
- `ThreeLegExecution`
- frontend/MetaMask code
- deployment addresses
- `.env`
- HP/Bugs observer configuration
- protected minimum-profit policy
- protected slippage policy
- maximum-age policy

## Safety boundary

Passing 1S.23 does not authorize live execution.

Before any live flashloan-capable send, separately verify:

- intended chain
- deployed contracts and dependency addresses
- route and amount identity
- current policy and economics
- exact execution-plan binding
- exact gas evidence
- deadline and block freshness
- allowances and balances
- final simulation/preflight
- signer/account identity
- transaction parameters
- explicit broadcast authorization

Signer acquisition and live broadcast remain separate go/no-go boundaries.

## Recovery

Recover durable state with:

`git status`

`git log --oneline --decorate -10`

`git show --stat 15505cb4fb3e9049fa321e08b235c3d94afb54cd`

`cat APOLLO_CHECKPOINT_1S23.md`

Do not infer live readiness merely from this checkpoint.

## Next boundary

Select the next milestone only after a fresh read-only architecture/readiness audit.

Do not silently turn 1S.23 into a live broadcaster.
