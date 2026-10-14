# Apollo Checkpoint — 1S.29 Unsigned Exact Transaction Intent Evidence

## Status

1S.29 implementation is complete and locally committed.

This milestone creates a deterministic, unsigned transaction-intent evidence boundary from the exact preserved 1S.28 account/caller identity evidence.

It does not authorize or perform live execution.

## Lineage

Branch:

`repair/simulation-safety`

1S.28 checkpoint/base commit:

`845fe54068421f84f28550ed99ae06449c8e35ce`

1S.29 implementation commit:

`41ec7236d9eebd3f6b5b5128699f79f93474c39d`

Implementation commit subject:

`Add unsigned exact transaction intent evidence`

## Implementation Files

Source:

`scripts/utils/polygonV4UnsignedExactTransactionIntentEvidence.js`

SHA-256:

`8f790832d1b73e2d434809ef7973dc5aca4aa60d92da72f047c994d0890f04c3`

Test:

`test/polygonV4UnsignedExactTransactionIntentEvidence.test.js`

SHA-256:

`fe69b100c8e5e3a6bbcf0edf5cda68f3d2504ac2e1ea23451239c32abcfe4f49`

## Boundary

1S.29 is the **Unsigned Exact Transaction Intent Evidence** boundary.

It consumes the exact preserved 1S.28 account/caller identity evidence and creates an unsigned intent representing the already-qualified ProfitBot flashloan call.

The intent binds:

- `from` = preserved caller address
- `to` = preserved executor address
- flashloan token = first preserved execution leg `tokenIn`
- flashloan amount = preserved candidate `amountIn`
- flashloan params = exact preserved execution plan bytes
- calldata = ABI encoding of `initiateFlashloan(token, amount, params)`
- `value` = zero

## Required Upstream State

The builder fails closed unless:

- 1S.28 `accountCallerIdentityReady === true`
- 1S.28 live execution authorization is exactly false
- 1S.28 signer authorization is exactly false
- 1S.28 broadcast authorization is exactly false
- nested 1S.27 `currentStatePreflightReady === true`
- nested 1S.27 live execution authorization is exactly false
- nested 1S.27 signer authorization is exactly false
- nested 1S.27 broadcast authorization is exactly false

## Exact Identity Preservation

1S.29 does not reconstruct candidate, execution legs, or execution plan.

It requires exact identity between the 1S.28 preserved evidence and its nested 1S.27 evidence for:

- candidate
- execution legs
- execution plan

It preserves those exact objects/bytes in its output.

The flashloan amount is the exact preserved `candidate.amountIn`.

The flashloan token is the exact first preserved execution-leg input token.

## Route Validation

The preserved execution route is validated without reconstruction.

It must:

- contain exactly three execution legs
- contain valid nonzero token addresses
- use distinct input/output tokens within each leg
- remain contiguous between adjacent legs
- close back to the initial flashloan token

## Account / Deployment Binding

1S.29 validates:

- caller address is valid and nonzero
- owner address is valid and nonzero
- caller and owner are the same normalized EVM address
- executor address is valid and nonzero
- nested current-state deployment evidence exists
- deployed executor address is valid and nonzero
- account executor and deployed executor are the same normalized EVM address

This preserves the account/deployment identity proven by 1S.28 and 1S.27.

## Output

Successful output includes:

- exact upstream 1S.28 evidence
- exact candidate
- exact execution legs
- exact execution plan
- flashloan token
- flashloan amount
- frozen unsigned transaction intent
- `unsignedTransactionIntentReady: true`
- `liveExecutionAuthorized: false`
- `signerAuthorized: false`
- `broadcastAuthorized: false`

The transaction intent contains only:

- `from`
- `to`
- `data`
- `value`

## Explicit Non-Ownership

1S.29 does not own or acquire:

- provider construction
- RPC execution
- current owner RPC calls
- candidate reconstruction
- route reconstruction
- execution-leg reconstruction
- execution-plan reconstruction
- gas-evidence acquisition
- policy acquisition
- qualification reruns
- current-state preflight reruns
- nonce
- gas price
- EIP-1559 fee fields
- gas limit
- signer
- wallet
- private key
- signature
- transaction hash
- receipt
- transaction sending
- receipt waiting
- broadcast

The existing simulation module contains broader reconstruction dependencies, so 1S.29 retains a narrow local ABI encoding surface rather than importing that broader ownership surface.

## Deferred Execution Fields

The following remain explicitly deferred to later separately reviewed boundaries:

- chain transaction fields beyond the current intent representation
- nonce
- fee fields
- gas limit
- signer acquisition
- signing
- sending
- receipt handling
- broadcast authorization

Passing 1S.29 does not authorize any of them.

## Validation Evidence

Focused 1S.29:

`21/21`

Affected regression set:

`81/81`

Canonical Node:

`661/661`

Canonical Hardhat:

`29/29`

Hardhat-generated artifact/cache churn was restored after canonical validation.

Final implementation worktree before commit was limited to the exact source and test.

Post-implementation-commit worktree was clean.

## Controlled Fork Decision

No new controlled-fork run is required for 1S.29.

Reason:

1S.29 is a deterministic representation/validation boundary. It performs no provider acquisition, RPC, fork reset, contract execution, signer acquisition, signing, sending, or broadcast.

Existing earlier controlled-fork evidence remains upstream evidence; 1S.29 does not recreate it.

## Authorization State

`LIVE_EXECUTION_AUTHORIZED=NO`

`SIGNER_AUTHORIZED=NO`

`TRANSACTION_AUTHORIZED=NO`

`BROADCAST_AUTHORIZED=NO`

## Next Step

After this checkpoint is committed and verified, remote closure may be considered separately.

Remote closure must use a normal non-force push only after:

- fresh remote fetch
- remote still equals the 1S.28 base commit
- exact local lineage contains only the 1S.29 implementation commit and 1S.29 checkpoint commit
- implementation and checkpoint contents/hashes are verified
- worktree is clean

No signer, transaction, or broadcast authorization is implied by repository push/closure.
