# Apollo Checkpoint — 1S.35 Prospective Signer Identity Evidence

Date: 2026-10-06
Branch: repair/simulation-safety

## Milestone

1S.35 — Prospective Signer Identity Evidence

Status: COMPLETE / FROZEN SUBJECT TO COMMIT

## Objective

Bind a narrowly injected prospective signer-address capability to the exact
transaction-envelope `from` identity preserved through the protected execution
pipeline, without acquiring secrets or authorizing signing, sending, execution,
or broadcast.

## Input ownership

1S.35 consumes the exact validated 1S.34 current transaction pre-send
simulation evidence.

Identity chain:

1S.28 callerAddress
→ 1S.29 transactionIntent.from
→ 1S.33 transactionEnvelope.from
→ 1S.34 callRequest.from
→ 1S.35 prospective signerAddress

## 1S.35 behavior

Production utility:

`scripts/utils/polygonV4ProspectiveSignerIdentityEvidence.js`

It:

- requires ready 1S.34 pre-send simulation evidence;
- requires upstream liveExecutionAuthorized === false;
- requires upstream signerAuthorized === false;
- requires upstream broadcastAuthorized === false;
- preserves the exact upstream transaction envelope;
- accepts only an injected `getSignerAddress` capability;
- normalizes the prospective address using ethers v5 address validation;
- requires the prospective signer address to equal the frozen transaction
  envelope `from`;
- returns prospectiveSignerIdentityReady === true;
- keeps liveExecutionAuthorized === false;
- keeps signerAuthorized === false;
- keeps broadcastAuthorized === false.

It does NOT:

- read PRIVATE_KEY;
- read process.env;
- construct ethers.Wallet;
- construct a real signer;
- sign a transaction;
- send a transaction;
- broadcast a transaction;
- wait for a transaction receipt;
- initiate a flashloan;
- reconstruct the transaction;
- reacquire nonce or fees;
- estimate gas;
- select or alter gasLimit.

Matching prospective signer identity is NOT signer authorization.

## Focused validation

Focused hardening suite:

10 / 10 PASS

Coverage includes:

- module existence;
- successful exact signer/from binding;
- mismatch fail-closed behavior;
- upstream authorization-drift rejection;
- static ownership guard;
- missing acquisition-capability rejection;
- malformed prospective address rejection;
- acquisition-failure propagation;
- rejection of non-ready upstream evidence before address acquisition;
- rejection of malformed transaction envelope before address acquisition.

## Affected-chain validation

1S.28 through 1S.35:

157 / 157 PASS

## Canonical validation

Canonical Node:

777 / 777 PASS

Canonical Hardhat:

29 / 29 PASS

## Production hash

`scripts/utils/polygonV4ProspectiveSignerIdentityEvidence.js`

SHA-256:

40dd5e968c78bb6630f97e8b683bff32774f6c431599bda84f8121942330e182

## Protected gas experiments

The following files remain deliberately untracked and are NOT part of 1S.35:

`test/polygonV4GasStateSensitivityProbe.test.js`

SHA-256:

5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7

`test/polygonV4PairedGasMeasurementIntegration.test.js`

SHA-256:

5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139

`test/polygonV4PairedGasStateSensitivityIntegration.test.js`

SHA-256:

3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77

These files must not be silently modified, staged, committed, deleted, or
promoted.

## Gas ownership

1S.35 introduces no gas policy.

Current gas ownership remains:

1S.31 current exact estimate
→ 1S.32 exact selected gas limit
→ 1S.33 transaction envelope
→ 1S.34 pre-send simulation

Historical fork receipt gas and qualification-policy gas remain separate.

A future successful live Polygon receipt may provide exact `gasUsed` for that
specific mined transaction. It must not be treated as a universal hardcoded
gas requirement.

## Safety state

PRIVATE_KEY_ACCESSED=NO
REAL_SIGNER_CONSTRUCTED=NO
REAL_SIGNER_ADDRESS_REQUESTED=NO
TRANSACTION_SIGNED=NO
TRANSACTION_SENT=NO
FLASHLOAN_EXECUTED=NO
BROADCAST_AUTHORIZED=NO

1S.35 proves prospective public signer identity only.

## Next architectural boundary

Do not collapse identity, authorization, signing, and broadcast into one step.

Expected continuation:

1S.35 prospective signer identity
→ separate signer authorization boundary
→ separate signing authorization boundary
→ final immediately-before-send safety checks
→ explicit broadcast authorization
→ actual Polygon transaction
→ successful live receipt
→ separately validated live receipt evidence

The real ethers-v5 wallet/private key must not be introduced into 1S.35.
