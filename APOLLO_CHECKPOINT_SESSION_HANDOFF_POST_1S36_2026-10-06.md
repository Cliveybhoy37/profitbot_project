# APOLLO SESSION HANDOFF — POST 1S.36

Date: 2026-10-06
Branch: `repair/simulation-safety`

## Durable authority

1S.36 implementation commit:

`070c60218237b2396f80d6c42d52d45d4fe27f59`

Subject:

`Add 1S.36 signer authorization evidence`

Remote verification:

- local HEAD = `070c60218237b2396f80d6c42d52d45d4fe27f59`
- origin HEAD = `070c60218237b2396f80d6c42d52d45d4fe27f59`
- divergence = `0 0`
- remote commit file count = 3
- push verification = PASS

## Completed milestone

**1S.36 — Signer Authorization Evidence**

Production:

`scripts/utils/polygonV4SignerAuthorizationEvidence.js`

SHA-256:

`47da1f5b4de2476b67aee5a7bb6bd04c2764e8e2dc221e0827767fdbf2e2334b`

Test:

`test/polygonV4SignerAuthorizationEvidence.test.js`

SHA-256:

`9b36366b13993d4a0d518ec13e67de0bb095f9f99ae99c03ad0f41d14bc318aa`

1S.36 checkpoint SHA-256:

`8599432aefd60cc556fa1d3bd243cb456c8becc7d1a30e014d25494a6fa3b741`

## 1S.36 semantics

1S.36 consumes exact validated 1S.35 prospective signer identity evidence.

It validates that the prospective signer identity remains bound to the exact
transaction envelope and then requests an explicit injected authorization
decision.

The decision must return exactly boolean `true`.

Successful evidence intentionally transitions only:

`signerAuthorized: false -> true`

It preserves:

- `liveExecutionAuthorized: false`
- `broadcastAuthorized: false`

No `signingAuthorized` field is introduced by 1S.36.

Signer authorization does not mean that a wallet or signer exists and does
not authorize signing, sending, live execution, or broadcast.

## Validation completed

Focused hardened 1S.36 suite:

- 12/12 PASS

Affected protected 1S.28 through 1S.36 regression:

- 169/169 PASS

Canonical Node:

- 789/789 PASS

Canonical Hardhat:

- 29/29 PASS

Production ownership guard:

- PASS

Generated Hardhat artifact/cache churn was restored.

No non-generated tracked regression churn remained.

## Protected gas experiments

These three files remain deliberately untracked and protected:

- `test/polygonV4GasStateSensitivityProbe.test.js`
  SHA-256 `5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7`

- `test/polygonV4PairedGasMeasurementIntegration.test.js`
  SHA-256 `5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139`

- `test/polygonV4PairedGasStateSensitivityIntegration.test.js`
  SHA-256 `3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77`

Do not modify, stage, commit, delete, promote, or execute these files merely
as part of the next protected execution milestone.

## Current protected pipeline

1S.34 current transaction pre-send simulation
→ 1S.35 prospective signer identity evidence
→ 1S.36 signer authorization evidence
→ later signing authorization
→ final immediate safety checks
→ explicit broadcast authorization
→ actual Polygon transaction
→ successful mined receipt
→ validated live receipt evidence

## Next milestone direction

The next boundary is not yet implemented.

Architectural direction:

**separate signing authorization**

Begin with a read-only architecture and ownership audit.

The audit must determine:

- exact upstream evidence consumed
- exact meaning of signing authorization
- which authorization flag or evidence shape owns the transition
- whether authorization can remain separate from signer possession
- where wallet/signer construction belongs
- where private-key/environment access belongs
- which component may eventually sign
- how signing remains separate from sending and broadcast authorization

Do not infer that `signerAuthorized: true` permits signing.

Do not construct a wallet, read a private key, sign a transaction, send a
transaction, broadcast a transaction, or execute a live flashloan merely
because 1S.36 is complete.

## Recovery instructions

On a new or recovered session:

1. Verify branch `repair/simulation-safety`.
2. Run `git status --short`.
3. Run recent `git log --oneline`.
4. Verify HEAD/origin and divergence.
5. Verify the 1S.36 production and test hashes.
6. Verify all three protected gas hashes.
7. Confirm the gas files remain untracked.
8. Read the 1S.36 milestone checkpoint.
9. Read this post-1S.36 handoff.
10. Resume with the signing-authorization architecture audit.

Do not resume directly at wallet construction, signing, sending, broadcast,
or live execution.

## Expected clean recovery authority

Implementation authority:

`070c60218237b2396f80d6c42d52d45d4fe27f59`

Expected worktree before this handoff itself is committed:

- this handoff file untracked
- exactly three protected gas experiments untracked
- no staged files
- no other tracked or untracked churn
