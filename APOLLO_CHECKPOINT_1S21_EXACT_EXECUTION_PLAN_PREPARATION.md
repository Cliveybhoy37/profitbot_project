# Apollo Checkpoint — 1S.21 Exact Execution Plan Preparation

## Status

1S.21 implementation is complete locally.

This milestone introduces a pure execution-plan preparation seam before
fork-receipt gas measurement and evidence-bound qualification.

It does NOT authorize live execution.

## Implementation Commit

Implementation commit:

`ccd1ce35cfc78fac29602493c04c8817d0e8e01f`

Implementation parent / closed 1S.20 checkpoint:

`9a8310024e4447f928259681b3b11545bde47036`

Implementation subject:

`Add exact execution plan preparation`

## Exact Implementation Scope

Added:

- `scripts/utils/polygonV4ExecutionPlanPreparation.js`
- `test/polygonV4ExecutionPlanPreparation.test.js`

No existing production execution helper was modified.

No Solidity contract was modified.

No deployment address or environment configuration was modified.

## Purpose

The repository previously required exact fork-receipt gas evidence before
evidence-bound execution qualification, while the exact candidate, execution
legs, and encoded execution plan were constructed inside qualification.

That created an ordering problem for fresh execution evidence:

1. fresh gas evidence must bind to the exact candidate, execution legs, and
   execution-plan hash;
2. those exact identities therefore have to exist before controlled-fork gas
   measurement;
3. qualification must then validate the gas evidence against those same
   identities;
4. the qualified execution context must preserve those identities without
   rebuilding them.

1S.21 establishes the missing pure preparation boundary.

## Production Contract

`prepareExactExecutionPlan(...)` composes the existing deterministic
transformations:

`operationalResult`
→ protected-peak handoff
→ observed candidate
→ protected execution legs
→ encoded execution plan

Inputs include:

- `operationalResult`
- `startToken`
- `entryToken`
- `exitToken`
- `slippageBps`
- `deadline`
- `minimumNetProfitWei`

It returns:

- exact `handoff`
- exact `candidate`
- exact `executionLegs`
- exact `executionPlan`
- `deadline`
- exact `minimumNetProfitWei`

The returned object identities are preserved directly from the construction
dependencies.

## Architectural Invariant

The execution-critical ordering is now:

**build once → measure that exact plan → qualify that exact plan → preserve
that exact plan → simulate that exact plan**

A later boundary must not reconstruct a different candidate, leg set, or
execution plan after fork measurement.

## Ownership Boundary

1S.21 owns only pure execution-plan preparation.

It does NOT own:

- provider construction
- RPC access
- current policy acquisition
- gas-evidence acquisition
- controlled-fork reset
- controlled-fork execution
- qualification
- final execution simulation
- signer acquisition
- wallet/private-key handling
- live transaction construction
- live transaction broadcast

The focused static test enforces the absence of provider, RPC, gas-evidence,
qualification, fork, signer, transaction, and broadcast ownership from the
new production utility.

## Existing Components Reused

1S.21 reuses the existing established components:

- `selectProtectedPeakHandoff`
- `buildObservedV4Candidate`
- `buildV4ExecutionLegs`
- `encodeV4ExecutionPlan`

No alternate execution-route semantics were introduced.

## Validation Evidence

Focused 1S.21 tests:

- 4 / 4 passing

Affected execution-composition suite:

- 48 / 48 passing

Canonical Node suite:

- 568 / 568 passing

Canonical Hardhat suite:

- 29 / 29 passing

Canonical total at this boundary:

- 597 / 597 passing

Hardhat compiled 35 Solidity files successfully.

Only existing SPDX warnings were observed.

Hardhat-generated tracked artifact/cache churn was restored after testing.

Final focused recheck:

- 4 / 4 passing

Source syntax:

- production utility: PASS
- focused test: PASS

Exact final implementation scope before commit:

- two intended files only

Implementation commit scope:

- two intended files only

Post-implementation-commit worktree:

- clean

## Security / Execution State

During 1S.21 implementation and validation:

- no intentional Polygon RPC work was performed by the milestone gates
- no controlled-fork transaction was performed
- no live-network transaction was performed
- no signer was acquired
- no live signer was used
- no transaction was broadcast
- no push had been performed at implementation-commit time

Passing tests do NOT authorize live execution.

## Relationship to 1S.20

1S.20 remains closed.

Its historical controlled-fork fixture remains deterministic historical
evidence only.

It is NOT fresh current-market qualification evidence.

1S.21 does not reopen or alter 1S.20.

## Next Boundary

The next execution-critical boundary must use the prepared identities rather
than rebuilding them.

The required sequence is:

1. obtain a fresh protected operational result;
2. establish the authoritative current execution deadline/policy context
   required for the exact plan;
3. prepare the exact candidate, execution legs, and execution plan once;
4. perform controlled-fork measurement against that exact prepared plan;
5. produce fork-receipt gas evidence bound to:
   - the exact candidate block and amount,
   - the exact execution legs,
   - the exact execution-plan hash,
   - the exact executor context,
   - controlled fork provenance;
6. qualify those SAME prepared identities using current authoritative policy
   and the measured gas evidence;
7. preserve the successful qualified execution context without reconstruction;
8. perform final controlled simulation/preflight of that same preserved plan.

Before any later live-capable send boundary, independently verify at minimum:

- current Polygon chain identity
- current deployed executor/dependency identity
- fresh candidate/observation
- exact route and flashloan amount
- authoritative current policy snapshot
- current measured execution gas evidence
- current gas economics
- accepted slippage
- Aave premium
- minimum protected net profit
- deadline and freshness
- balances and allowances
- exact execution-plan binding
- final simulation/preflight
- signer/account identity
- exact transaction parameters

Signer acquisition and live broadcast remain separate authorization boundaries.

They are NOT authorized by this checkpoint.

## Recovery Rule

After any session/context loss:

1. trust Git history, this checkpoint, source, and tests over conversational
   recollection;
2. verify branch and `git status`;
3. verify implementation commit
   `ccd1ce35cfc78fac29602493c04c8817d0e8e01f`;
4. verify this checkpoint's commit once created;
5. do not treat historical 1S.20 fork evidence as current-market evidence;
6. do not rebuild an execution plan after gas measurement;
7. do not infer signer or broadcast authorization from passing tests.

No credentials, private keys, seed phrases, passwords, or API secrets belong
in this checkpoint.
