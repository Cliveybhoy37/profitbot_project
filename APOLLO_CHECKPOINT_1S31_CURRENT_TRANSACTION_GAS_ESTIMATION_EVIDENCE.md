# Apollo Checkpoint — 1S.31 Current Transaction Gas Estimation Evidence

## Status

1S.31 implementation and validation are complete locally.

This checkpoint does **not** authorize live execution, signer use,
transaction signing, transaction sending, or broadcast.

It also does **not** select or authorize a transaction `gasLimit`.

## Boundary

1S.31 is the **Current Transaction Gas Estimation Evidence** boundary.

It consumes the exact preserved 1S.30 current transaction parameter
evidence plus an injected provider.

It performs one current gas-estimation operation for the exact preserved
unsigned transaction intent:

- `from`
- `to`
- `data`
- `value`

The operation is:

`provider.estimateGas({ from, to, data, value })`

The returned estimate must be a positive BigNumber.

## Exact Upstream Requirements

1S.31 requires:

- 1S.30 `currentTransactionParametersReady === true`
- 1S.30 live execution authorization exactly false
- 1S.30 signer authorization exactly false
- 1S.30 broadcast authorization exactly false
- Polygon chain ID exactly `137`
- pending nonce is a non-negative safe integer
- positive `maxFeePerGas`
- positive `maxPriorityFeePerGas`
- `maxFeePerGas >= maxPriorityFeePerGas`

It also validates preserved upstream evidence through:

- 1S.29 unsigned exact transaction intent evidence
- 1S.28 account/caller identity evidence
- 1S.27 current-state execution preflight evidence

Nested readiness must remain true and nested authorization must remain
exactly false.

## Preserved Identity Graph

1S.31 preserves rather than reconstructs upstream evidence.

The exact preserved transaction-intent object must remain the same object
as the 1S.29 transaction intent.

The exact candidate, execution-leg array, and execution-plan identities
must remain consistent through the preserved 1S.29 -> 1S.28 -> 1S.27
graph.

The transaction intent `from` remains bound to the preserved caller.

The transaction intent `to` remains bound to the preserved executor.

These identity checks establish structural/reference consistency. They do
not claim cryptographic constructor provenance.

## Gas Estimation Request

The estimation request contains only:

- `from`
- `to`
- `data`
- `value`

1S.31 does not add these fields to the estimation request:

- `gasLimit`
- `gasPrice`
- transaction type
- chain ID
- nonce
- `maxFeePerGas`
- `maxPriorityFeePerGas`

Nonce and EIP-1559 fee evidence remain preserved upstream transaction
parameter evidence for later separately scoped transaction-envelope work.

## Output

Successful evidence contains:

- exact 1S.30 current transaction parameter evidence
- exact 1S.29 unsigned transaction intent evidence
- exact preserved transaction intent
- positive `estimatedGasUnits`
- `currentTransactionGasEstimationReady: true`
- `liveExecutionAuthorized: false`
- `signerAuthorized: false`
- `broadcastAuthorized: false`

The output is frozen.

## Explicit Non-Ownership

1S.31 does not own or perform:

- candidate discovery
- quote acquisition
- route reconstruction
- execution-leg reconstruction
- execution-plan reconstruction
- qualification
- policy reconstruction
- fork control
- current network acquisition
- pending nonce acquisition
- fee acquisition
- transaction `gasLimit` selection
- gas-estimate safety-margin policy
- signer acquisition
- wallet construction
- private-key handling
- transaction population
- transaction signing
- transaction sending
- receipt waiting
- broadcast authorization

## Gas Boundary

`estimatedGasUnits` is raw current gas-estimation evidence.

It is **not** automatically a transaction `gasLimit`.

The conservative qualification-policy value `700000` remains policy gas
and is not a transaction gas limit.

The historical controlled-fork receipt value `652106` remains historical
measured evidence and is not automatically a current transaction gas
limit.

A later separately audited boundary must decide whether and how a raw
current gas estimate is transformed into a transaction gas limit,
including any justified safety margin.

## Test Development

The initial 1S.31 test boundary was created before the implementation and
failed because the production module did not yet exist.

The initial minimal implementation then passed 22 focused tests.

A preserved-graph hardening audit identified that the initial 1S.31
validator did not independently descend through the full preserved
1S.29 -> 1S.28 -> 1S.27 identity graph.

Six hardening tests were added first. All original 22 tests remained
green and exactly those six new tests failed because malformed nested
evidence was accepted.

The implementation was then minimally hardened.

Final focused result:

- 28 passed
- 0 failed

## Affected Regression Validation

The affected 1S.27 through 1S.31 regression set passed:

- 123 passed
- 0 failed

## Canonical Validation

Canonical Node validation:

- 721 passed
- 0 failed

Canonical Hardhat validation:

- 29 passed
- 0 failed

Hardhat-generated tracked artifact/cache churn was restored after the
canonical Hardhat run.

No source or test bytes changed during canonical validation.

## File Integrity

Source:

`scripts/utils/polygonV4CurrentTransactionGasEstimationEvidence.js`

SHA-256:

`b74c84285d7f248bb376cc135718c7e46ad36be945cc6858c761f5ed18fe71ff`

Test:

`test/polygonV4CurrentTransactionGasEstimationEvidence.test.js`

SHA-256:

`102e386b72800d7ff95f2d3a337602393abde3c8d56c159abed79aab2a203e47`

## Git Lineage

1S.30 checkpoint/base:

`e89232fb9050af30c11a82b1ce46a95e8514baf0`

Subject:

`Add 1S.30 recovery checkpoint`

1S.31 implementation:

`6f2649d54731803f4369c16a7ab523b0f19ca28b`

Subject:

`Add current transaction gas estimation evidence`

The implementation commit contains exactly:

- `scripts/utils/polygonV4CurrentTransactionGasEstimationEvidence.js`
- `test/polygonV4CurrentTransactionGasEstimationEvidence.test.js`

## Provider / Execution State

Unit and regression validation used provider test doubles for the 1S.31
gas-estimation operation.

No live Polygon RPC gas-estimation operation was required for repository
validation of this boundary.

No live transaction was constructed, signed, sent, or broadcast.

## Authorization State

`LIVE_EXECUTION_AUTHORIZED=NO`

`SIGNER_AUTHORIZED=NO`

`TRANSACTION_AUTHORIZED=NO`

`BROADCAST_AUTHORIZED=NO`

Passing 1S.31 tests, canonical tests, and repository closure must not be
interpreted as authorization for a real flashloan transaction.

## Deferred Boundaries

Still separately deferred:

- current live/read-only acquisition of gas-estimation evidence when
  explicitly required
- gas-estimate safety-margin policy
- exact transaction gas-limit evidence/selection
- complete unsigned transaction envelope
- final immediately-pre-send validation/simulation
- signer acquisition
- signing authorization
- transaction sending
- explicit broadcast go/no-go

Signer and broadcast remain separately authorized boundaries.

## Recovery Rule

On session recovery, verify:

1. branch is `repair/simulation-safety`;
2. implementation commit is present in the exact lineage;
3. source and test hashes match this checkpoint;
4. checkpoint commit, once created, directly follows the implementation
   commit;
5. worktree is clean;
6. local/remote divergence is checked before any push;
7. no live execution, signer, transaction, or broadcast authorization is
   inferred from this checkpoint.
