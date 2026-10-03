# APOLLO CHECKPOINT — 1S.13

## Status

Milestone 1S.13 implementation is complete and locally committed.
Remote push has not yet been performed at the time this checkpoint is created.

Milestone: Execution Policy Snapshot Binding.

Implementation commit:
`bbcf9b1e13a4dcb934da1cfa09f2defa11985599`

Implementation subject:
`Forward authoritative policy snapshot through execution plan qualification`

Implementation parent / 1S.12 checkpoint:
`17f4141cf0c2c1241fc772caa4facebdcce7e9f4`

Branch:
`repair/simulation-safety`

## Objective

Bind an already-authoritative qualification policy snapshot through the 1S.10 execution-policy-plan qualification seam into the existing 1S.9 gas-evidence qualification seam.

Required invariant:

`supplied policySnapshot === exact policySnapshot delegated from 1S.10 to 1S.9`

Existing execution-plan invariant remains unchanged:

`executionPlan.deadline === supplied deadline`

## Production change

Changed only:

`scripts/utils/polygonV4ExecutionPolicyPlanQualification.js`

The 1S.10 function now accepts:

`policySnapshot = null`

and forwards that exact value into:

`qualifyGasEvidenceProtectedPeakHandoffFn(...)`

No policy acquisition was added.
No qualification-context acquisition was added.
No deadline derivation was added.
No policy snapshot reconstruction or cloning was added.

This is an additive forwarding seam only.

## Test change

Changed only:

`test/polygonV4ExecutionPolicyPlanQualification.test.js`

Added one focused regression test:

`forwards supplied authoritative policy snapshot unchanged`

The test uses strict object identity to prove that the supplied snapshot is the exact object delegated downstream.

## Authoritative RED

Before production modification:

- HEAD remained the 1S.12 checkpoint.
- Production was byte-identical to its baseline.
- Only the focused test file was modified.
- Existing six focused tests passed.
- New seventh test failed.
- Failure was exactly:
  `authoritative policy snapshot must be forwarded unchanged`
- Result: 6 pass, 1 fail.
- No RPC, staging, commit, or push occurred.

This proved that current 1S.10 dropped the supplied snapshot rather than forwarding it.

## GREEN

Minimal production change:

1. Add optional `policySnapshot = null` input.
2. Pass `policySnapshot` unchanged to the 1S.9 qualification dependency.

Focused result after the change:

- 7 tests
- 7 pass
- 0 fail

## Validation

Focused 1S.10 suite:

- 7 / 7 PASS

Affected composition suite:

- 35 / 35 PASS

Canonical Node suite:

- 518 / 518 PASS

Canonical Hardhat suite:

- 29 / 29 PASS

Canonical total:

- 547 / 547 PASS

Static and worktree boundaries:

- PASS

Hardhat generated tracked artifact/cache churn during the canonical Hardhat run.
Only `artifacts/` and `cache/` generated churn was restored afterward.
No production source or test changed during cleanup.
Hardhat was therefore not rerun after cleanup.

## Scope boundaries preserved

No changes were made to:

- `scripts/research/runPolygonV4LiveQualification.js`
- `scripts/research/runPolygonV4LiveCandidateSet.js`
- `scripts/utils/polygonV4QualificationExecutionContext.js` (1S.11)
- `scripts/utils/polygonV4GasEvidenceProtectedPeakQualification.js` (1S.12 / 1S.9 seam)
- `ProfitBot.sol`
- ThreeLegExecution
- frontend / MetaMask integration
- deployment addresses
- `.env`
- HP/Bugs environment

No live signer or transaction broadcast was used.
No RPC was required for this milestone.
No fork integration was rerun.
No policy threshold was weakened.
No gas policy was changed.

## Architecture after 1S.13

1S.11 can produce an authoritative qualification execution context containing:

- `policySnapshot`
- `policyBlockTimestamp`
- `deadline` derived from the exact `policySnapshot.currentBlock`

1S.12 allows 1S.9 to consume a supplied authoritative policy snapshot without reacquiring it.

1S.13 now allows 1S.10 to forward a supplied authoritative policy snapshot unchanged into 1S.9 while continuing to encode the supplied deadline into the exact execution plan.

Therefore the lower-level seams required for one authoritative snapshot/deadline context now exist without yet changing live ownership.

## Important non-change

1S.13 does NOT make 1S.10 call `acquireQualificationExecutionContext()`.

Context acquisition remains outside 1S.10.

This preserves separation between:

- context ownership/acquisition;
- execution-plan construction;
- gas-evidence validation;
- protected qualification.

## Gas evidence distinction

Historical exact fork receipt measurement remains:

- measured gas: `652106`
- source block: `94709817`

The conservative operational policy gas value remains `700000`.

Do not represent `700000` as measured gas.
Do not replace conservative policy with the historical measurement without a separate policy decision.

## Remaining integration seam

The next architectural question is above 1S.10:

Can the appropriate composition/live ownership layer safely acquire one 1S.11 qualification execution context and pass its exact `deadline` and exact `policySnapshot` through 1S.10, while preserving existing candidate-set shared-snapshot semantics and all fail-closed policy behavior?

Do not automatically change live qualification or candidate-set ownership merely because the lower-level seams now exist.

Any next milestone must reconstruct and prove the current ownership boundary first.

## Recovery instructions

After context loss, reconstruct from durable repository state rather than chat memory.

Start with checkpoints and Git history from 23 September through current HEAD.

Useful commands:

`git status --short`

`git log --oneline --decorate -12`

`git show --stat --oneline bbcf9b1e13a4dcb934da1cfa09f2defa11985599`

Then inspect the current 1S.11, 1S.12, and 1S.13 source/tests before deciding the next seam.

Pre-23-September material is not architectural authority unless the current repository/checkpoints explicitly reference it for provenance.

## Persistence and secrets

Git-tracked files and committed history persist.
Terminal processes, unsaved buffers, dev servers, shell state, and chat context do not have the same persistence guarantees.

Never place private keys, seed phrases, passwords, RPC credentials, API secrets, or other credentials in this checkpoint or chat.
