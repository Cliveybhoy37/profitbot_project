# APOLLO CHECKPOINT — 1S.38 Signer Capability Binding Evidence

Date: 2026-10-06
Branch: `repair/simulation-safety`

## Milestone

1S.38 introduces signer capability binding evidence.

This milestone proves that a narrowly supplied signer identity capability resolves
to the same public address already authorized by the preserved 1S.37 signing
authorization evidence and the exact preserved transaction envelope.

It does not sign, send, broadcast, execute, access private keys, construct a
wallet, acquire RPC state, or authorize live execution.

## Durable parent authority

Parent durable authority before this milestone:

`fa8155279b4cdaad0e1b29a732be7573bb50f00b`

Subject:

`Add post-1S.37 session handoff checkpoint`

The local branch and `origin/repair/simulation-safety` were both exactly at this
commit with divergence `0 0` throughout 1S.38 validation.

## Production artifact

File:

`scripts/utils/polygonV4SignerCapabilityBindingEvidence.js`

SHA256:

`dda5155424bb11db63f21a3a955f7d08c4a7df504782196bb71ca6ab7796edcf`

The production utility accepts:

- exact `signingAuthorizationEvidence` from 1S.37
- narrow injected `getSignerCapabilityAddress`

Required upstream state:

- `signingAuthorizationReady === true`
- `signerAuthorized === true`
- `signingAuthorized === true`
- `liveExecutionAuthorized === false`
- `broadcastAuthorized === false`

Before capability acquisition it requires the normalized preserved
`signerAddress` to equal normalized `transactionEnvelope.from`.

It then invokes `getSignerCapabilityAddress()` exactly as a narrow public
identity capability and normalizes the returned address.

The returned capability address must equal both the already-authorized signer
address and the preserved transaction-envelope `from` identity.

Successful output is frozen and contains:

- exact `signingAuthorizationEvidence` reference
- exact `transactionEnvelope` reference
- normalized `signerAddress`
- normalized `signerCapabilityAddress`
- `signerCapabilityBindingReady: true`
- `signerAuthorized: true`
- `signingAuthorized: true`
- `liveExecutionAuthorized: false`
- `broadcastAuthorized: false`

## Ownership boundary

1S.38 owns introduction of:

- `signerCapabilityBindingReady`
- `signerCapabilityAddress`

Pre-existing own properties for either field are rejected before capability
acquisition.

1S.38 does not own:

- private-key access
- environment-secret access
- wallet construction
- signer-object storage
- transaction signing
- signatures or signed raw transactions
- transaction sending
- broadcast authorization
- live execution authorization
- provider/RPC acquisition
- nonce or fee reacquisition
- gas estimation or gas-limit selection
- flashloan execution

`signerCapabilityBindingReady: true` means only that the independently acquired
public identity of the supplied signer capability has been proven equal to the
already-authorized signer identity for the exact preserved transaction envelope.

It does not mean the transaction has been signed, sent, broadcast, or executed.

## Authorization lineage

The protected authorization lineage is now:

1S.35:
`prospectiveSignerIdentityReady`

1S.36:
`signerAuthorizationReady`
`signerAuthorized: true`

1S.37:
`signingAuthorizationReady`
`signingAuthorized: true`

1S.38:
`signerCapabilityBindingReady`
`signerCapabilityAddress`

Actual transaction signing remains a later milestone.

## Test artifact

File:

`test/polygonV4SignerCapabilityBindingEvidence.test.js`

SHA256:

`6aea8f1d002fa4e791860aec2611ef9d541be853bd6ba3ec28807193e68438e2`

The hardened focused suite proves, among other properties:

- exact signer/envelope/capability identity binding
- capability mismatch rejection
- malformed capability-address rejection
- invalid upstream authorization rejection before capability acquisition
- upstream signer/envelope mismatch rejection before capability acquisition
- missing capability-function rejection
- upstream capability-binding contamination rejection before acquisition
- exact upstream and envelope reference preservation
- no signer capability object exposure
- malformed upstream evidence rejection before acquisition
- exact propagation of capability-address acquisition rejection
- capability invocation exactly once
- capability invocation with zero arguments
- equivalent address casing normalization
- static absence of key, wallet, signing, sending, RPC, execution and
  gas-selection ownership

## Validation evidence

Focused hardened 1S.38:

`13/13 PASS`

Affected protected lineage 1S.28 through 1S.38:

`196/196 PASS`

Canonical Node command:

`npm run test:node`

Result:

`816/816 PASS`

Canonical Hardhat command:

`npm run test:hardhat`

Result:

`29/29 PASS`

Hardhat compilation generated tracked `artifacts/` and `cache/` churn.
That generated churn was restored with:

`git restore --worktree -- artifacts cache`

Post-cleanup result:

- tracked diff count: `0`
- staged count: `0`
- only the two 1S.38 artifacts plus the three protected gas experiments were
  untracked before checkpoint creation

## Protected gas experiments

These remain deliberately local, untracked, and outside 1S.38 ownership.

`test/polygonV4GasStateSensitivityProbe.test.js`

SHA256:

`5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7`

`test/polygonV4PairedGasMeasurementIntegration.test.js`

SHA256:

`5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139`

`test/polygonV4PairedGasStateSensitivityIntegration.test.js`

SHA256:

`3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77`

They must not be staged, committed, modified, deleted, promoted, or executed as
part of 1S.38.

## Safety result

During 1S.38 implementation and validation:

- no private key was accessed
- no environment secret was accessed by the 1S.38 boundary
- no wallet was constructed
- no transaction was signed
- no transaction was sent
- no Polygon live flashloan was executed
- no broadcast authorization was introduced

## Exact next step

Stage exactly:

- `scripts/utils/polygonV4SignerCapabilityBindingEvidence.js`
- `test/polygonV4SignerCapabilityBindingEvidence.test.js`
- `APOLLO_CHECKPOINT_1S38_SIGNER_CAPABILITY_BINDING_EVIDENCE.md`

Audit the staged diff before committing.

Do not stage the three protected gas experiment files.

After staged audit, commit the 1S.38 implementation, push it, verify exact
local/remote equality, then create a separate post-1S.38 session handoff
checkpoint.
