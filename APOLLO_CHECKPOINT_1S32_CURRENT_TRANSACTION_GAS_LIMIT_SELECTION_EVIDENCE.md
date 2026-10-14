# APOLLO CHECKPOINT — 1S.32 Current Transaction Gas-Limit Selection Evidence

## Status

1S.32 implementation is complete and locally validated.

Implementation commit:

`858d17b8743e7f6307649ff78074ee05d6c3b1c0`

Subject:

`Add current transaction gas-limit selection evidence`

Parent / closed 1S.31 checkpoint:

`d3cec8a5b66c2ea6d60be1700538436d96f057b4`

Branch:

`repair/simulation-safety`

At checkpoint creation time the implementation commit has not yet been pushed.

## Objective

1S.32 introduces the Current Transaction Gas-Limit Selection Evidence boundary.

It consumes validated 1S.31 Current Transaction Gas Estimation Evidence and selects the exact current transaction-specific `estimatedGasUnits` as `selectedGasLimit`.

The boundary does not invent or apply an arbitrary percentage margin, fixed additive buffer, qualification-policy gas value, historical receipt gas value, or archived experimental gas constant.

## Files

Implementation:

`scripts/utils/polygonV4CurrentTransactionGasLimitSelectionEvidence.js`

SHA-256:

`3e3caf73d02148ada1c843d62cc5ca47ad179a72e70b0c03f5986426a2125534`

Authoritative test:

`test/polygonV4CurrentTransactionGasLimitSelectionEvidence.test.js`

SHA-256:

`57b8c45aafcf7874c0e991a13c9d94010db8bba97c62d8cef97284043fc6dd57`

## Selection rule

The selected gas limit is the exact positive ethers `BigNumber` supplied as `estimatedGasUnits` by validated 1S.31 evidence:

`selectedGasLimit = estimatedGasUnits`

The exact `BigNumber` object identity is preserved.

No numeric production gas constant is introduced by 1S.32.

## Upstream evidence contract

1S.32 requires:

- `currentTransactionGasEstimationReady === true`
- 1S.31 authorization flags remain false
- preserved 1S.30 Current Transaction Parameter Evidence
- authoritative 1S.30 readiness field `currentTransactionParametersReady === true`
- 1S.30 authorization flags remain false
- preserved 1S.29 Unsigned Exact Transaction Intent Evidence
- `unsignedTransactionIntentReady === true`
- 1S.29 authorization flags remain false
- exact parameter → unsigned evidence reference identity
- exact transaction-intent reference identity
- ready 1S.28 Account/Caller Identity Evidence
- 1S.28 authorization flags remain false
- ready nested 1S.27 Current-State Execution Preflight Evidence
- 1S.27 authorization flags remain false
- positive ethers `BigNumber` `estimatedGasUnits`

1S.31 remains the owner of the complete candidate / execution-legs / execution-plan / caller / executor / transaction-intent validation graph.

1S.32 preserves that validated graph and does not duplicate the complete 1S.31 validator.

## Actual 1S.31 → 1S.32 composition evidence

The authoritative 1S.32 test invokes the actual 1S.31 constructor:

`acquireCurrentTransactionGasEstimationEvidence`

using a provider double only.

The resulting actual 1S.31 evidence is passed directly into:

`selectCurrentTransactionGasLimitEvidence`

The test proves:

- the exact 1S.31 evidence object is preserved
- the exact 1S.30 evidence object is preserved
- the exact 1S.29 evidence object is preserved
- the exact transaction-intent object is preserved
- `selectedGasLimit` is the exact `estimatedGasUnits` object
- authorization remains false

No live provider or RPC is used by this composition test.

## Gas-domain separation

The following values remain distinct evidence domains and are not selected or substituted by 1S.32:

- `700000` — conservative qualification-policy gas
- `652106` — historical successful controlled-fork receipt gas for the protected V4 fixture
- `827233` — observed archived-state estimate in the experimental paired-gas work
- `12685` basis points — observed experimental estimate/receipt ratio

1S.32 does not encode any of those values as production policy.

It does not implement:

- `estimate × 1.10`
- `estimate × 1.20`
- `estimate × 1.2685`
- `estimate + 175127`
- `max(estimate, 700000)`
- any legacy hard-coded gas limit

## Validation evidence

Focused 1S.32:

`15/15` passing.

Affected 1S.27 → 1S.32 regression set:

`138/138` passing.

Canonical Node suite:

PASS.

Canonical Hardhat suite:

`29/29` passing.

`git diff --check`:

PASS.

Gas-policy contamination check:

PASS.

Forbidden execution-capability check:

PASS.

Final implementation scope review:

`APOLLO_1S32_FINAL_SCOPE_REVIEW=PASS`

Implementation commit verification:

`APOLLO_1S32_IMPLEMENTATION_COMMIT=PASS`

## Experimental evidence kept separate

These three experimental tests remain untracked and are not part of the 1S.32 implementation commit:

- `test/polygonV4GasStateSensitivityProbe.test.js`
- `test/polygonV4PairedGasMeasurementIntegration.test.js`
- `test/polygonV4PairedGasStateSensitivityIntegration.test.js`

They supported the gas-ownership investigation but are not silently promoted into production policy.

## Non-ownership / safety boundary

1S.32 does not own or authorize:

- RPC acquisition
- fresh `estimateGas`
- gas-margin policy
- transaction-envelope construction
- signer construction
- wallet/private-key access
- signing
- transaction sending
- receipt waiting
- broadcast
- live flashloan execution

No private key is accessed or stored by this boundary.

Passing 1S.32 tests does not authorize a live transaction.

## Next boundary

After 1S.32 is checkpointed and remotely closed, any live-route work must be treated as a separate go/no-go boundary.

Before any actual Polygon flashloan send, current evidence must separately establish at minimum:

- Polygon chain identity
- exact deployed contract/executor identity
- exact route and amount identity
- current economics and qualification
- current-state preflight
- caller/owner identity
- exact unsigned transaction intent
- current pending nonce
- current EIP-1559 fee evidence
- fresh transaction-specific gas estimate
- selected gas limit bound to that estimate
- balances and allowances
- freshness/deadline validity
- simulation/preflight result
- explicit signer authorization
- explicit transaction authorization
- explicit broadcast authorization

Signer/broadcast authorization remains separate from readiness evidence.

## Recovery state

Expected implementation lineage before checkpoint commit:

`d3cec8a5b66c2ea6d60be1700538436d96f057b4`
→
`858d17b8743e7f6307649ff78074ee05d6c3b1c0`

Expected worktree before checkpoint creation contains only the three untracked experimental gas tests plus this checkpoint file.

No force push is permitted for normal closure.
