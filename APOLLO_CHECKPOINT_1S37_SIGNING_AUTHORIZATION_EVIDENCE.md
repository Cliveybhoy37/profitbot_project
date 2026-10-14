# Apollo Checkpoint — 1S.37 Signing Authorization Evidence

Date: 2026-10-06

## Status

1S.37 signing authorization evidence is implemented and fully validated locally.

This milestone authorizes signing of the exact transaction envelope already
bound to the exact signer identity authorized by 1S.36.

It does not acquire a signer capability, access a private key, construct a
wallet, sign a transaction, send a transaction, authorize live execution, or
authorize broadcast.

## Durable Parent Authority

Parent commit:

62ac4214a44d1075c8164626eb3c692cd39c22a7

Branch:

repair/simulation-safety

At validation time:

- local HEAD = 62ac4214a44d1075c8164626eb3c692cd39c22a7
- origin/repair/simulation-safety = 62ac4214a44d1075c8164626eb3c692cd39c22a7
- divergence = 0 0

## 1S.37 Production File

scripts/utils/polygonV4SigningAuthorizationEvidence.js

SHA256:

0fa8912b91b2e8f1bb05490926a8d8f8b5a245cdfbddc97faa63ecd3e630b7cc

Primary exported boundary:

acquireSigningAuthorizationEvidence({
  signerAuthorizationEvidence,
  authorizeTransactionSigning
})

## 1S.37 Test File

test/polygonV4SigningAuthorizationEvidence.test.js

Final SHA256:

feb87419f7f8d706808d9c3e1decdede4ff1cc70648ebdbfdd581e897c6b6557

Final focused test count:

14

## Input Contract

1S.37 consumes:

- the exact 1S.36 signer authorization evidence
- a narrow injected authorizeTransactionSigning decision capability

Required upstream state:

- signerAuthorizationReady === true
- signerAuthorized === true
- liveExecutionAuthorized === false
- broadcastAuthorized === false

The upstream evidence must not already own:

- signingAuthorized
- signingAuthorizationReady

The signer identity must remain exactly bound to the transaction envelope:

normalized signerAddress === normalized transactionEnvelope.from

## Authorization Decision

The injected authorization capability receives only:

- signerAddress
- transactionEnvelope

Conceptually:

await authorizeTransactionSigning({
  signerAddress,
  transactionEnvelope
})

The result must be exactly true.

Values such as undefined, null, 1, "true", objects, and arrays are not
authorization.

## Output Contract

Successful 1S.37 evidence preserves:

- the exact 1S.36 signerAuthorizationEvidence reference
- the exact transactionEnvelope reference
- the normalized signerAddress

and establishes:

- signingAuthorizationReady: true
- signerAuthorized: true
- signingAuthorized: true
- liveExecutionAuthorized: false
- broadcastAuthorized: false

The returned evidence object is frozen.

## Meaning of signingAuthorized

signingAuthorized === true means:

Permission has been granted to sign this exact already-bound transaction
envelope with the already-authorized signer identity.

It does not mean:

- signer capability exists
- private key was accessed
- wallet was constructed
- transaction was signed
- signed transaction exists
- transaction may be sent
- live execution is authorized
- broadcast is authorized

## Ownership Progression

1S.35 owns:

- prospectiveSignerIdentityReady

1S.36 owns:

- signerAuthorizationReady
- signerAuthorized false -> true

1S.37 owns:

- signingAuthorizationReady
- introduction of signingAuthorized === true

Absence of signingAuthorized before 1S.37 remains canonical.

Do not retrofit signingAuthorized:false into earlier milestones.

## Production Ownership Exclusions

The 1S.37 production boundary contains no ownership of:

- PRIVATE_KEY
- process.env
- wallet construction
- signer acquisition
- provider/RPC acquisition
- signTransaction
- sendTransaction
- sendRawTransaction
- broadcastTransaction
- transaction receipt waiting
- initiateFlashloan
- gas estimation
- nonce acquisition
- fee acquisition
- transaction-envelope reconstruction

Signer capability acquisition/binding remains a later milestone.

Actual transaction signing remains a later milestone.

Broadcast authorization and actual broadcast remain separate later milestones.

## Validation

### Focused hardened 1S.37

14 / 14 PASS

Coverage includes:

- successful exact signing authorization
- explicit denial
- exact-true authorization requirement
- non-ready upstream rejection
- non-authorized upstream rejection
- upstream signingAuthorized contamination rejection
- upstream signingAuthorizationReady contamination rejection
- signer/envelope mismatch rejection
- missing authorization capability rejection
- malformed signer rejection
- malformed envelope-from rejection
- exact callback rejection propagation
- malformed signer-authorization evidence rejection
- exact upstream/envelope reference preservation
- restricted callback input
- production ownership safety guard

### Affected lineage regression

Exact lineage:

1S.28 -> 1S.37

Result:

183 / 183 PASS

### Canonical Node suite

Command:

npm run test:node

Runtime:

- Node v18.20.8
- npm 10.8.2

Result:

803 / 803 PASS

### Canonical Hardhat suite

Command:

npm run test:hardhat

Result:

29 / 29 PASS

Hardhat-generated tracked artifacts/cache churn was restored after the test.

Post-cleanup tracked diff:

empty

Post-cleanup staging:

empty

## Protected Gas Experiment Files

These files remain deliberately untracked and protected:

test/polygonV4GasStateSensitivityProbe.test.js

SHA256:

5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7

test/polygonV4PairedGasMeasurementIntegration.test.js

SHA256:

5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139

test/polygonV4PairedGasStateSensitivityIntegration.test.js

SHA256:

3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77

They were not modified, staged, committed, promoted, or executed as part of
1S.37 validation.

## Safety State

During 1S.37 implementation and validation:

- private key accessed: NO
- environment credentials accessed by 1S.37: NO
- wallet constructed by 1S.37: NO
- signer capability acquired by 1S.37: NO
- transaction signed: NO
- transaction sent: NO
- broadcast performed: NO
- live flashloan executed: NO

## Current Worktree Before 1S.37 Commit

Expected untracked implementation files:

- scripts/utils/polygonV4SigningAuthorizationEvidence.js
- test/polygonV4SigningAuthorizationEvidence.test.js
- APOLLO_CHECKPOINT_1S37_SIGNING_AUTHORIZATION_EVIDENCE.md

Expected protected untracked gas files:

- test/polygonV4GasStateSensitivityProbe.test.js
- test/polygonV4PairedGasMeasurementIntegration.test.js
- test/polygonV4PairedGasStateSensitivityIntegration.test.js

Only the three 1S.37 implementation/checkpoint files are eligible for the
1S.37 commit.

The three protected gas experiment files must remain untracked.

## Next Architectural Boundary

The next boundary must not collapse signing authorization into signing.

The expected progression remains:

1S.37 signing authorization evidence
    ->
later signer capability acquisition/binding
    ->
later exact transaction signing
    ->
final immediate safety checks
    ->
explicit broadcast authorization
    ->
actual Polygon broadcast
    ->
successful mined receipt
    ->
live receipt evidence

The signer-capability boundary should prove that the acquired signing
capability controls the already-authorized signerAddress without exposing
private-key material to protected evidence utilities.

Private-key/environment loading belongs only at an outer composition/bootstrap
boundary, never inside this evidence utility.

## Secret Handling

No private key, seed phrase, password, RPC secret, API secret, or credential is
stored in this checkpoint.
