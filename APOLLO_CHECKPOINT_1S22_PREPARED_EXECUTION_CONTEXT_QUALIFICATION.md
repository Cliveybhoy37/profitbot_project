# Apollo Checkpoint — 1S.22 Prepared Execution Context Qualification

## Status

1S.22 implementation is complete locally.

Implementation commit:

`f4d7f52b87fb9a5c86cdc0a8a5e7127f035ff12f`

Implementation subject:

`Add prepared execution context qualification`

Implementation parent:

`3a495d2aaf49ace2bf2d37d623cf44b18c95b948`

Branch:

`repair/simulation-safety`

No remote push had been performed when this checkpoint was created.

No live-network transaction was performed.

No signer was acquired.

Live broadcast is not authorized by this milestone.

---

## Objective

1S.22 closes the missing qualification seam between:

1. exact execution-plan preparation,
2. exact controlled-fork gas measurement,
3. current economic/freshness qualification, and
4. preservation of the same execution identity for final simulation.

The governing invariant is:

**build once → measure that exact plan → qualify that exact plan → preserve that exact plan**

1S.22 does not rebuild the execution identity after gas measurement.

---

## Implementation

New production utility:

`scripts/utils/polygonV4PreparedExecutionContextQualification.js`

Export:

`qualifyPreparedExecutionContext`

New focused test:

`test/polygonV4PreparedExecutionContextQualification.test.js`

Implementation commit scope:

- `scripts/utils/polygonV4PreparedExecutionContextQualification.js`
- `test/polygonV4PreparedExecutionContextQualification.test.js`

No other implementation files were changed.

---

## Authoritative Prepared Context

1S.22 consumes the prepared execution context produced by 1S.21.

The authoritative prepared identity contains:

- `handoff`
- `candidate`
- `executionLegs`
- `executionPlan`
- `deadline`
- `minimumNetProfitWei`

1S.22 does not independently select a handoff.

1S.22 does not independently build a candidate.

1S.22 does not independently build execution legs.

1S.22 does not independently encode an execution plan.

1S.22 does not accept an independent deadline.

1S.22 does not accept an independent minimum-net-profit value.

The prepared context remains authoritative for those identities.

---

## Gas Evidence Binding

1S.22 validates supplied gas evidence with:

`validateForkReceiptGasEvidence`

The validator receives the exact prepared:

- `candidate`
- `executionLegs`
- `executionPlan`

and the supplied:

- `gasEvidence`

The validated measured:

`gasUnits`

is used as the preflight estimated gas value.

The conservative runtime policy gas value is not substituted for measured execution gas.

Gas-evidence validation failure is fail-closed and is propagated before preflight.

---

## Qualification Policy

1S.22 requires an explicit authoritative `policySnapshot`.

The required policy fields are:

- positive safe-integer `currentBlock`
- positive BigNumber `gasPriceWei`
- valid `premiumBps`

1S.22 performs no policy acquisition.

It performs no provider construction.

It performs no RPC reads.

Current qualification economics are evaluated using the supplied policy snapshot.

---

## Economic and Freshness Preflight

1S.22 delegates the exact prepared candidate and execution legs to:

`preflightObservedV4Candidate`

The preflight receives:

- prepared `candidate`
- prepared `executionLegs`
- `requestedAmount = candidate.amountIn`
- `currentBlock = policySnapshot.currentBlock`
- caller policy `maxAgeBlocks`
- caller policy `slippageBps`
- caller policy `maxSlippageBps`
- `premiumBps = policySnapshot.premiumBps`
- `estimatedGas = validatedGasEvidence.gasUnits`
- `gasPriceWei = policySnapshot.gasPriceWei`
- caller `safetyReserveWei`
- `minimumNetProfitWei = preparedExecutionContext.minimumNetProfitWei`

Existing preflight therefore retains ownership of:

- observation freshness
- requested flashloan amount identity
- slippage limits
- exact protected execution minimum outputs
- flashloan premium economics
- measured gas cost
- safety reserve
- expected net profitability
- protected/worst-case profitability
- configured minimum net profit

1S.22 does not weaken or duplicate those economic rules.

---

## Qualification Semantics

Successful preflight creates a successful qualification result and preserves the exact prepared execution identity.

Successful preserved context contains:

- `qualificationResult`
- `handoff`
- `candidate`
- `executionLegs`
- `executionPlan`
- `deadline`
- `minimumNetProfitWei`
- `policySnapshot`
- `gasEvidence`

Preflight rejection returns an unqualified result with:

- `qualified: false`
- `stage: "PREFLIGHT"`
- the preserved prepared identity
- the authoritative policy snapshot
- supplied gas evidence
- the preflight rejection reason

A preflight rejection is not promoted into a qualified execution context.

Malformed authoritative inputs and gas-evidence validation failures remain fail-closed exceptions.

---

## Ownership Exclusions

1S.22 owns none of the following:

- protected handoff selection
- observed candidate construction
- execution-leg construction
- execution-plan encoding
- provider construction
- RPC acquisition
- policy acquisition
- historical evidence acquisition
- fork reset
- fork transaction execution
- signer acquisition
- transaction submission
- flashloan initiation
- receipt waiting
- live broadcast

