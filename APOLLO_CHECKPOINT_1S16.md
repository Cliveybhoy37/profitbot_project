# Apollo Checkpoint — 1S.16

## Milestone
1S.16 — Immutable Historical Execution-Gas Evidence Artifact

## Implementation
- Commit: 00ea0e5364cbeff9f6298cf00c64e1c6a19bb326
- Subject: Persist immutable historical execution gas evidence
- Production: scripts/utils/polygonV4HistoricalExecutionGasEvidence.js
- Tests: test/polygonV4HistoricalExecutionGasEvidence.test.js

## Purpose
- Persist the already-established 1S.8 controlled historical FORK_RECEIPT gas evidence as immutable production-readable evidence.
- Loading the artifact performs no provider, RPC, fork, signer, transaction, flashloan, or broadcast work.
- Existing fork-receipt validation remains authoritative.
- Historical binding additionally requires the exact canonical executor identity.
- This artifact is evidence, not general runtime gas policy.

## Historical Evidence Identity
- observationBlock: 94709817
- measurementBlock: 94709817
- provenance: FORK_RECEIPT
- gasUnits: 652106
- executionDeadline: 1790770167
- minimumProfit: 5000000000000000
- executionPlanHash: 0xf3dddb908db797d2732935ea25dfb48215c98ef85587ac012c2ba1093b94e009
- executorCodeHash: 0x347dca910e2d4b7dd6b4ba19151fc2cd28e33c268cbb38511169a0b4a753facc

## Safety Boundaries
- 652106 is measured historical FORK_RECEIPT gas evidence.
- 700000 remains a separate conservative policy estimate and is not contained in the historical artifact.
- Evidence is bound to exact candidate amount/block, protected execution legs, encoded execution plan, and canonical executor context.
- No live Polygon transaction occurred during 1S.16.
- No signer or broadcast was used.
- HP/Bugs observer/scanner was untouched.
- Passing tests does not authorize live execution.

## Validation
- Focused 1S.16: 9/9 PASS
- Affected composition: 66/66 PASS
- Canonical Node: 540/540 PASS
- Canonical Hardhat: 29/29 PASS
- Canonical total: 569/569 PASS
- Final static/worktree boundary: PASS

## Current State
- Branch: repair/simulation-safety
- 1S.16 implementation commit: 00ea0e5364cbeff9f6298cf00c64e1c6a19bb326
- Checkpoint commit: pending
- Remote push: pending

## Next Step
Commit this checkpoint separately, then perform push/fetch/remote verification before declaring 1S.16 remotely closed.
