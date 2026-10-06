# APOLLO SESSION HANDOFF — POST 1S.38

Date: 2026-10-06
Branch: `repair/simulation-safety`

## Current durable implementation authority

Commit:

`bb5bda955cda53dc02940a98e5a2c89fb75fc6e5`

Subject:

`Add 1S.38 signer capability binding evidence`

Parent:

`fa8155279b4cdaad0e1b29a732be7573bb50f00b`

The implementation commit was pushed to
`origin/repair/simulation-safety`, fetched, and verified with exact
local/remote equality and divergence `0 0`.

## 1S.38 milestone

1S.38 adds signer capability binding evidence.

Production:

`scripts/utils/polygonV4SignerCapabilityBindingEvidence.js`

SHA256:

`dda5155424bb11db63f21a3a955f7d08c4a7df504782196bb71ca6ab7796edcf`

Test:

`test/polygonV4SignerCapabilityBindingEvidence.test.js`

SHA256:

`6aea8f1d002fa4e791860aec2611ef9d541be853bd6ba3ec28807193e68438e2`

Milestone checkpoint:

`APOLLO_CHECKPOINT_1S38_SIGNER_CAPABILITY_BINDING_EVIDENCE.md`

SHA256:

`a2a8d31d97430c1ac7299b2d8d2ccb2261aaa2649fc3cce9c127671ebfb44bac`

## 1S.38 semantic boundary

Input:

- exact 1S.37 `signingAuthorizationEvidence`
- narrow injected `getSignerCapabilityAddress`

Required upstream authorization state:

- `signingAuthorizationReady === true`
- `signerAuthorized === true`
- `signingAuthorized === true`
- `liveExecutionAuthorized === false`
- `broadcastAuthorized === false`

The preserved signer identity must equal
`transactionEnvelope.from` before capability acquisition.

The independently acquired capability address must then normalize to the same
already-authorized signer identity.

Successful evidence introduces:

- `signerCapabilityAddress`
- `signerCapabilityBindingReady: true`

while preserving:

- `signerAuthorized: true`
- `signingAuthorized: true`
- `liveExecutionAuthorized: false`
- `broadcastAuthorized: false`

`signerCapabilityBindingReady: true` proves identity binding only.

It does not prove or authorize signing, sending, broadcasting, or execution.

## Validation completed

Focused hardened 1S.38:

`13/13 PASS`

Affected protected lineage 1S.28 through 1S.38:

`196/196 PASS`

Canonical Node:

`npm run test:node`

Result:

`816/816 PASS`

Canonical Hardhat:

`npm run test:hardhat`

Result:

`29/29 PASS`

Post-Hardhat generated `artifacts/` and `cache/` churn was restored only after
the test result and post-test hashes were captured.

Post-cleanup:

- tracked diff count `0`
- staging count `0`
- protected gas hashes exact

Staged-content audit:

`APOLLO_1S38_STAGED_CONTENT_AUDIT=PASS`

Implementation commit audit:

`APOLLO_1S38_IMPLEMENTATION_COMMIT=PASS`

Implementation push/fetch verification:

`APOLLO_1S38_IMPLEMENTATION_PUSH=PASS`

## Authorization lineage

1S.35:

`prospectiveSignerIdentityReady`

1S.36:

`signerAuthorizationReady`
`signerAuthorized`

1S.37:

`signingAuthorizationReady`
`signingAuthorized`

1S.38:

`signerCapabilityBindingReady`
`signerCapabilityAddress`

Actual signing remains deliberately outside the completed 1S.38 boundary.

## Protected gas experiments

The following files remain deliberately local and untracked:

`test/polygonV4GasStateSensitivityProbe.test.js`

SHA256:

`5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7`

`test/polygonV4PairedGasMeasurementIntegration.test.js`

SHA256:

`5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139`

`test/polygonV4PairedGasStateSensitivityIntegration.test.js`

SHA256:

`3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77`

Do not silently stage, commit, modify, delete, promote, or execute these files.

## Safety state

Through completion of 1S.38:

- no private key was exposed
- no private key was placed in a checkpoint
- no wallet was constructed by the 1S.38 boundary
- no transaction was signed
- no transaction was sent
- no broadcast authorization was granted
- no Polygon live flashloan was executed

The eventual outer bootstrap may own secret loading and construction of a real
signing capability, but evidence utilities must continue receiving only the
narrow capability required by their exact milestone.

## Current execution pipeline

Current-state preflight
→ caller/account identity
→ exact unsigned transaction intent
→ chain/nonce/EIP-1559
→ current gas estimate
→ exact selected gas limit
→ complete transaction envelope
→ provider.call pre-send simulation
→ prospective signer identity
→ signer authorization
→ signing authorization
→ signer capability binding
→ actual signing [not yet implemented]
→ final immediate safety
→ explicit broadcast authorization
→ actual Polygon transaction
→ live receipt/gasUsed

## Next architecture boundary

Do not jump directly to transaction sending or broadcasting.

The next signing-related milestone must first be architected against the exact
1S.38 boundary.

Any actual-signing milestone must preserve the exact authorized transaction
envelope and exact signer capability identity binding while keeping:

- `liveExecutionAuthorized === false`
- `broadcastAuthorized === false`

Signing must remain distinct from sending.

No arbitrary gas margin, multiplier, or fixed gas buffer should be introduced.

No protected gas experiment should be promoted without legitimate exact live
evidence.

## Recovery procedure

If chat context is lost:

1. inspect `git status --short`
2. inspect `git log --oneline -10`
3. verify local and `origin/repair/simulation-safety`
4. read this handoff
5. read `APOLLO_CHECKPOINT_1S38_SIGNER_CAPABILITY_BINDING_EVIDENCE.md`
6. verify the three protected gas experiment hashes
7. reconstruct the next architecture boundary before editing production code

Never place private keys, seed phrases, passwords, or API credentials in chat
or checkpoint files.