No changes were made to:

- `ProfitBot.sol`
- `ThreeLegExecution`
- frontend or MetaMask integration
- deployment addresses
- `.env`
- HP/Bugs observer path

---

## Focused Verification

Focused 1S.22 test:

`test/polygonV4PreparedExecutionContextQualification.test.js`

Result:

**6 / 6 passed**

The focused tests verify:

1. successful qualification preserves the exact prepared execution identity;
2. preflight rejection is not promoted;
3. exact gas-evidence validation failure propagates before preflight;
4. invalid authoritative policy input fails before evidence validation;
5. production source owns no reconstruction/provider/RPC/fork/signer/transaction/broadcast/historical-evidence behavior;
6. no independent deadline or minimum-profit inputs are accepted.

---

## Affected Composition Verification

Affected composition suite result:

**71 / 71 passed**

The affected suite covered the relevant execution-plan preparation, preflight, execution gas evidence, fork-receipt gas evidence, fork evidence production, gas-evidence qualification, preserved qualification context, and qualified fork-simulation surfaces.

Focused recheck after affected composition:

**6 / 6 passed**

Static ownership:

**PASS**

Exact worktree scope:

**PASS**

---

## Full Canonical Verification

Canonical Node suite:

**574 / 574 passed**

Canonical Hardhat suite:

**29 / 29 passed**

Canonical total:

**603 tests passed**

Hardhat compiled 35 Solidity files successfully.

The SPDX messages emitted during compilation were warnings only.

Tracked Hardhat-generated `artifacts/` and `cache/` churn was restored after the Hardhat run.

After restoration, the only implementation changes were the exact two 1S.22 files.

Final focused recheck:

**6 / 6 passed**

Final syntax checks:

**PASS**

Final static ownership:

**PASS**

Final exact scope:

**PASS**

---

## Staging and Commit Closure

Exact staging gate:

**PASS**

Staged files were exactly:

- `scripts/utils/polygonV4PreparedExecutionContextQualification.js`
- `test/polygonV4PreparedExecutionContextQualification.test.js`

Staged diff:

**690 insertions across 2 new files**

Unstaged changes:

**NONE**

Forbidden staged paths:

**NONE**

Implementation commit:

`f4d7f52b87fb9a5c86cdc0a8a5e7127f035ff12f`

Implementation parent:

`3a495d2aaf49ace2bf2d37d623cf44b18c95b948`

Commit identity:

**PASS**

Worktree after implementation commit:

**CLEAN**

---

## Closed Execution Chain

The intended identity-preserving chain is now:

**fresh protected observation**

→ **1S.21 prepare exact execution identity**

→ exact `{candidate, executionLegs, executionPlan, deadline, minimumNetProfitWei}`

→ **controlled-fork receipt measurement of that exact plan**

→ exact gas evidence bound to candidate + legs + execution-plan hash + executor context

→ **1S.22 qualify that exact prepared identity**

→ current freshness + premium + gas price + slippage + safety reserve + minimum-profit preflight

→ preserved qualified execution context

→ **1S.20 final controlled-fork simulation consumes the preserved plan**

No execution identity needs to be rebuilt between preparation, measurement, qualification, and final simulation.

---

## Important Safety Boundary

Passing these tests does not authorize a real transaction.

Before any live flashloan-capable send, independently verify at minimum:

- Polygon chain identity
- deployed contract identity and bytecode
- dependency addresses
- fresh candidate and observation
- exact route identity
- exact loan amount
- current policy snapshot
- current gas evidence
- current premium economics
- slippage limits
- safety reserve
- minimum protected net profit
- deadline and freshness
- balances
- allowances
- exact execution-plan binding
- final simulation/preflight
- signer/account identity
- transaction parameters

Signer acquisition and live broadcast remain separate authorization boundaries.

---

## Recovery Instructions

If chat context is lost:

1. `cd /workspaces/profitbot_project`
2. `git status --short`
3. `git log --oneline -5`
4. verify branch `repair/simulation-safety`
5. verify implementation commit `f4d7f52b87fb9a5c86cdc0a8a5e7127f035ff12f`
6. read this checkpoint
7. inspect the 1S.21 checkpoint if exact-plan preparation context is needed
8. inspect the 1S.20 controlled-fork checkpoint if final simulation context is needed

Never place private keys, seed phrases, passwords, RPC secrets, API secrets, or other credentials in checkpoints or chat.

---

## Exact Next Boundary

After committing this checkpoint separately:

1. verify checkpoint commit identity and parent;
2. verify worktree clean;
3. verify local lineage contains exactly the implementation commit followed by the checkpoint commit;
4. fetch the remote branch before push;
5. verify the expected remote base;
6. verify the exact outgoing commit set;
7. push only the reviewed local commits;
8. fetch again;
9. verify local and remote tips are identical;
10. verify zero ahead / zero behind.

Remote closure does not authorize live execution.

The next execution-development milestone must preserve the build-once identity chain and must not reopen 1S.21 or 1S.22 without new contradictory source evidence.
