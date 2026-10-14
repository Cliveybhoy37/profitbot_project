# APOLLO CHECKPOINT — 1S.36 Signer Authorization Evidence

Date: 2026-10-06
Branch: `repair/simulation-safety`

## Authority before commit

- HEAD: `4e02b13004bca93557d194b42866cab0086b7539`
- origin: `4e02b13004bca93557d194b42866cab0086b7539`
- divergence: `0 0`

## Milestone

**1S.36 — Signer Authorization Evidence**

1S.36 is the first protected V4 boundary that intentionally changes
`signerAuthorized` from `false` to `true`.

It consumes exact validated 1S.35 prospective signer identity evidence and
an injected `authorizeSignerIdentity` decision capability.

Required upstream state:

- `prospectiveSignerIdentityReady === true`
- `liveExecutionAuthorized === false`
- `signerAuthorized === false`
- `broadcastAuthorized === false`

Before authorization is requested:

- `signerAddress` must be valid
- `transactionEnvelope.from` must be valid
- their normalized addresses must match

`authorizeSignerIdentity` is called only after those checks pass.

Authorization succeeds only when its result is exactly boolean `true`.

## Successful evidence

Successful 1S.36 evidence preserves:

- exact 1S.35 evidence reference
- exact transaction-envelope reference
- normalized signer address

It sets:

- `signerAuthorizationReady: true`
- `signerAuthorized: true`
- `liveExecutionAuthorized: false`
- `broadcastAuthorized: false`

The returned evidence object is frozen.

## Meaning of signerAuthorized

`signerAuthorized: true` means only that the exact prospective signer
identity proven by 1S.35 has received explicit authorization to proceed
toward a later signing boundary.

It does NOT mean:

- a wallet exists
- a signer has been constructed
- a private key has been accessed
- signing is authorized
- live execution is authorized
- sending is authorized
- broadcast is authorized

1S.36 does not introduce `signingAuthorized`.

## Fail-closed ordering

1. Validate 1S.35 readiness.
2. Reject upstream authorization contamination.
3. Validate signer/envelope identity.
4. Request explicit signer-identity authorization.
5. Require exactly `true`.
6. Produce `signerAuthorized: true` evidence.

Malformed, non-ready, contaminated, or identity-divergent evidence is
rejected before the authorization callback runs.

## Files and hashes

Production:

`scripts/utils/polygonV4SignerAuthorizationEvidence.js`

SHA-256:

`47da1f5b4de2476b67aee5a7bb6bd04c2764e8e2dc221e0827767fdbf2e2334b`

Test:

`test/polygonV4SignerAuthorizationEvidence.test.js`

SHA-256:

`9b36366b13993d4a0d518ec13e67de0bb095f9f99ae99c03ad0f41d14bc318aa`

## Validation

Initial RED:

- 7 tests
- 1 pass
- 6 fail
- all six failures were expected module-not-found failures
- `RED_RC=1`
- expected RED PASS

Initial GREEN:

- 7/7 PASS

Hardened focused GREEN:

- 12/12 PASS

Affected protected 1S.28 through 1S.36 regression:

- 169/169 PASS

Canonical Node:

- 789/789 PASS

Canonical Hardhat:

- 29/29 PASS

Production ownership guard:

- PASS

Hardhat-generated `artifacts/` and `cache/` churn was classified as
generated-only and explicitly restored after testing.

No non-generated tracked churn remained.

## Safety and ownership

1S.36 owns no:

- private-key or environment access
- wallet or signer construction
- provider/RPC acquisition
- signing
- transaction sending
- broadcasting
- receipt waiting
- flashloan execution
- gas estimation
- nonce or fee acquisition
- gas-limit selection

Validation safety state:

- `ENV_ACCESSED=NO`
- `PRIVATE_KEY_ACCESSED=NO`
- `REAL_SIGNER_CONSTRUCTED=NO`
- `REAL_SIGNER_ADDRESS_REQUESTED=NO`
- `TRANSACTION_SIGNED=NO`
- `TRANSACTION_SENT=NO`
- `FLASHLOAN_EXECUTED=NO`
- `BROADCAST_AUTHORIZED=NO`

## Protected gas experiments

These remain deliberately untracked and outside 1S.36:

- `test/polygonV4GasStateSensitivityProbe.test.js`
  SHA-256 `5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7`

- `test/polygonV4PairedGasMeasurementIntegration.test.js`
  SHA-256 `5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139`

- `test/polygonV4PairedGasStateSensitivityIntegration.test.js`
  SHA-256 `3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77`

They were not modified, staged, committed, promoted, or executed as part
of 1S.36.

## Pipeline position

1S.34 pre-send simulation
→ 1S.35 prospective signer identity
→ 1S.36 signer authorization
→ later signing authorization
→ final immediate safety checks
→ explicit broadcast authorization
→ actual Polygon transaction
→ successful mined receipt
→ validated live receipt evidence

## Next boundary

The next architectural direction is a separate signing-authorization
boundary.

Before implementing it, audit exact ownership and capability shape.

Do not introduce private-key access, wallet construction, signing, sending,
broadcast, or live flashloan execution merely because 1S.36 is complete.

## Recovery

On session recovery:

1. Verify branch and git status.
2. Verify recent git log.
3. Verify the 1S.36 source/test hashes above.
4. Verify the three protected gas hashes.
5. Verify local/remote divergence.
6. Do not touch the protected gas experiments.
7. Resume with the post-1S.36 architecture audit, not live execution.
