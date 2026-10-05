# Apollo Recovery Checkpoint — 1S.33 Current Transaction Envelope Evidence

Date: 2026-10-05
Branch: `repair/simulation-safety`

## Authority

1S.33 implementation commit:

`d925e648f7713ab44dd68b193194a38e9321f860`

Implementation parent / completed 1S.32 checkpoint:

`8eaed31df8a19c8b4a69226a3a4fc2f620109ab9`

Implementation commit subject:

`Add current transaction envelope evidence`

Remote `origin/repair/simulation-safety` remained at the completed
1S.32 checkpoint during 1S.33 development and implementation commit
creation. 1S.33 has not yet been pushed at this checkpoint-writing
stage.

## 1S.33 Boundary

1S.33 is **Current Transaction Envelope Evidence**.

It consumes the exact preserved 1S.32 current transaction gas-limit
selection evidence and deterministically composes the current
transaction envelope.

The exact envelope fields are:

- `from`
- `to`
- `data`
- `value`
- `chainId`
- `nonce`
- `maxFeePerGas`
- `maxPriorityFeePerGas`
- `gasLimit`

Field ownership remains upstream:

- `from`, `to`, `data`, and `value` come from the exact
  preserved 1S.29 transaction intent.
- `chainId`, `nonce`, `maxFeePerGas`, and
  `maxPriorityFeePerGas` come from the exact preserved 1S.30 current
  transaction parameter evidence.
- `gasLimit` is the exact 1S.32 `selectedGasLimit`, which must retain
  exact object identity with the 1S.31 `estimatedGasUnits`.

1S.33 does not own `gasPrice` or transaction `type`.

## Implementation Files

Source:

`scripts/utils/polygonV4CurrentTransactionEnvelopeEvidence.js`

SHA-256:

`a32bb40ed3e8156533cea1878c3dec69362bb181c67a2e5d5952179ba89df720`

Test:

`test/polygonV4CurrentTransactionEnvelopeEvidence.test.js`

SHA-256:

`3b735f63db225bebb57aa14b292e812c07bae2b9993624bfe5b6df836dee0588`

The implementation commit contains exactly these two files.

## Preserved Evidence / Invariants

1S.33 requires:

- 1S.32 `currentTransactionGasLimitSelectionReady === true`.
- 1S.31 `currentTransactionGasEstimationReady === true`.
- 1S.30 `currentTransactionParametersReady === true`.
- 1S.29 `unsignedTransactionIntentReady === true`.
- exact preserved 1S.31 / 1S.30 / 1S.29 object identities.
- exact transaction-intent identity across preserved layers.
- exact selected-gas-limit identity with the 1S.31 gas estimate.
- Polygon chain ID 137.
- a non-negative safe integer nonce.
- positive EIP-1559 fee evidence.
- `maxFeePerGas >= maxPriorityFeePerGas`.

All preserved authorization boundaries must remain explicitly false:

- `liveExecutionAuthorized === false`
- `signerAuthorized === false`
- `broadcastAuthorized === false`

The returned 1S.33 evidence sets:

- `currentTransactionEnvelopeReady === true`

and leaves all three authorization flags false.

## Explicit Non-Ownership

1S.33 does not:

- acquire a provider or RPC connection;
- reacquire nonce, fee, or gas evidence;
- reconstruct calldata;
- apply a gas margin, multiplier, or fixed buffer;
- substitute qualification-policy gas;
- substitute historical receipt gas;
- construct a signer or wallet;
- access a private key;
- sign a transaction;
- send a transaction;
- wait for a transaction receipt;
- broadcast a transaction;
- authorize live execution.

No executable production rule was introduced using:

- `700000`
- `652106`
- `827233`
- `12685`
- a 26.85% margin;
- an arbitrary gas multiplier or fixed gas buffer.

## Validation Evidence

Focused 1S.33 suite:

`18 / 18 PASS`

Affected 1S.27 through 1S.33 regression:

`156 / 156 PASS`

Canonical Node suite:

`754 / 754 PASS`

Canonical Hardhat suite:

`29 / 29 PASS`

The canonical Hardhat run regenerated tracked `artifacts/` and
`cache/` content. The generated churn was verified to be confined to
those directories and restored from HEAD. The 1S.33 source/test hashes
and all three experimental-test hashes remained unchanged after that
restore. Tests were not rerun after restoring generated output because
no production source or test source was changed by the restore.

The final 1S.33 pre-commit static/integrity audit passed.

## Actual Composition Evidence

The focused suite includes actual composition through the current
production helpers:

`1S.31 -> 1S.32 -> 1S.33`

The composition test verifies that actual 1S.31 gas-estimation evidence
and actual 1S.32 gas-limit-selection evidence feed 1S.33 while
preserving exact transaction/evidence identities.

The resulting envelope contains exactly the nine owned fields listed
above and does not add `gasPrice` or `type`.

The provider used by this composition test is a test double. This
evidence is not a live-network transaction or authorization.

## Experimental Tests Kept Separate

The following experimental controlled-fork tests remain untracked and
are not part of the 1S.33 implementation:

`test/polygonV4GasStateSensitivityProbe.test.js`

SHA-256:

`5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7`

`test/polygonV4PairedGasMeasurementIntegration.test.js`

SHA-256:

`5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139`

`test/polygonV4PairedGasStateSensitivityIntegration.test.js`

SHA-256:

`3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77`

They were not selected by the canonical Node suite and were not
committed with 1S.33.

## Safety State

During 1S.33 development and validation:

- no live RPC was intentionally used;
- no environment credential was accessed;
- no private key was accessed;
- no live signer was constructed;
- no transaction was executed;
- no flashloan was executed;
- no live execution was authorized;
- no broadcast was authorized.

Passing tests and completion of 1S.33 do **not** authorize a live
transaction.

## Next Boundary

Do not infer signer acquisition or live broadcast from completion of
1S.33.

Before any later live-capable send boundary, independently verify the
current chain/deployment identity, exact execution-plan binding,
freshness/deadline, balances/allowances, current transaction
parameters, gas evidence, and a final current-state
simulation/pre-send validation boundary.

Signer acquisition, signing, sending, and broadcast remain separately
gated and require explicit authorization.

## Durable Recovery State

At checkpoint creation:

- implementation commit: `d925e648f7713ab44dd68b193194a38e9321f860`
- implementation parent: `8eaed31df8a19c8b4a69226a3a4fc2f620109ab9`
- remote still expected at: `8eaed31df8a19c8b4a69226a3a4fc2f620109ab9`
- 1S.33 implementation committed locally;
- checkpoint not yet committed;
- 1S.33 not yet pushed;
- experimental controlled-fork tests remain untracked.

Recovery sequence:

1. verify branch `repair/simulation-safety`;
2. verify implementation commit `d925e648f7713ab44dd68b193194a38e9321f860`;
3. verify this checkpoint's parent relationship once committed;
4. verify the three experimental tests remain separate;
5. push only after checkpoint commit verification;
6. fetch and prove local/remote identity and divergence `0 0`.
