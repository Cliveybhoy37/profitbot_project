# Apollo Session Handoff — Post-1S.37

Date: 2026-10-06

## Durable Authority

Branch:

repair/simulation-safety

1S.37 implementation commit:

bab057bdfa955e3a867dfa6aeb42bf8db99b4566

Subject:

Add 1S.37 signing authorization evidence

This commit has been pushed and independently fetched/verified.

At handoff creation:

- local HEAD = bab057bdfa955e3a867dfa6aeb42bf8db99b4566
- origin/repair/simulation-safety = bab057bdfa955e3a867dfa6aeb42bf8db99b4566
- divergence = 0 0

## Completed Milestone

1S.37 — signing authorization evidence

Production:

scripts/utils/polygonV4SigningAuthorizationEvidence.js

SHA256:

0fa8912b91b2e8f1bb05490926a8d8f8b5a245cdfbddc97faa63ecd3e630b7cc

Test:

test/polygonV4SigningAuthorizationEvidence.test.js

SHA256:

feb87419f7f8d706808d9c3e1decdede4ff1cc70648ebdbfdd581e897c6b6557

Implementation checkpoint:

APOLLO_CHECKPOINT_1S37_SIGNING_AUTHORIZATION_EVIDENCE.md

SHA256:

356bd8e90419b359d635a3334e060c2ca6a9025b5567842254a99d36d7d5df5f

## 1S.37 Semantics

1S.37 consumes the exact 1S.36 signer-authorization evidence and a narrow
authorizeTransactionSigning decision capability.

Required upstream state:

- signerAuthorizationReady === true
- signerAuthorized === true
- liveExecutionAuthorized === false
- broadcastAuthorized === false

The signer identity remains bound to the exact transaction envelope:

normalized signerAddress === normalized transactionEnvelope.from

The authorization callback receives only:

- signerAddress
- transactionEnvelope

and must return exactly true.

Successful evidence establishes:

- signingAuthorizationReady: true
- signerAuthorized: true
- signingAuthorized: true
- liveExecutionAuthorized: false
- broadcastAuthorized: false

signingAuthorized === true means permission has been granted to sign the exact
already-bound transaction envelope with the already-authorized signer identity.

It does not mean a signer capability exists and does not mean a transaction
has been signed or may be broadcast.

## Validation Record

Focused hardened 1S.37:

14 / 14 PASS

Affected lineage regression:

1S.28 -> 1S.37
183 / 183 PASS

Canonical Node:

npm run test:node
803 / 803 PASS

Canonical Hardhat:

npm run test:hardhat
29 / 29 PASS

Canonical runtime:

- Node v18.20.8
- npm 10.8.2

Hardhat-generated tracked artifacts/cache churn was restored after validation.

The final 1S.37 staged-content audit passed:

- exact index hashes: PASS
- forbidden production ownership tokens: 0
- git diff --cached --check: PASS
- protected gas index exclusion: PASS

## Protected Gas Experiment Files

The following files remain deliberately untracked and protected:

test/polygonV4GasStateSensitivityProbe.test.js

SHA256:

5c2f95dcce48b1a2346a6ec8c29b61c372d6e2271fa79d9892aa23cb972df6d7

test/polygonV4PairedGasMeasurementIntegration.test.js

SHA256:

5b99cc2bf6ddb753960829a94f8928e91f765475187caed0dcf5b337b9e2f139

test/polygonV4PairedGasStateSensitivityIntegration.test.js

SHA256:

3155abbaef3d0438e85daf7b79c2f2e200649e3b994d01428e5d765d79190d77

Do not silently modify, stage, commit, delete, execute, or promote these files.

## Current Safety State

1S.37 did not:

- access a private key
- access environment credentials
- construct a wallet
- acquire a signer capability
- sign a transaction
- send a transaction
- perform broadcast
- execute a live flashloan

The protected V4 evidence pipeline remains non-broadcasting.

## Current Authorization Ownership

1S.35 owns:

- prospectiveSignerIdentityReady

1S.36 owns:

- signerAuthorizationReady
- signerAuthorized false -> true

1S.37 owns:

- signingAuthorizationReady
- introduction of signingAuthorized === true

Do not retrofit signingAuthorized:false into earlier milestones.

## Next Boundary

The next architectural milestone should be signer-capability binding.

Do not begin implementation by importing historical wallet/send scripts into
the protected V4 pipeline.

First perform a read-only architecture/ownership audit.

The audit should determine the narrowest capability interface needed to bind
a real signer capability to the already-authorized signerAddress while
preserving the exact 1S.37 transaction envelope.

The next boundary should prove signer capability identity.

It must not yet:

- sign the transaction
- send the transaction
- authorize broadcast
- execute the flashloan

Browser MetaMask / EIP-1193 and ethers Wallet are possible outer acquisition
mechanisms, but the protected pipeline should depend on a narrow injected
capability contract rather than environment/private-key ownership.

Any private-key or environment loading belongs at an outer bootstrap or
composition boundary.

Never place private-key material in checkpoints, tests, logs, or chat.

## Expected Future Progression

1S.37 signing authorization evidence
    ->
signer capability acquisition/binding
    ->
exact transaction signing
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
    ->
estimate / selected gas limit / actual gasUsed comparison

A successful live receipt supplies exact gasUsed for that transaction/state.
It must not be treated as a universal hardcoded gas requirement.

## Recovery Procedure

After a session reset or Codespace restart:

1. cd /workspaces/profitbot_project
2. source NVM if necessary
3. nvm use
4. verify node --version is v18.20.8
5. verify npm --version is 10.8.2
6. git status --short
7. git rev-parse HEAD
8. git rev-parse origin/repair/simulation-safety
9. git rev-list --left-right --count origin/repair/simulation-safety...HEAD
10. verify the three protected gas hashes
11. read this handoff before starting the next milestone

Do not run npm install/update merely because the Codespace restarted.

The repository .nvmrc remains runtime authority.

## Secret Handling

No private key, seed phrase, password, RPC secret, API secret, or other
credential is stored in this handoff.
