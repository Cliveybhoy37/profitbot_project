# Apollo Checkpoint — 1S.25 Protected Operational Prepared-Lifecycle Composition

## Milestone

1S.25 — Protected Operational Prepared-Lifecycle Composition

## Objective

Compose the protected operational timed-cadence path directly into the
prepared execution lifecycle while preserving exact evidence identity and
without acquiring execution, signer, transaction, broadcast, provider,
fork-control, reconstruction, or gas-production ownership.

The required order is:

protected operational timed cadence
→ exact operational result
→ prepared execution lifecycle

## Implementation

Source:

`scripts/utils/polygonV4ProtectedPreparedExecutionLifecycleComposition.js`

Test:

`test/polygonV4ProtectedPreparedExecutionLifecycleComposition.test.js`

Implementation commit:

`4c6c8e76a52913046b67087601023446aa7e3558`

Implementation parent:

`9eb4d4f479a6d44039682836e37a7617ff14e59c`

Implementation commit subject:

`Add protected operational prepared lifecycle composition`

Source SHA-256:

`c395f6aa9e528fa35c53c07db53a37177c8f2bc9349d4a7ceb58fbb63cac43f8`

Test SHA-256:

`be6a9e5913b53fc45f0c0b2f671b966ee7a6a749bf97edd66de361ca333692c2`

## Frozen composition contract

The 1S.25 composition:

1. validates both injected composition dependencies before cadence begins;
2. runs the protected provider timed cadence first;
3. preserves omission of optional `amounts`;
4. requires a returned operational result object;
5. passes the exact operational-result identity into the prepared lifecycle;
6. uses the same authoritative provider identity for cadence and lifecycle;
7. forwards lifecycle inputs unchanged;
8. returns the lifecycle result unchanged.

Frozen markers:

- `ORDER=PROTECTED_OPERATIONAL_THEN_PREPARED_LIFECYCLE`
- `SAME_AUTHORITATIVE_PROVIDER=REQUIRED`
- `EXACT_OPERATIONAL_RESULT_IDENTITY=REQUIRED`
- `OPTIONAL_AMOUNTS_OMISSION=PRESERVED`
- `LIFECYCLE_RESULT_RETURNED_UNCHANGED=REQUIRED`
- `FORK_INFRASTRUCTURE=INJECTED`
- `EXECUTOR=INJECTED`
- `EXECUTION_CALLBACKS=INJECTED`
- `LIVE_SIGNER_OWNERSHIP=FORBIDDEN`
- `TRANSACTION_OWNERSHIP=FORBIDDEN`
- `BROADCAST_OWNERSHIP=FORBIDDEN`

## Ownership boundary

1S.25 does not own:

- provider construction;
- live signer acquisition;
- fork reset/snapshot/revert;
- execution-plan reconstruction;
- historical gas evidence;
- gas-evidence production itself;
- direct `initiateFlashloan`;
- transaction submission or waiting;
- broadcast.

Fork provider, executor, fork provenance, and execution callbacks remain
injected into the downstream prepared lifecycle.

## Validation evidence

Focused 1S.25 tests:

`6/6 PASS`

Affected composition regression:

`41/41 PASS`

Canonical Node suite:

`587/587 PASS`

Canonical Hardhat suite:

`29/29 PASS`

Final implementation audit:

`PASS`

Exact staging gate:

`PASS`

Implementation commit gate:

`PASS`

Canonical Hardhat generated artifact/cache churn was restored after the
successful Hardhat run. No source/test change occurred during restoration.

## Controlled-fork evidence decision

No new 1S.25 controlled-fork run was required.

1S.24 already provides controlled downstream prepared-lifecycle integration
evidence. 1S.25 adds the upstream protected operational cadence → prepared
lifecycle composition seam, which is covered by the focused composition tests
and affected/canonical regression suites.

This decision does not authorize live execution.

## Safety boundary

At 1S.25 implementation closure:

- live-network transaction: NO
- live signer: NO
- live broadcast: NO
- new 1S.25 fork transaction: NO
- production execution authorization: NO

Passing tests and controlled-fork evidence do not authorize a real flashloan
or any live-network transaction.

Signer/broadcast authorization remains a separate explicit go/no-go boundary.

## Repository state at implementation closure

Branch:

`repair/simulation-safety`

Implementation HEAD:

`4c6c8e76a52913046b67087601023446aa7e3558`

Remote before checkpoint:

`9eb4d4f479a6d44039682836e37a7617ff14e59c`

Expected divergence before checkpoint commit:

`0 1`

The implementation worktree was clean before this checkpoint was created.

## Next exact steps

1. Verify this checkpoint is the only new worktree file.
2. Review checkpoint contents and confirm no sensitive material is present.
3. Stage exactly this checkpoint.
4. Commit it separately as the 1S.25 recovery checkpoint.
5. Verify the checkpoint commit parent is the 1S.25 implementation commit.
6. Only after local closure is verified, push the exact closed lineage.
7. Fetch and independently verify local/remote equality.

Do not treat repository closure as authorization for live execution.
