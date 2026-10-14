# Apollo Recovery Checkpoint — 1S.7

## Status

1S.7 implementation is complete, tested, committed, pushed, and remotely verified.

Implementation commit: 78bbd4a909e505facba266ada1cc0373d63a7acd
Parent checkpoint: e745ead3bea83817ecd0c9f9d822a565c9119c48
Branch: repair/simulation-safety

## Milestone

1S.7 — Exact Protected Execution Gas Evidence Binding

1S.7 validates externally supplied gas evidence against the exact protected execution identity.
It does not measure gas and does not authorize execution or broadcast.

## Implementation

- scripts/utils/polygonV4ExecutionGasEvidence.js
- test/polygonV4ExecutionGasEvidence.test.js

No existing production file was modified by the implementation commit.

## Exact identity binding

Validation binds observation block, loan token, loan amount, and exactly three execution legs.
Each leg binds venue, tokenIn, tokenOut, protected minAmountOut, and venueData.
Gas units must be positive and measurement provenance must be explicit.
Measurement block must be positive and measurement source must be nonempty.
Mismatches fail closed.

## Provenance

The only accepted gas evidence method is FORK_RECEIPT.
PROVIDER_ESTIMATE_GAS is deliberately not accepted.
No faithful candidate-executor estimateGas producer has yet been established.

## Address source

No hardcoded token addresses exist in the new 1S.7 files.
Tests import WPOL, DAI, and APEPE from runPolygonV4LiveQualification.js.
Do not substitute the older polygonScannerTokens.js registry for this V4 route.
Do not duplicate canonical/current addresses in new code or tests.

## Gas policy

The production utility contains no hardcoded gas estimate.
700000 remains a conservative qualification policy estimate elsewhere, not current measured gas.
650723 appears only as supplied test fixture data and is not manufactured by production code.

## Validation results

- Focused 1S.3 through 1S.7: 45/45
- Canonical Node tests: 479/479
- Canonical Hardhat tests: 29/29
- Total canonical regression: 508/508
- Final diff check: clean
- Final worktree before implementation commit/push: clean

## Safety boundaries

No live RPC was performed.
No estimateGas operation was performed.
No fork was started.
No signer was used.
No live transaction or broadcast was performed.
HP/Bugs was not modified.
ProfitBot.sol was not modified.
ThreeLegExecution was not modified.
Production execution helpers were not modified.
Deployment addresses were not modified.
Economic qualification policy was not weakened.

## Unresolved boundary

1S.7 validates exact gas evidence but does not produce it.
The next safe development task is a controlled gas-evidence producer for the exact protected candidate and PolygonV4CandidateExecutor architecture.
FORK_RECEIPT is currently the only approved evidence provenance.
Do not substitute conservative policy gas, unrelated historical gas, generic provider estimation, or partially matching route evidence.

Executor context must be reviewed when designing the measurement producer.
Canonical repository configuration/contracts must be reused; do not hardcode executor dependency addresses.

Live signer, transaction, and broadcast authorization remain separate future boundaries.

## Recovery

After interruption run:

cd /workspaces/profitbot_project
git status
git log --oneline -8
git rev-parse HEAD
git rev-parse origin/repair/simulation-safety

Expected implementation commit before checkpoint commit:
78bbd4a909e505facba266ada1cc0373d63a7acd

Persisted repository files and git history are authoritative.
Do not assume terminal processes, environment variables, editor buffers, RPC sessions, or chat context survived.
Never store credentials, private keys, seed phrases, passwords, or API secrets in this checkpoint.
