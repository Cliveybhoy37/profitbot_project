# Apollo Checkpoint — 1S.30 Current Transaction Parameter Evidence

## Status

1S.30 implementation is complete locally and validated.

This checkpoint does **not** authorize live execution, signer use,
transaction signing, transaction sending, or broadcast.

## Boundary

1S.30 owns **Current Transaction Parameter Evidence Acquisition**.

It consumes the exact preserved 1S.29 unsigned transaction intent evidence
and an injected provider.

It acquires only:

- current network identity via `provider.getNetwork()`
- pending nonce for the exact preserved transaction caller via
  `provider.getTransactionCount(transactionIntent.from, "pending")`
- current EIP-1559 fee evidence via `provider.getFeeData()`

It requires Polygon chain ID `137`.

It requires usable positive `maxFeePerGas` and
`maxPriorityFeePerGas`, with:

`maxFeePerGas >= maxPriorityFeePerGas`

A nonce must be a non-negative safe integer. Nonce zero is valid.

## Preserved upstream evidence

1S.30 requires 1S.29:

- `unsignedTransactionIntentReady === true`
- `liveExecutionAuthorized === false`
- `signerAuthorized === false`
- `broadcastAuthorized === false`

It also requires the preserved upstream account/caller identity evidence:

- `accountCallerIdentityReady === true`
- all nested authorization flags remain exactly false

And preserved current-state preflight evidence:

- `currentStatePreflightReady === true`
- all nested authorization flags remain exactly false

1S.30 preserves, rather than reconstructs, the upstream transaction intent.

The candidate, execution legs, and execution plan must retain exact identity
through the preserved 1S.29 -> 1S.28 -> 1S.27 evidence graph.

The transaction intent caller must remain bound to the preserved caller
identity.

The transaction intent target must remain bound to the preserved executor
identity.

These checks validate the preserved identity relationships of the supplied
upstream evidence graph. They do not constitute cryptographic provenance of
an arbitrary JavaScript object and do not duplicate the full validation
owned by earlier boundaries.

## Output

Successful acquisition returns frozen evidence containing:

- exact `unsignedTransactionIntentEvidence`
- exact preserved `transactionIntent`
- `chainId = 137`
- pending `nonce`
- `maxFeePerGas`
- `maxPriorityFeePerGas`
- `currentTransactionParametersReady = true`
- `liveExecutionAuthorized = false`
- `signerAuthorized = false`
- `broadcastAuthorized = false`

## Explicit non-ownership

1S.30 does **not** own:

- gas-limit acquisition
- `estimateGas`
- policy gas substitution
- historical measured gas substitution
- candidate reconstruction
- route reconstruction
- execution-leg reconstruction
- execution-plan reconstruction
- ABI reconstruction
- qualification reruns
- preflight reruns
- signer acquisition
- wallet construction
- private keys or secrets
- transaction signing
- transaction sending
- receipt waiting
- broadcast

In particular:

- conservative policy gas `700000` is not a transaction gas limit
- historical measured gas `652106` is not automatically a transaction gas limit
- gas-limit ownership remains deferred to a later separately audited boundary

## Provider-read ownership

The production boundary owns exactly these provider reads:

1. `provider.getNetwork()`
2. `provider.getTransactionCount(transactionIntent.from, "pending")`
3. `provider.getFeeData()`

No live transaction is constructed or submitted by this boundary.

## Files

Source:

`scripts/utils/polygonV4CurrentTransactionParameterEvidence.js`

Source SHA-256:

`42be555156d4e856a6b68347e3f59dc2f9c49cb095ac35121b1ede7d74924170`

Test:

`test/polygonV4CurrentTransactionParameterEvidence.test.js`

Test SHA-256:

`e52ad9cecb867673895b1597ba0aa930016318330d0877e71b4bdd285267f4b1`

## Git lineage

1S.29 recovery checkpoint:

`9cc9a77a540847551e4a0f6e2fa9814f5ad9f5cd`

1S.30 implementation:

`befc3b6a3963cc94f12be2c2bf7acdbc22a4f81f`

Implementation subject:

`Add current transaction parameter evidence`

Implementation contains exactly the 1S.30 source and test files.

## Validation evidence

Focused 1S.30:

`32 / 32 PASS`

Affected 1S.27 -> 1S.30 regression set:

`95 / 95 PASS`

Canonical Node:

`693 / 693 PASS`

Canonical Hardhat:

`29 / 29 PASS`

Canonical environment:

- Node `v18.20.8`
- npm `10.8.2`
- `.nvmrc` `18.20.8`

Hardhat-generated `artifacts/` and `cache/` churn was restored after the
canonical Hardhat run. Source and test hashes remained unchanged.

Pre-commit ownership review:

- forbidden capability found: NO
- reconstruction found: NO
- gas-limit contamination: NO
- only expected provider calls present
- worktree scope contained exactly the 1S.30 source and test
- implementation commit scope contains exactly the 1S.30 source and test

## Authorization state

`LIVE_EXECUTION_AUTHORIZED=NO`

`SIGNER_AUTHORIZED=NO`

`TRANSACTION_AUTHORIZED=NO`

`BROADCAST_AUTHORIZED=NO`

Passing tests and this checkpoint do not authorize a live flashloan or any
transaction broadcast.

## Next architectural boundary

Gas-limit ownership remains intentionally deferred.

Any later gas-limit evidence boundary must be separately audited before
implementation and must not substitute:

- conservative policy gas `700000`, or
- historical measured gas `652106`

as a current transaction gas limit without its own current-state evidence.

Later transaction-envelope, final pre-send validation/simulation, signer,
signing, and broadcast boundaries remain separately gated.
