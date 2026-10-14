# APOLLO CHECKPOINT — 1S.20 PURE QUALIFIED EXECUTION FORK-SIMULATION BOUNDARY

## Status

1S.20 pure qualified-execution fork-simulation composition is implemented,
validated, and committed locally.

This checkpoint does NOT represent completion of the actual controlled-fork
integration transaction.

No live-network transaction has been performed.

Signer/broadcast authorization has NOT been granted.

## Lineage

Branch:

repair/simulation-safety

Corrected 1S.19 parent / pre-1S.20 HEAD:

ced71f686fe610bd79fed9ba43b7060b48987b89

1S.20 pure implementation commit:

edd998afb904201cf620cb984cf596377c08e327

Implementation subject:

Preserve qualified context for fork simulation

## Implementation Scope

Exactly two implementation files were added:

1. scripts/utils/polygonV4QualifiedExecutionForkSimulation.js
2. test/polygonV4QualifiedExecutionForkSimulation.test.js

Implementation commit scope:

2 files changed
509 insertions

No established production execution helper was modified.

No Solidity contract was modified.

## 1S.20 Pure Boundary

The production helper exports:

runQualifiedExecutionForkSimulation({
  qualifiedContext,
  forkProvenance,
  executeExactQualifiedPlanFn
})

The helper is intentionally a pure validation, preservation, and delegation
boundary between successful 1S.19 qualification context and a later
controlled-fork execution integration.

It does not itself own fork creation or execution.

## Required Successful Qualification

The helper requires a qualified execution context object.

It requires:

qualifiedContext.qualificationResult

and requires:

qualificationResult.qualified === true

An unqualified result cannot reach controlled-fork execution delegation.

Malformed qualification results fail closed.

## Preserved Execution Identity

The helper requires and preserves the 1S.19 execution context:

- qualificationResult
- candidate
- executionLegs
- executionPlan
- deadline
- policySnapshot
- gasEvidence

The exact candidate object is delegated.

The exact executionLegs array is delegated.

The exact executionPlan value is delegated.

The exact policySnapshot object is delegated.

The exact gasEvidence object is delegated.

The helper does not rebuild the candidate.

The helper does not rebuild execution legs.

The helper does not re-encode the execution plan.

The helper does not acquire another policy snapshot.

The helper does not acquire or manufacture replacement gas evidence.

## Controlled-Fork Provenance

The helper requires controlled-fork provenance with:

method === "hardhat_reset"

and a positive safe-integer:

sourceBlock

The fork source block must equal:

qualifiedContext.candidate.blockTag

A mismatched fork source block fails before execution delegation.

Recognition and validation of the string "hardhat_reset" does NOT mean this
pure helper performs hardhat_reset.

Actual fork reset ownership remains outside this helper.

## Delegation Boundary

The helper delegates to the injected:

executeExactQualifiedPlanFn

The injected function receives the exact preserved qualification/execution
objects plus the validated controlled-fork provenance.

The returned simulation result is preserved without reconstruction.

The helper returns:

{
  qualifiedContext,
  forkProvenance,
  simulationResult
}

with strict identity preservation for the supplied qualified context,
fork provenance, and returned simulation result.

## Explicit Non-Ownership

The 1S.20 pure helper does NOT own:

- provider construction
- provider RPC reset calls
- hardhat_reset execution
- signer acquisition
- wallet construction
- transaction submission
- transaction receipt waiting
- initiateFlashloan invocation
- execution-leg reconstruction
- execution-plan reconstruction
- fork-receipt gas-evidence production
- qualification policy acquisition
- policyGasUnits substitution
- live-network execution
- signer/broadcast authorization

## Static Safety Boundary

Focused tests statically reject ownership indicators including:

- JsonRpcProvider
- provider.send
- ethers.provider.send
- getSigners
- new Wallet
- sendTransaction
- initiateFlashloan
- .wait(
- buildV4ExecutionLegs
- encodeV4ExecutionPlan
- produceForkReceiptGasEvidence
- acquirePolicySnapshot
- policyGasUnits

The literal hardhat_reset provenance method is intentionally allowed because
the pure helper validates provenance but does not execute the reset.

## Focused Validation

Focused 1S.20 tests:

7/7 passing

Covered behavior:

1. exact successful qualified context delegation
2. rejection of unqualified context before execution
3. rejection of malformed preserved execution identity
4. rejection of uncontrolled or mismatched fork provenance
5. unchanged propagation of controlled-fork simulation failure
6. rejection of invalid execution dependency
7. static non-ownership of provider/fork/signer/transaction/reconstruction

## Affected Qualification / Simulation Chain

Affected chain:

76/76 passing

This covered the execution-policy qualification, exact fork-receipt evidence,
gas-evidence qualification binding, qualification execution context,
operational composition, runtime policy/composition, corrected 1S.19
preservation boundary, and new 1S.20 pure boundary.

## Canonical Validation

Canonical Node:

564/564 passing

Canonical Hardhat:

29/29 passing

Canonical aggregate:

593/593 passing

The focused and affected runs overlap the canonical Node suite and therefore
must not be added to the canonical aggregate.

Canonical Hardhat compiled 35 Solidity files successfully.

Only pre-existing SPDX warnings were observed.

Hardhat-generated tracked artifact/cache churn was restored to HEAD after
testing.

## Closure Checks

Focused RC:

0

Affected RC:

0

Canonical Node RC:

0

Canonical Hardhat RC:

0

Static safety RC:

0

Diff check RC:

0

Authoritative staged diff check before implementation commit:

0

Implementation commit parent was verified as:

ced71f686fe610bd79fed9ba43b7060b48987b89

Implementation commit was verified as:

edd998afb904201cf620cb984cf596377c08e327

Implementation commit contained exactly the two intended 1S.20 files.

Worktree was clean after the implementation commit.

## Important Semantic Separation

The final controlled-fork simulation is semantically separate from the
pre-qualification FORK_RECEIPT gas evidence.

The existing fork-receipt gas-evidence producer remains evidence-production
infrastructure and is not reclassified as the final-simulation abstraction.

1S.20 does not reuse legacy scanner-era polygonFlashloanSimulation.js as the
new protected execution seam.

The qualified execution identity is preserved rather than reconstructed.

## Existing Controlled-Fork Execution Semantics

Existing repository fork tests establish that the controlled-fork integration
layer can execute the encoded plan through PolygonV4CandidateExecutor and
observe:

- executed flashloan amount
- premium
- route output
- debt
- profit before repayment
- retained loan-token profit
- receipt gasUsed
- allowance cleanup

Existing executor validation also enforces:

- execution deadline
- nonzero minimum profit
- realized profit >= plan minimum

These existing semantics inform the next integration layer but are not owned
by the pure 1S.20 helper.

## Current Boundary

The following has NOT yet been implemented as part of 1S.20:

- actual hardhat_reset ownership for final simulation
- deployment of the fork executor for the final simulation
- local controlled-fork signer mechanics
- actual initiateFlashloan call for final simulation
- receipt/accounting result contract for the final simulation
- final integration test connecting an exact successful qualified envelope to
  an actual controlled-fork execution

No controlled-fork transaction was performed during the pure 1S.20 closure.

No live-network transaction was performed.

## Next Step

Next work is the separate controlled-fork integration layer/test.

That integration must:

1. own the actual hardhat_reset
2. fork from the exact qualified candidate.blockTag
3. consume the exact successful 1S.19/1S.20 preserved execution identity
4. avoid rebuilding execution legs or executionPlan
5. execute only on the local controlled fork
6. verify successful receipt
7. capture executor accounting evidence
8. verify amount/debt/profit/retained-funds relationships
9. verify relevant allowance cleanup
10. preserve simulation evidence separately from qualification gas evidence

The integration must not imply live-network broadcast authorization.

A successful local fork transaction is not authorization to sign or broadcast
a live Polygon transaction.

## Safety Boundary

Current status:

PURE_1S20_IMPLEMENTED=YES
PURE_1S20_VALIDATED=YES
PURE_1S20_IMPLEMENTATION_COMMITTED=YES
CONTROLLED_FORK_INTEGRATION_STARTED=NO
CONTROLLED_FORK_TRANSACTION_PERFORMED=NO
LIVE_NETWORK_TRANSACTION_PERFORMED=NO
SIGNER_BROADCAST_AUTHORIZED=NO
PUSH_PERFORMED=NO
